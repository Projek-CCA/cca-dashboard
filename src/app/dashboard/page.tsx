'use client';

import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { calendarMetrics, contentItems, priorityAlerts, reviewQueue, recentActivity, teamActivity } from '@/lib/mock-data';
import { useMemo, useState } from 'react';

const statusPipeline = ['Idea', 'Shoot', 'Editing', 'Pending QC', 'Pending Client Approval', 'Amendments Requested', 'Pending Hook & Caption', 'Ready to Post', 'Posted'] as const;

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'qc' | 'project_manager'>('editor');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const items = contentItems; // Fallback to mock data

  // Compute pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const status of statusPipeline) {
      counts[status] = items.filter((item) => item.status === status).length;
    }
    return counts;
  }, [items]);

  const totalCount = items.length;
  const pendingQC = items.filter((i) => i.status === 'Pending QC').length;
  const pendingApproval = items.filter((i) => i.status === 'Pending Client Approval').length;
  const posted = items.filter((i) => i.status === 'Posted').length;

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: userPassword, name: userName, role: newUserRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error || 'Failed to create user');
        return;
      }

      setCreateSuccess(`User ${data.user.email} created with role ${data.user.role}`);
      setUserEmail('');
      setUserPassword('');
      setUserName('');
    } catch {
      setCreateError('Network error. Please try again.');
    }
  }

  const isAdmin = role === 'admin';

  return (
    <AppShell
      sectionLabel="Dashboard"
      navItems={[]}
      sideTitle={isAdmin ? 'Admin Dashboard' : 'PM Dashboard'}
      sideCopy={
        isAdmin
          ? 'Full pipeline metrics, user management, and quick links to all sections.'
          : 'Pipeline overview, calendar integration, and review queue board.'
      }
      role={role}
    >
      <div className="topbar">
        <div className="crumb">
          {isAdmin ? 'Admin' : 'PM'} Dashboard / <b>Overview</b>
        </div>
        <div className="top-actions">
          <Link className="btn" href="/calendar">Calendar</Link>
          <Link className="btn primary" href="/internal/review-queue">Review Queue</Link>
        </div>
      </div>

      {/* Pipeline Summary */}
      <section className="hero">
        <div>
          <h1>Content Pipeline Overview</h1>
          <p>End-to-end view of all content from idea to posted.</p>
        </div>
        <div className="summary">
          <MetricCard label="Total Content" value={String(totalCount)} />
          <MetricCard label="Pending QC" value={String(pendingQC)} />
          <MetricCard label="Client Approvals" value={String(pendingApproval)} />
          <MetricCard label="Posted" value={String(posted)} />
        </div>
      </section>

      {/* Pipeline Chart (CSS-only) */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Pipeline Status Distribution</h2>
        </div>
        <div className="pipeline-chart">
          {statusPipeline.map((status) => {
            const count = pipelineCounts[status] || 0;
            const maxCount = Math.max(...Object.values(pipelineCounts), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div className="pipeline-bar" key={status}>
                <span className="pipeline-label">{status}</span>
                <div className="pipeline-track">
                  <div
                    className="pipeline-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="pipeline-count">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <section className="drawer" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel-head"><h2>Quick Links</h2></div>
          <div className="list">
            <Link className="row" href="/calendar">
              <div className="icon">📅</div>
              <div><strong>Content Calendar</strong><small>View monthly schedule and upcoming posts</small></div>
            </Link>
            <Link className="row" href="/internal/review-queue">
              <div className="icon">📋</div>
              <div><strong>Review Queue</strong><small>QC, approvals, amendments, hook & caption</small></div>
            </Link>
            <Link className="row" href="/editor/tasks">
              <div className="icon">✂️</div>
              <div><strong>Editor Tasks</strong><small>Assigned edits, deadlines, submissions</small></div>
            </Link>
            {isAdmin && (
              <Link className="row" href="/qc">
                <div className="icon">✅</div>
                <div><strong>QC Review</strong><small>Videos pending quality control review</small></div>
              </Link>
            )}
          </div>
        </div>

        {/* Priority Alerts */}
        <div className="panel">
          <div className="panel-head"><h2>Priority Alerts</h2></div>
          <div className="list">
            {priorityAlerts.map((alert) => (
              <div className="row" key={alert.id}>
                <div className="icon">{alert.icon}</div>
                <div><strong>{alert.title}</strong><small>{alert.detail}</small></div>
                <span className={`priority ${alert.priority.toLowerCase()}`}>{alert.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Activity */}
      <section className="drawer" style={{ marginBottom: 20 }}>
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
          <div className="panel-head"><h2>Recent Activity</h2></div>
          <div className="activity">
            {recentActivity.map((event) => (
              <div className="event" key={event.id}>
                <div className="icon">{event.icon}</div>
                <div><p>{event.text}</p><small>{event.time}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Management (Admin only) */}
      {isAdmin && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>User Management</h2>
          </div>

          <div style={{ padding: '0 14px 12px' }}>
            <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--muted)' }}>Create User</h3>
            <form onSubmit={handleCreateUser} className="user-create-form">
              <div className="create-user-grid">
                <div className="login-field">
                  <label htmlFor="name">Name</label>
                  <input id="name" type="text" placeholder="Full name" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                </div>
                <div className="login-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" placeholder="user@cca.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                </div>
                <div className="login-field">
                  <label htmlFor="password">Password</label>
                  <input id="password" type="password" placeholder="Password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required />
                </div>
                <div className="login-field">
                  <label htmlFor="role">Role</label>
                  <select id="role" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'editor' | 'qc' | 'project_manager')}>
                    <option value="editor">Editor</option>
                    <option value="qc">QC</option>
                    <option value="project_manager">Project Manager</option>
                  </select>
                </div>
              </div>
              {createError && <div className="login-error">{createError}</div>}
              {createSuccess && <div className="login-success">{createSuccess}</div>}
              <Button variant="primary" type="submit">Create User</Button>
            </form>
          </div>
        </section>
      )}
    </AppShell>
  );
}
