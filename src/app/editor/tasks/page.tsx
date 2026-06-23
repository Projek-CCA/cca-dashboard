import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { MetricCard } from '@/components/MetricCard';
import { StatusPill } from '@/components/StatusPill';

const navItems = [
  { href: '/calendar', label: 'Content Calendar' },
  { href: '/review/content-scaling-mistakes', label: 'Client Reviews' },
  { href: '/internal/review-queue', label: 'Internal Queue' },
  { href: '/editor/tasks', label: 'Editor Tasks', active: true },
];

const editorMetrics = [
  { label: 'Assigned', value: '8' },
  { label: 'Due today', value: '3' },
  { label: 'In amendment', value: '2' },
  { label: 'Submitted', value: '14' },
];

const tasks = [
  { id: 'e1', title: 'Leadership myth short', client: 'Munif Isa', due: 'Today, 6:00 PM', status: 'Editing', raw: 'Raw Drive folder', notes: 'Note to editor', slug: 'content-scaling-mistakes', priority: 'High' },
  { id: 'e2', title: 'Hiring without clarity', client: 'Munif Isa', due: 'Tomorrow, 12:00 PM', status: 'Amendments Requested', raw: 'Raw Drive folder', notes: 'Timestamp comments', slug: 'content-scaling-mistakes', priority: 'High' },
  { id: 'e3', title: 'Recruitment pain point reel', client: 'UCMI', due: 'Jan 18, 5:00 PM', status: 'Pending QC', raw: 'Raw Drive folder', notes: 'Storyboard', slug: 'content-scaling-mistakes', priority: 'Medium' },
];

export default function EditorTasksPage() {
  return (
    <AppShell sectionLabel="Editor Portal" navItems={navItems} sideTitle="Editor view" sideCopy="Editors should only see assigned work, raw footage links, notes, deadlines, amendment comments, and upload/submission actions.">
      <div className="topbar">
        <div className="crumb">Editor Portal / <b>My Tasks</b></div>
        <div className="top-actions"><Button>Upload output</Button><Button variant="primary">Submit selected</Button></div>
      </div>
      <section className="hero">
        <div><h1>Editor Task View</h1><p>A focused workspace for assigned edits, raw footage, notes, deadlines, amendments, and submissions.</p></div>
        <div className="summary">{editorMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      </section>
      <section className="panel task-table-panel">
        <div className="panel-head"><h2>Assigned edits</h2><Button>Filter by due date</Button></div>
        <div className="task-table">
          <div className="task-row header-row"><span>Content</span><span>Status</span><span>Resources</span><span>Due</span><span>Action</span></div>
          {tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <div><strong>{task.title}</strong><small>{task.client} · Priority {task.priority}</small></div>
              <StatusPill label={task.status} />
              <div className="resource-links"><button>{task.raw}</button><button>{task.notes}</button></div>
              <span className="due-text">{task.due}</span>
              <Link className="approval-btn" href={`/review/${task.slug}`}>{task.status === 'Amendments Requested' ? 'View comments' : 'Open'}</Link>
            </div>
          ))}
        </div>
      </section>
      <section className="drawer">
        <div className="panel"><div className="panel-head"><h2>Submission checklist</h2></div><div className="list"><div className="row"><div className="icon">🎬</div><div><strong>Upload output link</strong><small>Paste Google Drive output link or upload to assigned folder.</small></div><span className="priority">Required</span></div><div className="row"><div className="icon">💬</div><div><strong>Reply to amendment comments</strong><small>Mark each timestamp comment as resolved before submitting.</small></div><span className="priority">Required</span></div><div className="row"><div className="icon">✅</div><div><strong>Submit for QC</strong><small>Status moves to Pending QC and CCA team gets notified.</small></div><span className="priority">Final</span></div></div></div>
        <div className="panel"><div className="panel-head"><h2>Performance snapshot</h2></div><div className="activity"><div className="event"><div className="icon">⚡</div><div><p>86% on-time delivery this month</p><small>Mocked from future editor performance table.</small></div></div><div className="event"><div className="icon">🔁</div><div><p>2 revisions requested</p><small>Tracks amendment rate per editor.</small></div></div></div></div>
      </section>
    </AppShell>
  );
}
