import { contentItems } from './mock-data';
import type { ActivityItem, Comment, ContentItem, ContentStatus, Visibility } from './types';

export type ReviewDecision = 'pending' | 'approved' | 'amendments_requested';

export interface ReviewRecord {
  item: ContentItem;
  comments: Comment[];
  activity: ActivityItem[];
  decision: ReviewDecision;
  status: ContentStatus;
}

type Store = Record<string, ReviewRecord>;

declare global {
  // eslint-disable-next-line no-var
  var ccaReviewStore: Store | undefined;
}

export function deriveStatus(decision: ReviewDecision, fallback: ContentStatus): ContentStatus {
  if (decision === 'approved') return 'Pending Hook & Caption';
  if (decision === 'amendments_requested') return 'Amendments Requested';
  return fallback;
}

function initialStore(): Store {
  return Object.fromEntries(contentItems.map((item) => [item.slug, {
    item,
    comments: [...item.comments],
    activity: [...item.activity],
    decision: 'pending' as ReviewDecision,
    status: item.status,
  }]));
}

function getStore() {
  if (!globalThis.ccaReviewStore) globalThis.ccaReviewStore = initialStore();
  return globalThis.ccaReviewStore;
}

function makeActivity(icon: string, text: string): ActivityItem {
  return { id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`, icon, text, time: 'Just now' };
}

export function getReview(slug: string) {
  return getStore()[slug];
}

export function addReviewComment(slug: string, input: { body: string; timestamp: string; visibility: Visibility }) {
  const record = getReview(slug);
  if (!record) return null;
  const comment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author: input.visibility === 'Client-visible' ? 'Munif Isa' : 'CCA Producer',
    role: input.visibility === 'Client-visible' ? 'Client' : 'Internal',
    initials: input.visibility === 'Client-visible' ? 'MI' : 'PM',
    timestamp: input.timestamp || '00:00',
    createdAt: 'Just now',
    body: input.body,
    visibility: input.visibility,
  };
  record.comments = [comment, ...record.comments];
  record.activity = [makeActivity('💬', `New ${input.visibility.toLowerCase()} comment added at ${comment.timestamp}`), ...record.activity];
  return record;
}

export function setReviewDecision(slug: string, decision: Exclude<ReviewDecision, 'pending'>) {
  const record = getReview(slug);
  if (!record) return null;
  record.decision = decision;
  record.status = deriveStatus(decision, record.item.status);
  record.activity = [
    decision === 'approved'
      ? makeActivity('✅', 'Client approved the video. Status moved to Pending Hook & Caption.')
      : makeActivity('🛠️', 'Client requested amendments. Status moved to Amendments Requested.'),
    ...record.activity,
  ];
  return record;
}
