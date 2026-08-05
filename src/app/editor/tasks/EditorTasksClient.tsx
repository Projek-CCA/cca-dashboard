'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';

interface Task {
  id: string;
  sheet_tab: string;
  content_no: number | null;
  content_title: string;
  client_name: string;
  video_editor: string;
  status: string;
  deadline: string | null;
  delivery_status: string;
  completion_date: string | null;
  content_ref: string;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusStyle(s: string) {
  const lower = (s || '').toLowerCase();
  if (!lower) return { background: '#f6f5f4', color: '#9ca3af' };
  if (lower === 'done') return { background: '#ecfdf3', color: '#15803d' };
  if (lower === 'editing') return { background: '#fff5e6', color: '#c2410c' };
  if (lower.includes('amendment')) return { background: '#fef3c7', color: '#a16207' };
  if (lower.includes('check')) return { background: '#e0e7ff', color: '#4338ca' };
  return { background: '#e0e7ff', color: '#4338ca' };
}

function deliveryStyle(s: string) {
  if (!s) return { background: '#f6f5f4', color: '#9ca3af' };
  if (s === 'EARLY!') return { background: '#ecfdf3', color: '#15803d' };
  if (s === 'LATE DELIVERY') return { background: '#fff1f0', color: '#dc2626' };
  if (s === 'DEADLINE DAY') return { background: '#fff5e6', color: '#c2410c' };
  return { background: '#f6f5f4', color: '#6b7280' };
}

function isOverdue(t: Task, now: string): boolean {
  if (!t.deadline || (t.status || '').toLowerCase() === 'done') return false;
  return t.deadline < now;
}

export function EditorTasksClient({
  tasks, months, statuses, isEditor, editorName, authRedirect = false,
}: {
  tasks: Task[];
  months: string[];
  statuses: string[];
  isEditor: boolean;
  editorName: string;
  authRedirect?: boolean;
}) {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [items, setItems] = useState<Task[]>(tasks);

  useEffect(() => {
    if (authRedirect) window.location.href = '/login';
  }, [authRedirect]);

  useEffect(() => { setItems(tasks); }, [tasks]);

  const now = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = items;
    if (filterMonth) list = list.filter((t) => t.sheet_tab === filterMonth);
    if (filterStatus) list = list.filter((t) => t.status === filterStatus);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) =>
        t.content_title.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        String(t.content_no || '').includes(q)
      );
    }
    return list;
  }, [items, filterMonth, filterStatus, query]);

  // Soonest deadlines first; overdue float to top
  const sorted = useMemo(() => {
    const overdue = filtered.filter((t) => isOverdue(t, now));
    const upcoming = filtered.filter((t) => !isOverdue(t, now));
    const byDate = (a: Task, b: Task) => (a.deadline || '9999').localeCompare(b.deadline || '9999');
    return [...overdue.sort(byDate), ...upcoming.sort(byDate)];
  }, [filtered, now]);

  const handleStatus = useCallback(async (tid: string, v: string) => {
    setSavingId(tid);
    setItems((p) => p.map((t) => (t.id === tid ? { ...t, status: v } : t)));
    try {
      await fetch(`/api/project-tracking/${tid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'status', value: v }),
      });
    } catch { /* silent — next refresh corrects */ }
    setSavingId(null);
  }, []);

  const overdueCount = items.filter((t) => isOverdue(t, now)).length;
  const doneCount = items.filter((t) => (t.status || '').toLowerCase() === 'done').length;

  return (
    <AppShell
      sectionLabel="Editor Portal"
      navItems={[
        { href: '/editor/tasks', label: 'My Tasks', active: true },
        { href: '/internal/content-hub', label: 'Notion Content Hub' },
      ]}
      sideTitle="Editor Workspace"
      sideCopy={isEditor ? `Tasks assigned to ${editorName} from the tracking sheet.` : 'All tracking-sheet tasks (staff view).'}
    >
      <div className="topbar">
        <div className="crumb">Editor / <b>Tasks</b></div>
        <span className="pill">{items.length} tasks · {doneCount} done</span>
      </div>

      {isEditor && editorName && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          Signed in as <b>{editorName}</b> — matched against the “Video Editor” column in the tracking sheet.
          {overdueCount > 0 && (
            <span style={{ color: 'var(--red)', fontWeight: 600 }}> · {overdueCount} overdue</span>
          )}
        </div>
      )}

      <div className="toolbar">
        <div className="filters">
          <button
            className={`chip ${filterStatus === '' ? 'active' : ''}`}
            onClick={() => setFilterStatus('')}
          >All</button>
          {statuses.map((s) => (
            <button
              key={s}
              className={`chip ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
            >
              {s || 'Unassigned'}
            </button>
          ))}
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit', background: '#fff' }}
        >
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          className="search"
          placeholder="Search title, client…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {sorted.length === 0 && (
          <div className="task-table-panel panel" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {isEditor
              ? <>No tasks assigned to <b>{editorName}</b> yet. If this looks wrong, ask your manager to use your exact name in the sheet’s “Video Editor” column.</>
              : 'No tasks match the current filters.'}
          </div>
        )}
        {sorted.map((t) => {
          const overdue = isOverdue(t, now);
          const done = (t.status || '').toLowerCase() === 'done';
          return (
            <div
              key={t.id}
              style={{
                background: '#fff',
                border: `1px solid ${overdue ? 'rgba(217,45,32,.4)' : 'var(--line)'}`,
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div style={{ flex: '1 1 220px', minWidth: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 2 }}>
                  {String(t.content_no || '—').padStart(3, '0')} · {t.sheet_tab}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{t.content_title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.client_name}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, minWidth: 110 }}>
                <span style={{ color: 'var(--muted)' }}>
                  Deadline: <b style={{ color: overdue ? 'var(--red)' : 'var(--ink)' }}>{fmtDate(t.deadline)}</b>
                  {overdue && <span style={{ color: 'var(--red)' }}> ⚠</span>}
                </span>
                <span>
                  Delivery:{' '}
                  <span style={{ ...deliveryStyle(t.delivery_status), borderRadius: 999, padding: '0 7px', fontWeight: 600 }}>
                    {t.delivery_status || '—'}
                  </span>
                </span>
                {done && <span style={{ color: 'var(--green)' }}>✓ Done {fmtDate(t.completion_date)}</span>}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
                {t.content_ref && (
                  <a
                    href={t.content_ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn small outline"
                    style={{ fontSize: 12, textDecoration: 'none' }}
                    title="Open raw files (Google Drive)"
                  >📁 Raw Files</a>
                )}
                <select
                  value={t.status || ''}
                  onChange={(e) => handleStatus(t.id, e.target.value)}
                  disabled={savingId === t.id}
                  style={{
                    ...statusStyle(t.status),
                    borderRadius: 8,
                    padding: '5px 8px',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    border: 'none',
                  }}
                >
                  <option value="">—</option>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--soft)', marginTop: 14 }}>
        Status changes write back to the tracking sheet (column F). Completion date is set automatically when marked Done.
      </p>
    </AppShell>
  );
}
