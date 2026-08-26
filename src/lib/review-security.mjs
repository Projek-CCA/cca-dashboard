export const REVIEW_ADMIN_ROLES = new Set(['super_admin', 'admin', 'manager', 'project_manager', 'general_manager']);
export function canReview(role, assigned, ownsClient) {
  return REVIEW_ADMIN_ROLES.has(role) || (role === 'editor' && assigned) || (role === 'client' && ownsClient);
}
export function canReviewComment(role, visibility, assigned, ownsClient) {
  if (!canReview(role, assigned, ownsClient)) return false;
  if (REVIEW_ADMIN_ROLES.has(role)) return true;
  if (role === 'client') return visibility === 'client_visible';
  return visibility !== 'internal';
}
export function canApproveReview(role, ownsClient) {
  return REVIEW_ADMIN_ROLES.has(role) || (role === 'client' && ownsClient);
}
export function amendmentCountAfterDecision(current, decision) {
  if (decision !== 'amendments_requested') return current;
  if (current >= 3) throw new Error('Client amendment limit reached (3 of 3 used)');
  return current + 1;
}
