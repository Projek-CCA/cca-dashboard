import { canTransition, clientAmendmentAllowed, deliveryBucket } from './workflow-core';

export type WorkflowState = 'Assigned'|'Editing'|'Submitted for Review'|'Amendment'|'Manager Approved'|'Client Review'|'Client Amendment'|'Approved for Posting'|'Done';
export type WorkflowRole = 'manager'|'project_manager'|'general_manager'|'admin'|'super_admin'|'qc'|'social_media_admin'|'editor'|'client';
export interface WorkflowComment { id:string; authorName:string; authorRole:string; body:string; visibility:string; createdAt:string }
export interface WorkflowEvent { id:string; eventType:string; actorName:string; actorRole:string; fromState?:string; toState?:string; metadata?:Record<string,unknown>; createdAt:string }
export interface WorkflowRecord { taskId:string; clientName:string; title:string; editorName:string; deadline:string|null; state:WorkflowState; outputVideoUrl:string; hook:string; caption:string; clientAmendmentTokensUsed:number; comments:WorkflowComment[]; events:WorkflowEvent[]; integrations:{integration:string;status:string;detail:string}[]; deliveryBucket:string|null; editorCompletedCount:number }

type WorkflowTask = {id:string;client_name?:string;content_title?:string;video_editor?:string;deadline?:string|null};
const id = () => crypto.randomUUID();

/** Build a request-scoped record. Durable records must be loaded/saved by the API persistence layer. */
export function workflowFromTask(task: WorkflowTask, persisted?: Partial<WorkflowRecord>): WorkflowRecord {
  return {
    taskId: task.id,
    state: 'Assigned', outputVideoUrl: '', hook: '', caption: '',
    clientAmendmentTokensUsed: 0, comments: [], events: [], integrations: [],
    deliveryBucket: null, editorCompletedCount: 0,
    ...persisted,
    // Task ownership/metadata is authoritative from project_tasks on every request.
    clientName: task.client_name || persisted?.clientName || 'Unknown client',
    title: task.content_title || persisted?.title || 'Untitled content',
    editorName: task.video_editor || persisted?.editorName || '',
    deadline: task.deadline || persisted?.deadline || null,
  };
}

export function addCommentToRecord(record: WorkflowRecord, input:{body:string;authorName:string;authorRole:string;visibility?:string}) {
  record.comments.unshift({id:id(), ...input, visibility:input.visibility || 'internal', createdAt:new Date().toISOString()});
  return record;
}

export function applyWorkflowUpdate(record: WorkflowRecord, input:{role:WorkflowRole;actorName:string;action:string;state?:WorkflowState;outputVideoUrl?:string;editorName?:string;deadline?:string;hook?:string;caption?:string;body?:string;visibility?:string}) {
  if (input.outputVideoUrl !== undefined) record.outputVideoUrl = input.outputVideoUrl;
  if (input.editorName !== undefined) record.editorName = input.editorName;
  if (input.deadline !== undefined) record.deadline = input.deadline;
  if (input.hook !== undefined) record.hook = input.hook;
  if (input.caption !== undefined) record.caption = input.caption;
  if (input.body) addCommentToRecord(record, {body:input.body, authorName:input.actorName, authorRole:input.role, visibility:input.visibility});
  if (input.action === 'request_client_amendment' && !clientAmendmentAllowed(record.clientAmendmentTokensUsed)) throw new Error('Client amendment limit reached (3 of 3 used)');
  if (input.action === 'notify_client') record.integrations.unshift({integration:'email', status:process.env.EMAIL_PROVIDER ? 'pending' : 'unconfigured', detail:process.env.EMAIL_PROVIDER ? 'Provider adapter queued' : 'No email provider configured; notification recorded only'});
  if (input.action === 'sync_posting') {
    record.integrations.unshift({integration:'notion', status:process.env.NOTION_API_KEY ? 'pending' : 'unconfigured', detail:'Video link, hook and caption sync adapter queued'});
    record.integrations.unshift({integration:'calendar', status:process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64 ? 'pending' : 'unconfigured', detail:'Calendar event sync adapter queued'});
  }
  if (input.state && input.state !== record.state) {
    if (!canTransition(input.role, record.state, input.state)) throw new Error(`Role ${input.role} cannot transition ${record.state} to ${input.state}`);
    const from = record.state; record.state = input.state;
    if (input.state === 'Client Amendment') record.clientAmendmentTokensUsed++;
    if (input.state === 'Done') { record.editorCompletedCount++; record.deliveryBucket = deliveryBucket(record.deadline, new Date().toISOString()); }
    record.events.unshift({id:id(), eventType:'transition', actorName:input.actorName, actorRole:input.role, fromState:from, toState:input.state, createdAt:new Date().toISOString()});
  }
  return record;
}

export function workflowMetrics(records:WorkflowRecord[]) { return { total:records.length, amendments:records.reduce((n,r)=>n+r.events.filter(e=>e.toState==='Amendment'||e.toState==='Client Amendment').length,0), editorCompleted:records.reduce((n,r)=>n+r.editorCompletedCount,0), early:records.filter(r=>r.deliveryBucket==='EARLY!').length, deadlineDay:records.filter(r=>r.deliveryBucket==='DEADLINE DAY').length, late:records.filter(r=>r.deliveryBucket==='LATE DELIVERY').length }; }
