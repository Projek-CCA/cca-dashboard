import type { AlertItem, CalendarDay, Client, ContentItem, QueueTask, ActivityItem } from './types';

export const clients: Client[] = [
  { id: 'munif', name: 'Munif Isa', company: 'Sixma', hubName: 'Munif Isa Hub' },
  { id: 'ucmi', name: 'UCMI', company: 'UCMI', hubName: 'UCMI Hub' },
];

const approvalTrail: ActivityItem[] = [
  { id: 'a1', icon: '✓', text: 'CCA QC approved the edit', time: 'Today, 10:18 AM' },
  { id: 'a2', icon: '💬', text: 'Client left 2 timestamp comments', time: 'Today, 10:34 AM' },
  { id: 'a3', icon: '⏳', text: 'Waiting for final client approval', time: 'Due Jan 10, 6:00 PM' },
];

export const contentItems: ContentItem[] = [
  {
    id: 'content-scaling-mistakes',
    slug: 'content-scaling-mistakes',
    title: '3 mistakes business owners make before scaling',
    clientId: 'munif',
    category: 'Educational Content',
    postDate: '2026-01-12',
    duration: '01:48',
    status: 'Pending Client Approval',
    tags: ['Review', 'Caption'],
    editor: 'Hidden from client view',
    brief: 'A short educational video explaining the common mistakes business owners make before scaling their team and operations.',
    hook: 'Pending',
    caption: 'Draft needed after client approval.',
    comments: [
      {
        id: 'c1',
        author: 'Munif Isa',
        role: 'Client',
        initials: 'MI',
        timestamp: '00:18',
        createdAt: '8 min ago',
        body: 'Can we make the opening line more direct? Maybe start with the mistake first before introducing the context.',
        visibility: 'Client-visible',
      },
      {
        id: 'c2',
        author: 'CCA QC',
        role: 'Internal',
        initials: 'QC',
        timestamp: '00:41',
        createdAt: '22 min ago',
        body: 'Cut feels good. Need to prepare stronger hook and caption before moving this to Ready to Post.',
        visibility: 'CCA internal only',
      },
      {
        id: 'c3',
        author: 'Munif Isa',
        role: 'Client',
        initials: 'MI',
        timestamp: '01:12',
        createdAt: '31 min ago',
        body: 'This part is good. Keep this example, it explains the point clearly.',
        visibility: 'Client-visible',
      },
    ],
    activity: approvalTrail,
  },
  { id: 'new-year-clarity', slug: 'new-year-clarity', title: 'New year business clarity post', clientId: 'munif', category: 'Thought Leadership', postDate: '2026-01-01', status: 'Posted', tags: ['Posted'], brief: 'New year clarity reminder.', comments: [], activity: [] },
  { id: 'founder-focus', slug: 'founder-focus', title: 'Founder lesson: focus before scale', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-03', status: 'Posted', tags: ['Posted'], brief: 'Founder lesson.', comments: [], activity: [] },
  { id: 'teams-momentum', slug: 'teams-momentum', title: 'Why most teams lose momentum', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-05', status: 'Pending Client Approval', tags: ['Review'], brief: 'Momentum lesson.', comments: [], activity: [] },
  { id: 'office-broll', slug: 'office-broll', title: 'Content shoot: office B-roll', clientId: 'munif', category: 'Shoot', postDate: '2026-01-06', status: 'Shoot', tags: ['Shoot'], brief: 'Office B-roll capture.', comments: [], activity: [] },
  { id: 'sales-process', slug: 'sales-process', title: 'Sales process mini lesson', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-08', status: 'Editing', tags: ['Editing'], brief: 'Sales process lesson.', comments: [], activity: [] },
  { id: 'simple-sop-win', slug: 'simple-sop-win', title: 'Client story: simple SOP win', clientId: 'munif', category: 'Case Study', postDate: '2026-01-09', status: 'Pending Client Approval', tags: ['Review'], brief: 'Client story.', comments: [], activity: [] },
  { id: 'morning-reminder', slug: 'morning-reminder', title: 'Morning reminder reel', clientId: 'munif', category: 'Reel', postDate: '2026-01-11', status: 'Ready to Post', tags: ['Ready'], brief: 'Morning reminder.', comments: [], activity: [] },
  { id: 'hiring-clarity', slug: 'hiring-clarity', title: 'Hiring without clarity', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-14', status: 'Amendments Requested', tags: ['Amend'], brief: 'Hiring lesson.', comments: [], activity: [] },
  { id: 'weekly-carousel', slug: 'weekly-carousel', title: 'Weekly educational carousel', clientId: 'munif', category: 'Carousel', postDate: '2026-01-15', status: 'Ready to Post', tags: ['Ready'], brief: 'Weekly carousel.', comments: [], activity: [] },
  { id: 'leadership-myth', slug: 'leadership-myth', title: 'Leadership myth short', clientId: 'munif', category: 'Short', postDate: '2026-01-16', status: 'Pending QC', tags: ['QC'], duration: '1:18', brief: 'Leadership myth short.', comments: [], activity: [] },
  { id: 'weekend-trust', slug: 'weekend-trust', title: 'Weekend trust builder', clientId: 'munif', category: 'Reel', postDate: '2026-01-18', status: 'Ready to Post', tags: ['Ready'], brief: 'Trust builder.', comments: [], activity: [] },
  { id: 'business-blindspot', slug: 'business-blindspot', title: 'Business owner blindspot', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-19', status: 'Editing', tags: ['Editing'], brief: 'Blindspot content.', comments: [], activity: [] },
  { id: 'team-angle-shoot', slug: 'team-angle-shoot', title: 'Content shoot: team angle', clientId: 'munif', category: 'Shoot', postDate: '2026-01-20', status: 'Shoot', tags: ['Shoot'], brief: 'Team angle shoot.', comments: [], activity: [] },
  { id: 'delegate-better', slug: 'delegate-better', title: 'How to delegate better', clientId: 'munif', category: 'Educational Content', postDate: '2026-01-22', status: 'Ready to Post', tags: ['Ready'], brief: 'Delegation lesson.', comments: [], activity: [] },
  { id: 'before-after-system', slug: 'before-after-system', title: 'Before/after system post', clientId: 'munif', category: 'Case Study', postDate: '2026-01-23', status: 'Editing', tags: ['Editing'], brief: 'Before/after system.', comments: [], activity: [] },
  { id: 'monthly-recap', slug: 'monthly-recap', title: 'Monthly lesson recap', clientId: 'munif', category: 'Recap', postDate: '2026-01-26', status: 'Idea', tags: ['Idea'], brief: 'Monthly recap.', comments: [], activity: [] },
  { id: 'founder-quote', slug: 'founder-quote', title: 'Founder quote short', clientId: 'munif', category: 'Short', postDate: '2026-01-28', status: 'Idea', tags: ['Idea'], brief: 'Founder quote.', comments: [], activity: [] },
  { id: 'end-month-cta', slug: 'end-month-cta', title: 'End-month CTA video', clientId: 'munif', category: 'CTA', postDate: '2026-01-30', status: 'Idea', tags: ['Idea'], brief: 'End of month CTA.', comments: [], activity: [] },
];

export const calendarDays: CalendarDay[] = [
  { date: 29, muted: true, items: [] }, { date: 30, muted: true, items: [] }, { date: 31, muted: true, items: [] },
  ...Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const dayText = `2026-01-${String(day).padStart(2, '0')}`;
    return { date: day, items: contentItems.filter((item) => item.postDate === dayText), note: day === 25 ? '+2 more planned' : undefined };
  }),
  { date: 1, muted: true, items: [] },
];

export const calendarMetrics = [
  { label: 'Total content', value: '26' },
  { label: 'Need approval', value: '3' },
  { label: 'Ready to post', value: '7' },
  { label: 'Posted', value: '12' },
];

export const queueMetrics = [
  { label: 'Pending QC', value: '9' },
  { label: 'Client approval', value: '6' },
  { label: 'Needs reply', value: '4' },
  { label: 'Hook/caption', value: '7' },
];

export const reviewQueue: QueueTask[] = [
  { id: 'q1', column: 'Pending QC', client: 'Munif Isa', title: 'Leadership myth short', due: 'Due today', tags: ['Editor submitted', '1:18'], assignees: ['ED', 'QC'], slug: 'content-scaling-mistakes' },
  { id: 'q2', column: 'Pending QC', client: 'UCMI', title: 'Recruitment pain point reel', due: '4h left', tags: ['Check captions', 'Drive link'], assignees: ['FA'] },
  { id: 'q3', column: 'Pending QC', client: 'Sixma', title: 'Business owner blindspot', due: 'Tomorrow', tags: ['New output'], assignees: ['AZ'] },
  { id: 'q4', column: 'Pending Client Approval', client: 'Munif Isa', title: '3 mistakes before scaling', due: 'Sent 2h ago', tags: ['Waiting client', 'Caption missing'], assignees: ['MI', 'PM'], slug: 'content-scaling-mistakes' },
  { id: 'q5', column: 'Pending Client Approval', client: 'UCMI', title: 'Training proof video', due: '1 day', tags: ['Email sent'], assignees: ['UC'] },
  { id: 'q6', column: 'Amendments / Replies', client: 'Munif Isa', title: 'Hiring without clarity', due: 'New comment', tags: ['Client amendment', '00:18', '01:12'], assignees: ['MI', 'PM'] },
  { id: 'q7', column: 'Amendments / Replies', client: 'Sixma', title: 'Before/after system post', due: 'Waiting editor', tags: ['Editor amendment'], assignees: ['ED'] },
  { id: 'q8', column: 'Hook & Caption', client: 'Munif Isa', title: '3 mistakes before scaling', due: 'Before Jan 12', tags: ['Hook missing', 'Caption missing'], assignees: ['CW'], slug: 'content-scaling-mistakes' },
  { id: 'q9', column: 'Hook & Caption', client: 'UCMI', title: 'Founder reminder clip', due: 'Ready soon', tags: ['Video approved', 'Caption'], assignees: ['PM'] },
];

export const priorityAlerts: AlertItem[] = [
  { id: 'p1', icon: '⏰', title: '2 client approvals are overdue', detail: 'Send reminder email or manually WhatsApp them to log in.', priority: 'High' },
  { id: 'p2', icon: '🔗', title: '3 content cards missing Drive links', detail: 'Raw footage or editor output link missing.', priority: 'Medium' },
  { id: 'p3', icon: '✍️', title: '7 approved videos still need hook/caption', detail: 'Prevent these from becoming Ready to Post too early.', priority: 'High' },
];

export const recentActivity: ActivityItem[] = [
  { id: 'r1', icon: '💬', text: 'CCA replied to your comment on 3 mistakes before scaling', time: '12 minutes ago' },
  { id: 'r2', icon: '✓', text: 'Morning reminder reel moved to Ready to Post', time: 'Today, 9:42 AM' },
  { id: 'r3', icon: '🎬', text: 'Office B-roll shoot added to calendar', time: 'Yesterday, 5:18 PM' },
];

export const teamActivity: ActivityItem[] = [
  { id: 't1', icon: '✓', text: 'QC approved “3 mistakes before scaling”', time: '18 minutes ago · status moved to Pending Client Approval' },
  { id: 't2', icon: '💬', text: 'Munif left timestamp comment at 00:18', time: '34 minutes ago · needs CCA reply' },
  { id: 't3', icon: '🎬', text: 'Editor uploaded new output for “Leadership myth short”', time: '1 hour ago · moved to Pending QC' },
];

export function getContentBySlug(slug: string) {
  return contentItems.find((item) => item.slug === slug);
}
