/** @typedef {'Assigned'|'Editing'|'Submitted for Review'|'Amendment'|'Manager Approved'|'Client Review'|'Client Amendment'|'Approved for Posting'|'Done'} WorkflowState */
const manager = new Set(['manager','project_manager','general_manager','admin','super_admin','qc','social_media_admin']);
const transitions = {
  'Assigned': ['Editing'],
  'Editing': ['Submitted for Review'],
  'Submitted for Review': ['Amendment','Manager Approved'],
  'Amendment': ['Submitted for Review'],
  'Manager Approved': ['Client Review'],
  'Client Review': ['Client Amendment','Approved for Posting'],
  'Client Amendment': ['Submitted for Review','Client Review'],
  'Approved for Posting': ['Done'],
  'Done': [],
};
export function canTransition(role, from, to) {
  if (!transitions[from]?.includes(to)) return false;
  if (role === 'editor') return (from === 'Assigned' && to === 'Editing') || (from === 'Editing' && to === 'Submitted for Review') || (from === 'Amendment' && to === 'Submitted for Review') || (from === 'Client Amendment' && to === 'Submitted for Review');
  if (role === 'client') return from === 'Client Review' && (to === 'Client Amendment' || to === 'Approved for Posting');
  return manager.has(role);
}
export function clientAmendmentAllowed(used) { return used < 3; }
export function deliveryBucket(deadline, deliveredAt) {
  if (!deadline || !deliveredAt) return null;
  const d = new Date(deadline), v = new Date(deliveredAt);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  if (day(v) < day(d)) return 'EARLY!';
  if (day(v) > day(d)) return 'LATE DELIVERY';
  return 'DEADLINE DAY';
}
export function transitionOptions(state) { return transitions[state] || []; }
export const WORKFLOW_STATES = Object.keys(transitions);
