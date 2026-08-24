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

/* ── Helpers ────────────────────────────────── */

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [year, month, day] = d.slice(0, 10).split('-');
  return year && month && day ? `${day}-${month}-${year}` : d;
}

function statusStyle(s: string): React.CSSProperties {
  const lower = (s || '').toLowerCase();
  if (!lower) return { background: '#f6f5f4', color: '#9ca3af' };
  if (lower === 'done') return { background: '#ecfdf3', color: '#15803d' };
  if (lower === 'editing') return { background: '#fff5e6', color: '#c2410c' };
  if (lower.includes('amendment')) return { background: '#fef3c7', color: '#a16207' };
  if (lower.includes('check')) return { background: '#e0e7ff', color: '#4338ca' };
  return { background: '#e0e7ff', color: '#4338ca' };
}

function deliveryStyle(s: string): React.CSSProperties {
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

/* ── useIsMobile Hook ──────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/* ── Main Component ─────────────────────────── */

export function EditorTasksClient({
  tasks, months, statuses, clients, isEditor, editorName, authRedirect = false,
}: {
  tasks: Task[];
  months: string[];
  statuses: string[];
  clients: string[];
  isEditor: boolean;
  editorName: string;
  authRedirect?: boolean;
}) {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [items, setItems] = useState<Task[]>(tasks);
  const [sortKey, setSortKey] = useState<string>('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (authRedirect) window.location.href = '/login';
  }, [authRedirect]);

  useEffect(() => { setItems(tasks); }, [tasks]);

  const now = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = items;
    if (filterMonth) list = list.filter((t) => t.sheet_tab === filterMonth);
    if (filterStatus) list = list.filter((t) => t.status === filterStatus);
    if (filterClient) list = list.filter((t) => t.client_name === filterClient);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) =>
        t.content_title.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        String(t.content_no || '').includes(q)
      );
    }
    return list;
  }, [items, filterMonth, filterStatus, filterClient, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'deadline') cmp = (a.deadline || '').localeCompare(b.deadline || '');
      else if (sortKey === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortKey === 'client') cmp = (a.client_name || '').localeCompare(b.client_name || '');
      else if (sortKey === 'delivery') cmp = (a.delivery_status || '').localeCompare(b.delivery_status || '');
      else if (sortKey === 'content_no') cmp = (a.content_no || 0) - (b.content_no || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const sortInd = (k: string) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

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
      sideTitle="Editor Workspace"
      sideCopy={isEditor ? `Tasks assigned to ${editorName} from the tracking sheet.` : 'All tracking-sheet tasks (staff view).'}
    >
      <div className="editor-tasks">
        <div className="topbar">
          <div className="crumb">Editor / <b>Tasks</b></div>
          <span className="pill">{items.length} tasks · {doneCount} done</span>
        </div>

        {isEditor && editorName && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Signed in as <b>{editorName}</b> — matched against the "Video Editor" column in the tracking sheet.
            {overdueCount > 0 && (
              <span style={{ color: 'var(--red)', fontWeight: 600 }}> · {overdueCount} overdue</span>
            )}
          </div>
        )}

        {/* Filters */}
        <div style={{
          ...filterBarStyle,
          ...(isMobile ? { flexDirection: 'column', alignItems: 'stretch', gap: 6 } : {}),
        }}>
          <input
            className="search"
            placeholder="Search title, client, content #…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={isMobile ? { minWidth: 0, width: '100%' } : {}}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <QuickSelect value={filterStatus} onChange={setFilterStatus} options={statuses} label="Status" />
            <QuickSelect value={filterClient} onChange={setFilterClient} options={clients} label="Client" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={selectStyle}
            >
              <option value="">All months</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {sorted.length} of {items.length}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="task-table-panel panel" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {isEditor
              ? <>No tasks assigned to <b>{editorName}</b> yet. If this looks wrong, ask your manager to use your exact name in the sheet's "Video Editor" column.</>
              : 'No tasks match the current filters.'}
          </div>
        )}

        {/* ── Mobile card layout (visible on sub-768px) ── */}
        {sorted.length > 0 && (
          <div className="editor-mobile-cards">
            {sorted.map((t) => {
              const overdue = isOverdue(t, now);
              const done = (t.status || '').toLowerCase() === 'done';
              return (
                <div key={`mc-${t.id}`} style={mobileCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--soft)', fontWeight: 600 }}>
                        #{String(t.content_no || '—').padStart(3, '0')} · {t.sheet_tab}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginTop: 2 }}>{t.content_title}</div>
                    </div>
                    {t.content_ref && (
                      <a
                        href={t.content_ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn small outline"
                        style={{ fontSize: 11, textDecoration: 'none', flexShrink: 0 }}
                        title="Open raw files (Google Drive)"
                      >📁 Raw Files</a>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t.client_name}</div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ ...statusStyle(t.status), borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: 12 }}>
                      {t.status || '—'}
                    </span>
                    <span style={{ ...deliveryStyle(t.delivery_status), borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: 12 }}>
                      {t.delivery_status || '—'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>
                      Deadline:{' '}
                      <b style={{ color: overdue ? 'var(--red)' : 'var(--ink)' }}>{fmtDate(t.deadline)}</b>
                      {overdue && <span style={{ color: 'var(--red)' }}> ⚠</span>}
                    </span>
                    {done && <span style={{ color: 'var(--green)' }}>✓ Done {fmtDate(t.completion_date)}</span>}
                  </div>

                  {/* Quick status change */}
                  <div style={{ marginTop: 8 }}>
                    <select
                      value={t.status || ''}
                      onChange={(e) => handleStatus(t.id, e.target.value)}
                      disabled={savingId === t.id}
                      style={{
                        ...statusStyle(t.status),
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        border: 'none',
                        width: '100%',
                        minHeight: 44,
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">— Change status —</option>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Desktop table layout (hidden on sub-768px) ── */}
        {sorted.length > 0 && (
          <div className="editor-desktop-table">
            <div style={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid var(--line)' }}>
                    <SortTh k="content_no" label="#" onSort={handleSort} sortInd={sortInd} />
                    <SortTh k="content_title" label="Title" onSort={handleSort} sortInd={sortInd} />
                    <SortTh k="client" label="Client" onSort={handleSort} sortInd={sortInd} />
                    <SortTh k="status" label="Status" onSort={handleSort} sortInd={sortInd} />
                    <SortTh k="deadline" label="Deadline" onSort={handleSort} sortInd={sortInd} />
                    <SortTh k="delivery" label="Delivery" onSort={handleSort} sortInd={sortInd} />
                    <th style={thStyle}>📁 Raw Files</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => {
                    const overdue = isOverdue(t, now);
                    const done = (t.status || '').toLowerCase() === 'done';
                    return (
                      <tr key={`dt-${t.id}`} style={{
                        borderBottom: '1px solid var(--line)',
                        background: overdue ? 'rgba(217,45,32,.03)' : 'transparent',
                      }}>
                        <td style={{ ...tdStyle, color: 'var(--soft)', fontSize: 11 }}>
                          {String(t.content_no || '—').padStart(3, '0')}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.content_title}>
                          {t.content_title}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{t.client_name}</td>
                        <td style={tdStyle}>
                          <select
                            value={t.status || ''}
                            onChange={(e) => handleStatus(t.id, e.target.value)}
                            disabled={savingId === t.id}
                            style={{
                              ...statusStyle(t.status),
                              borderRadius: 8,
                              padding: '4px 8px',
                              fontSize: 11,
                              fontFamily: 'inherit',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">—</option>
                            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 11 }}>
                          <span style={{ color: overdue ? 'var(--red)' : 'var(--ink)', fontWeight: overdue ? 600 : 400 }}>
                            {fmtDate(t.deadline)}
                            {overdue && ' ⚠'}
                          </span>
                          {done && (
                            <div style={{ color: 'var(--green)', fontSize: 10 }}>✓ {fmtDate(t.completion_date)}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...deliveryStyle(t.delivery_status), borderRadius: 999, padding: '2px 8px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                            {t.delivery_status || '—'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {t.content_ref ? (
                            <a
                              href={t.content_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn small outline"
                              style={{ fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap' }}
                              title="Open raw files (Google Drive)"
                            >📁 Raw Files</a>
                          ) : (
                            <span style={{ color: 'var(--soft)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--soft)', marginTop: 14 }}>
          Status changes write back to the tracking sheet (column F). Completion date is set automatically when marked Done.
        </p>
      </div>
    </AppShell>
  );
}

/* ── Sub-components ─────────────────────────── */

function SortTh({ k, label, onSort, sortInd }: { k: string; label: string; onSort: (k: string) => void; sortInd: (k: string) => string }) {
  return (
    <th onClick={() => onSort(k)} style={{
      ...thStyle,
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      {label}{sortInd(k)}
    </th>
  );
}

function QuickSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  if (options.length === 0) return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      <option value="">All {label}s</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ── Shared Styles ──────────────────────────── */

const filterBarStyle: React.CSSProperties = {
  display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
  background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
  padding: '6px 14px', marginBottom: 12, fontSize: 12,
};

const selectStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', outline: 'none',
  fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
  fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6,
  WebkitAppearance: 'none', appearance: 'none' as any,
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px', fontWeight: 600, color: 'var(--muted)',
  textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em',
  whiteSpace: 'nowrap', textAlign: 'left',
};

const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12 };

const mobileCardStyle: React.CSSProperties = {
  border: '1px solid var(--line)', borderRadius: 10, padding: '12px',
  background: '#fff',
};
