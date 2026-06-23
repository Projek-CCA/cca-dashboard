import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { MetricCard } from '@/components/MetricCard';
import { StatusPill } from '@/components/StatusPill';
import { priorityAlerts, queueMetrics, reviewQueue, teamActivity } from '@/lib/mock-data';
import type { QueueTask } from '@/lib/types';

const columnMetricKeys: Record<QueueTask['column'], string> = {
  'Pending QC': 'Pending QC',
  'Pending Client Approval': 'Client approval',
  'Amendments / Replies': 'Needs reply',
  'Hook & Caption': 'Hook/caption',
};

const navItems = [
  { href: '/internal/review-queue', label: 'Overview' },
  { href: '/internal/review-queue', label: 'Review Queue', active: true },
  { href: '/calendar', label: 'Client Calendar' },
  { href: '/review/content-scaling-mistakes', label: 'Video Review' },
  { href: '/internal/review-queue', label: 'Editor Tasks' },
];

export default function InternalReviewQueuePage() {
  return (
    <AppShell
      sectionLabel="Internal Ops"
      navItems={navItems}
      sideTitle="CCA staff view"
      sideCopy="This is the daily working board for QC, client approvals, amendments, and missing hook/caption tasks."
    >
      <div className="topbar">
        <div className="crumb">Internal Dashboard / <b>Review Queue</b> / Today</div>
        <div className="top-actions"><Button>Bulk update</Button><Button variant="primary">+ Add content</Button></div>
      </div>
      <div className="mobile-note">On mobile, this board becomes stacked queues by priority.</div>
      <section className="hero">
        <div><h1>CCA Internal Review Queue</h1><p>One place for the team to clear QC, client approvals, amendments, and hook/caption bottlenecks.</p></div>
        <div className="summary">{queueMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      </section>
      <div className="toolbar">
        <div className="filters"><button className="chip active">All urgent</button><button className="chip">Overdue</button><button className="chip">Pending QC</button><button className="chip">Client replied</button><button className="chip">Missing links</button><button className="chip">Ready to post</button></div>
        <input className="search" placeholder="Search client, editor, content…" />
      </div>
      <section className="board">
        {Object.keys(columnMetricKeys).map((column) => {
          const col = column as QueueTask['column'];
          const tasks = reviewQueue.filter((task) => task.column === col);
          const metric = queueMetrics.find((item) => item.label === columnMetricKeys[col]);
          return (
            <div className="column" key={column}>
              <div className="col-head"><h2>{column}</h2><span className="count">{metric?.value ?? tasks.length}</span></div>
              <div className="cards">
                {tasks.map((task) => (
                  <article className="task" key={task.id}>
                    <div className="task-top"><span className="client">{task.client}</span><span className="due">{task.due}</span></div>
                    <h3>{task.title}</h3>
                    <div className="meta">{task.tags.map((tag) => <StatusPill key={tag} label={tag} />)}</div>
                    <div className="task-footer">
                      <div className="avatars">{task.assignees.map((assignee) => <div className="avatar" key={assignee}>{assignee}</div>)}</div>
                      {task.slug ? <Link className="open" href={`/review/${task.slug}`}>{column === 'Pending Client Approval' ? 'Review' : 'Open'}</Link> : <button className="open">Open</button>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
      <section className="lower">
        <div className="panel">
          <div className="panel-head"><h2>Priority alerts</h2><Button variant="warn">Resolve overdue</Button></div>
          <div className="list">
            {priorityAlerts.map((alert) => (
              <div className="row" key={alert.id}><div className="icon">{alert.icon}</div><div><strong>{alert.title}</strong><small>{alert.detail}</small></div><span className="priority">{alert.priority}</span></div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Team activity</h2><Button>View logs</Button></div>
          <div className="activity">
            {teamActivity.map((event) => (
              <div className="event" key={event.id}><div className="mini">{event.icon}</div><div><p>{event.text}</p><small>{event.time}</small></div></div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
