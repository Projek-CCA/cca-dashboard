import WorkflowBoard from '@/app/internal/workflow/WorkflowBoard';

/**
 * The review queue is the manager-facing view of the real workflow board.
 * It intentionally does not use the old mock-data queue.
 */
export default function InternalReviewQueuePage() {
  return <WorkflowBoard mode="manager" />;
}
