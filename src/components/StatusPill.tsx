import type { ContentStatus } from '@/lib/types';

const statusClass: Record<ContentStatus | string, string> = {
  Posted: 'green',
  'Ready to Post': 'green',
  Ready: 'green',
  'Pending Client Approval': 'blue',
  Review: 'blue',
  Shoot: 'orange',
  'Amendments Requested': 'red',
  Amend: 'red',
  'Pending Hook & Caption': 'orange',
  'Pending QC': 'purple',
  QC: 'purple',
  Editing: 'purple',
  Idea: 'purple',
  Caption: 'orange',
};

export function StatusPill({ label }: { label: ContentStatus | string }) {
  return <span className={`pill ${statusClass[label] ?? 'gray'}`}>{label}</span>;
}
