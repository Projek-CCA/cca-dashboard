// @ts-ignore — the same ESM module is executed directly by the Node test runner.
import { canTransition, clientAmendmentAllowed, deliveryBucket } from './workflow-core.mjs';

export type WorkflowState = 'Assigned'|'Editing'|'Submitted for Review'|'Amendment'|'Manager Approved'|'Client Review'|'Client Amendment'|'Approved for Posting'|'Done';
export type WorkflowRole = 'manager'|'project_manager'|'general_manager'|'admin'|'super_admin'|'qc'|'social_media_admin'|'editor'|'client';
export interface WorkflowComment { id:string; authorName:string; authorRole:string; body:string; visibility:string; createdAt:string }
export interface WorkflowEvent { id:string; eventType:string; actorName:string; actorRole:string; fromState?:string; toState?:string; metadata?:Record<string,unknown>; createdAt:string }
export interface WorkflowRecord { taskId:string; clientName:string; title:string; editorName:string; deadline:string|null; state:WorkflowState; outputVideoUrl:string; hook:string; caption:string; clientAmendmentTokensUsed:number; comments:WorkflowComment[]; events:WorkflowEvent[]; integrations:{integration:string;status:string;detail:string}[]; deliveryBucket:string|null; editorCompletedCount:number }
type Store = Record<string, WorkflowRecord>;
declare global { var ccaWorkflowStore: Store|undefined }
const id = (prefix:string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
function getStore():Store { if (!globalThis.ccaWorkflowStore) globalThis.ccaWorkflowStore = {}; return globalThis.ccaWorkflowStore; }
export function ensureWorkflow(task: {id:string;client_name?:string;content_title?:string;video_editor?:string;deadline?:string|null}): WorkflowRecord {
  const s=getStore();
  if (!s[task.id]) s[task.id]={taskId:task.id,clientName:task.client_name||'Unknown client',title:task.content_title||'Untitled content',editorName:task.video_editor||'',deadline:task.deadline||null,state:'Assigned',outputVideoUrl:'',hook:'',caption:'',clientAmendmentTokensUsed:0,comments:[],events:[],integrations:[],deliveryBucket:null,editorCompletedCount:0};
  const r=s[task.id]; r.clientName=task.client_name||r.clientName; r.title=task.content_title||r.title; r.editorName=task.video_editor||r.editorName; r.deadline=task.deadline||r.deadline; return r;
}
export function listWorkflows(tasks:Array<{id:string;client_name?:string;content_title?:string;video_editor?:string;deadline?:string|null}>){ return tasks.map(ensureWorkflow); }
export function getWorkflow(taskId:string){ return getStore()[taskId] || null; }
export function addComment(taskId:string, input:{body:string;authorName:string;authorRole:string;visibility?:string}) { const r=getWorkflow(taskId); if(!r) return null; r.comments.unshift({id:id('comment'),...input,visibility:input.visibility||'internal',createdAt:new Date().toISOString()}); return r; }
export function updateWorkflow(taskId:string,input:{role:WorkflowRole;actorName:string;action:string;state?:WorkflowState;outputVideoUrl?:string;editorName?:string;deadline?:string;hook?:string;caption?:string;body?:string;visibility?:string}) {
 const r=getWorkflow(taskId); if(!r) throw new Error('Task not found');
 if(input.outputVideoUrl!==undefined) r.outputVideoUrl=input.outputVideoUrl;
 if(input.editorName!==undefined) r.editorName=input.editorName;
 if(input.deadline!==undefined) r.deadline=input.deadline;
 if(input.hook!==undefined) r.hook=input.hook;
 if(input.caption!==undefined) r.caption=input.caption;
 if(input.body) addComment(taskId,{body:input.body,authorName:input.actorName,authorRole:input.role,visibility:input.visibility});
 if(input.action==='request_client_amendment' && !clientAmendmentAllowed(r.clientAmendmentTokensUsed)) throw new Error('Client amendment limit reached (3 of 3 used)');
 if(input.state && input.state!==r.state) {
   if(!canTransition(input.role,r.state,input.state)) throw new Error(`Role ${input.role} cannot transition ${r.state} to ${input.state}`);
   const from=r.state; r.state=input.state;
   if(input.state==='Client Amendment') r.clientAmendmentTokensUsed++;
   if(input.state==='Done') { r.editorCompletedCount++; r.deliveryBucket=deliveryBucket(r.deadline,new Date().toISOString()); }
   r.events.unshift({id:id('event'),eventType:'transition',actorName:input.actorName,actorRole:input.role,fromState:from,toState:input.state,createdAt:new Date().toISOString()});
 }
 if(input.action==='notify_client') r.integrations.unshift({integration:'email',status:process.env.EMAIL_PROVIDER?'pending':'unconfigured',detail:process.env.EMAIL_PROVIDER?'Provider adapter queued':'No email provider configured; notification recorded only'});
 if(input.action==='sync_posting') { r.integrations.unshift({integration:'notion',status:process.env.NOTION_API_KEY?'pending':'unconfigured',detail:'Video link, hook and caption sync adapter queued'}); r.integrations.unshift({integration:'calendar',status:process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64?'pending':'unconfigured',detail:'Calendar event sync adapter queued'}); }
 return r;
}
export function workflowMetrics(records:WorkflowRecord[]) { return { total:records.length, amendments:records.reduce((n,r)=>n+r.events.filter(e=>e.toState==='Amendment'||e.toState==='Client Amendment').length,0), editorCompleted:records.reduce((n,r)=>n+r.editorCompletedCount,0), early:records.filter(r=>r.deliveryBucket==='EARLY!').length, deadlineDay:records.filter(r=>r.deliveryBucket==='DEADLINE DAY').length, late:records.filter(r=>r.deliveryBucket==='LATE DELIVERY').length }; }
