import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { addComment, ensureWorkflow, getWorkflow, listWorkflows, updateWorkflow, workflowMetrics, type WorkflowRole, type WorkflowState } from '@/lib/workflow-store';

const STAFF = ['manager','project_manager','general_manager','admin','super_admin','qc','social_media_admin'];
async function auth(request:NextRequest) {
 const sb=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll:()=>request.cookies.getAll(),setAll:()=>{}}});
 const {data:{user}}=await sb.auth.getUser(); if(!user) return null;
 let {data:profile}=await sb.from('profiles').select('name,role,client_id').eq('id',user.id).maybeSingle();
 if(!profile) { const x=await sb.from('profiles').select('name,role,client_id').eq('email',user.email).maybeSingle(); profile=x.data; }
 return profile?.role ? {user,profile,sb} : null;
}
async function taskRows(sb:any) { const q=await sb.from('project_tasks').select('id,client_name,content_title,video_editor,deadline,status,content_ref').order('deadline',{ascending:true}).limit(1000); return q.data||[]; }
export async function GET(request:NextRequest) {
 const a=await auth(request); if(!a) return NextResponse.json({error:'Unauthorized'},{status:403});
 const rows=await taskRows(a.sb); const records=listWorkflows(rows);
 const role=a.profile.role as string; const visible=role==='client'?records.filter(r=>r.clientName===a.profile.client_id||r.state==='Client Review'||r.state==='Client Amendment'):role==='editor'?records.filter(r=>r.editorName.toLowerCase()===(a.profile.name||'').toLowerCase()):records;
 return NextResponse.json({ok:true,records:visible,metrics:workflowMetrics(records),migration:'created-not-applied'});
}
export async function POST(request:NextRequest) {
 const a=await auth(request); if(!a) return NextResponse.json({error:'Unauthorized'},{status:403});
 const body=await request.json().catch(()=>null) as any; if(!body?.taskId) return NextResponse.json({error:'taskId is required'},{status:400});
 const rows=await taskRows(a.sb); const row=rows.find((x:any)=>x.id===body.taskId); if(row) ensureWorkflow(row); const r=getWorkflow(body.taskId); if(!r) return NextResponse.json({error:'Task not found'},{status:404});
 const role=a.profile.role as WorkflowRole; const actorName=a.profile.name||a.user.email;
 try {
   if(body.action==='assign') { if(!STAFF.includes(role)) throw new Error('Managers only'); const update:any={video_editor:body.editorName,deadline:body.deadline,updated_at:new Date().toISOString()}; const {error}=await a.sb.from('project_tasks').update(update).eq('id',body.taskId); if(error) console.warn('project_tasks assignment mirror unavailable',error.message); }
   const result=updateWorkflow(body.taskId,{...body,role,actorName,state:body.state as WorkflowState|undefined});
   return NextResponse.json({ok:true,record:result,metrics:workflowMetrics([result])});
 } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:'Workflow action failed'},{status:403}); }
}
