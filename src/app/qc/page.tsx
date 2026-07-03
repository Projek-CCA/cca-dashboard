'use client';

import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { StatusPill } from '@/components/StatusPill';
import { MetricCard } from '@/components/MetricCard';
import { contentItems, reviewQueue, teamActivity } from '@/lib/mock-data';
import { useEffect, useState } from 'react';

const qcPendingItems = contentItems.filter((item) => item.status === 'Pending QC');

export default function QCDashboardPage() {
  const { role } = useAuth();
  const [activeReview, setActiveReview] = useState<string | null>(null);

  return (
    <AppShell
      sectionLabel="QC Workspace"
      navItems={[]}
      sideTitle="QC Dashboard"
      sideCopy="Videos pending QC review. Comment, approve, or request amendments."
      role={role}
    >
      <div className="topbar">
        <div className="crumb">QC Dashboard / <b>Pending Review</b></div>
        <div className="top-actions">
          <Button variant="primary">View all</Button>
        </div>
      </div>

      <section className="hero">
        <div>
          <h1>QC Review Queue</h1>
          <p>Videos submitted by editors awaiting quality control review.</p>
        </div>
        <div className="summary">
          <MetricCard label="Pending QC" value={String(qcPendingItems.length)} />
          <MetricCard label="In Queue" value={String(reviewQueue.filter((t) => t.column === 'Pending QC').length)} />
          <MetricCard label="Reviewed Today" value="0" />
        </div>
      </section>

      <section className="board">
        <div className="column" style={{ maxWidth: '100%' }}>
          <div className="col-head">
            <h2>Pending QC Review</h2>
            <span className="count">{qcPendingItems.length}</span>
          </div>
          <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {qcPendingItems.length === 0 ? (
              <div className="panel" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                No videos pending QC review. 🎉
              </div>
            ) : (
              qcPendingItems.map((item) => (
                <article className="task" key={item.id}>
                  <div className="task-top">
                    <span className="client">{item.category}</span>
                    <span className="due">{item.duration || '—'}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <div className="meta">
                    <StatusPill label={item.status} />
                    <span className="pill gray">{item.clientId}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0' }}>{item.brief}</p>
                  <div className="task-footer">
                    <a className="open" href={`/review/${item.slug}`}>Open Review</a>
                    <Button variant="green" style={{ marginLeft: 8 }}>Approve</Button>
                    <Button variant="danger" style={{ marginLeft: 4 }}>Amend</Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="drawer">
        <div className="panel">
          <div className="panel-head"><h2>Team Activity</h2></div>
          <div className="activity">
            {teamActivity.map((event) => (
              <div className="event" key={event.id}>
                <div className="mini">{event.icon}</div>
                <div><p>{event.text}</p><small>{event.time}</small></div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>QC Tips</h2></div>
          <div className="list">
            <div className="row">
              <div className="icon">✅</div>
              <div><strong>Check video quality</strong><small>Ensure audio, visuals, and transitions are clean.</small></div>
            </div>
            <div className="row">
              <div className="icon">💬</div>
              <div><strong>Timestamp comments</strong><small>Use specific timestamps for amendment requests.</small></div>
            </div>
            <div className="row">
              <div className="icon">📝</div>
              <div><strong>Verify captions</strong><small>Check spelling, grammar, and brand terms.</small></div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
