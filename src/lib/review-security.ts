export const REVIEW_ADMIN_ROLES = new Set(['super_admin', 'admin', 'manager', 'project_manager', 'general_manager']);
export function canReview(role: string, assigned: boolean, ownsClient: boolean): boolean {
  return REVIEW_ADMIN_ROLES.has(role) || (role === 'editor' && assigned) || (role === 'client' && ownsClient);
}
export function canReviewComment(role: string, visibility: string, assigned: boolean, ownsClient: boolean): boolean {
  if (!canReview(role, assigned, ownsClient)) return false;
  if (REVIEW_ADMIN_ROLES.has(role)) return true;
  if (role === 'client') return visibility === 'client_visible';
  return visibility !== 'internal';
}
export function canApproveReview(role: string, ownsClient: boolean): boolean {
  return REVIEW_ADMIN_ROLES.has(role) || (role === 'client' && ownsClient);
}
export function amendmentCountAfterDecision(current: number, decision: string): number {
  if (decision !== 'amendments_requested') return current;
  if (current >= 3) throw new Error('Client amendment limit reached (3 of 3 used)');
  return current + 1;
}
