import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { clientWorkflowVisible } from '@/lib/workflow-core';
import { applyWorkflowUpdate, workflowFromTask, workflowMetrics, type WorkflowRecord, type WorkflowRole, type WorkflowState } from '@/lib/workflow-store';

const STAFF = ['manager','project_manager','general_manager','admin','super_admin','qc','social_media_admin'];
const CLIENT_VISIBLE_STATES: WorkflowState[] = ['Client Review', 'Client Amendment', 'Approved for Posting'];

type Supabase = any;
type TaskRow = {id:string;client_name?:string;content_title?:string;video_editor?:string;deadline?:string|null;status?:string;content_ref?:string};

async function auth(request:NextRequest) {
  const sb=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>request.cookies.getAll(),setAll:()=>{}}});
  const {data:{user}}=await sb.auth.getUser(); if(!user) return null;
  let {data:profile}=await sb.from('profiles').select('name,role,client_id').eq('id',user.id).maybeSingle();
  if(!profile) { const x=await sb.from('profiles').select('name,role,client_id').eq('email',user.email).maybeSingle(); profile=x.data; }
  if(!profile?.role) return null;
  let clientName:string|undefined;
  if(profile.role === 'client') {
    if(!profile.client_id) return null;
    const client = await sb.from('clients').select('name').eq('id',profile.client_id).maybeSingle();
    if(client.error || !client.data?.name) return null;
    clientName = client.data.name;
  }
  return {user,profile,sb,clientName};
}

async function taskRows(sb:Supabase):Promise<{data:TaskRow[];error?:any}> {
  const q=await sb.from('project_tasks').select('id,client_name,content_title,video_editor,deadline,status,content_ref').order('deadline',{ascending:true}).limit(1000);
  return {data:q.data||[],error:q.error};
}

function migrationUnavailable(error:any) {
  const message=String(error?.message||'');
  return error && (error.code==='42P01' || error.code==='PGRST205' || /workflow_(items|comments|events)|integration_events/i.test(message));
}
function unavailableResponse(detail='Workflow persistence migration is not applied') {
  return NextResponse.json({ok:false,error:'Workflow persistence unavailable',migration:'not-applied',persistence:'unavailable',detail},{status:503});
}

async function loadRecords(sb:Supabase, rows:TaskRow[]) {
  // Do not send hundreds of task IDs through Supabase REST `.in(...)`: the
  // resulting URL eventually exceeds the gateway limit (400 Bad Request).
  // The task list is already bounded by project_tasks, so load workflow rows
  // and restrict them to those task IDs in memory.
  const taskIds = new Set(rows.map(r => r.id));
  const [items, comments, events, integrations] = await Promise.all([
    sb.from('workflow_items').select('*'),
    sb.from('workflow_comments').select('*').order('created_at',{ascending:false}),
    sb.from('workflow_events').select('*').order('created_at',{ascending:false}),
    sb.from('integration_events').select('*').order('created_at',{ascending:false}),
  ]);
  if(items.error) throw items.error;
  if(comments.error) throw comments.error; if(events.error) throw events.error; if(integrations.error) throw integrations.error;
  const byTask=new Map<string, any>(items.data.map((x:any)=>[x.task_id,x]));
  return rows.map(task=>{
    const x=byTask.get(task.id);
    return workflowFromTask(task,x ? {state:x.state,editorName:x.editor_name,deadline:x.deadline_at,outputVideoUrl:x.output_video_url||'',hook:x.hook||'',caption:x.caption||'',clientAmendmentTokensUsed:x.client_amendment_tokens_used||0,editorCompletedCount:x.editor_completed_count||0,deliveryBucket:x.delivery_bucket,comments:(comments.data||[]).filter((c:any)=>c.task_id===task.id).map((c:any)=>({id:c.id,authorName:c.author_name,authorRole:c.author_role,body:c.body,visibility:c.visibility,createdAt:c.created_at})),events:(events.data||[]).filter((e:any)=>e.task_id===task.id).map((e:any)=>({id:e.id,eventType:e.event_type,actorName:e.actor_name,actorRole:e.actor_role,fromState:e.from_state,toState:e.to_state,metadata:e.metadata,createdAt:e.created_at})),integrations:(integrations.data||[]).filter((e:any)=>e.task_id===task.id).map((e:any)=>({integration:e.integration,status:e.status,detail:e.detail||''}))} : undefined);
  });
}

async function saveRecord(sb:Supabase, record:WorkflowRecord, before:WorkflowRecord) {
  const {error}=await sb.from('workflow_items').upsert({task_id:record.taskId,state:record.state,editor_name:record.editorName||null,deadline_at:record.deadline,output_video_url:record.outputVideoUrl||null,hook:record.hook||null,caption:record.caption||null,client_amendment_tokens_used:record.clientAmendmentTokensUsed,editor_completed_count:record.editorCompletedCount,delivery_bucket:record.deliveryBucket,updated_at:new Date().toISOString()},{onConflict:'task_id'});
  if(error) throw error;
  const newComments=record.comments.filter(x=>!before.comments.some(y=>y.id===x.id));
  const newEvents=record.events.filter(x=>!before.events.some(y=>y.id===x.id));
  const newIntegrations=record.integrations.filter((x,i)=>i < record.integrations.length-before.integrations.length);
  if(newComments.length) { const q=await sb.from('workflow_comments').insert(newComments.map(x=>({id:x.id,task_id:record.taskId,author_name:x.authorName,author_role:x.authorRole,body:x.body,visibility:x.visibility,created_at:x.createdAt}))); if(q.error) throw q.error; }
  if(newEvents.length) { const q=await sb.from('workflow_events').insert(newEvents.map(x=>({id:x.id,task_id:record.taskId,actor_name:x.actorName,actor_role:x.actorRole,event_type:x.eventType,from_state:x.fromState,to_state:x.toState,metadata:x.metadata||{},created_at:x.createdAt}))); if(q.error) throw q.error; }
  if(newIntegrations.length) { const q=await sb.from('integration_events').insert(newIntegrations.map(x=>({task_id:record.taskId,integration:x.integration,status:x.status,detail:x.detail,created_at:new Date().toISOString()}))); if(q.error) throw q.error; }
}

function visibleRecords(records:WorkflowRecord[], role:string, name:string, clientName?:string) {
  if(role==='client') return records.filter(r=>clientWorkflowVisible(clientName,r.clientName,r.state));
  if(role==='editor') return records.filter(r=>r.editorName.toLowerCase()===name.toLowerCase());
  return records;
}

export async function GET(request:NextRequest) {
  const a=await auth(request); if(!a) return NextResponse.json({error:'Unauthorized'},{status:403});
  const rows=await taskRows(a.sb); if(rows.error) return unavailableResponse('Unable to load project tasks');
  try {
    const records=await loadRecords(a.sb,rows.data);
    const visible=visibleRecords(records,a.profile.role,a.profile.name||'',a.clientName);
    return NextResponse.json({ok:true,records:visible,metrics:workflowMetrics(visible),migration:'applied',persistence:'supabase'});
  } catch(e:any) { return migrationUnavailable(e) ? unavailableResponse() : unavailableResponse(e?.message||'Supabase workflow tables could not be read'); }
}

export async function POST(request:NextRequest) {
  const a=await auth(request); if(!a) return NextResponse.json({error:'Unauthorized'},{status:403});
  const body=await request.json().catch(()=>null) as any; if(!body?.taskId) return NextResponse.json({error:'taskId is required'},{status:400});
  const rows=await taskRows(a.sb); if(rows.error) return unavailableResponse('Unable to load project tasks');
  const row=rows.data.find(x=>x.id===body.taskId); if(!row) return NextResponse.json({error:'Task not found'},{status:404});
  try {
    const records=await loadRecords(a.sb,[row]); const current=records[0];
    const role=a.profile.role as WorkflowRole;
    if(role==='client' && !clientWorkflowVisible(a.clientName,current.clientName,current.state)) return NextResponse.json({error:'This workflow is not available to this client'},{status:403});
    if(role==='editor' && current.editorName.toLowerCase()!==(a.profile.name||'').toLowerCase()) return NextResponse.json({error:'This workflow is not assigned to this editor'},{status:403});
    if(body.action==='assign') { if(!STAFF.includes(role)) throw new Error('Managers only'); const update:any={video_editor:body.editorName,deadline:body.deadline,updated_at:new Date().toISOString()}; const q=await a.sb.from('project_tasks').update(update).eq('id',body.taskId); if(q.error) throw q.error; }
    const before=structuredClone(current); const result=applyWorkflowUpdate(current,{...body,role,actorName:a.profile.name||a.user.email,state:body.state as WorkflowState|undefined});
    await saveRecord(a.sb,result,before);
    return NextResponse.json({ok:true,record:result,metrics:workflowMetrics([result]),migration:'applied',persistence:'supabase'});
  } catch(e:any) { if(migrationUnavailable(e)) return unavailableResponse(); return NextResponse.json({error:e instanceof Error?e.message:'Workflow action failed'},{status:403}); }
}
