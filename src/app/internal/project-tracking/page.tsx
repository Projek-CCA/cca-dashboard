'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

interface ProjectTask {
  id: string;
  sheet_tab: string;
  sheet_row: number;
  client_name: string;
  content_no: number | null;
  content_title: string;
  video_editor: string;
  status: string;
  deadline: string | null;
  delivery_status: string;
  completion_date: string | null;
  /** Google Drive / raw files link — mirrors column K ("Hard Links") in the sheet. */
  content_ref: string;
}

const MONTH_ORDER = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026',
];

/* ── Helpers ────────────────────────────────── */

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function statusPill(s: string) {
  const lower = (s || '').toLowerCase();
  if (!lower) return { background: '#f6f5f4', color: '#9ca3af' };
  if (lower === 'done') return { background: '#ecfdf3', color: '#15803d' };
  if (lower.includes('late')) return { background: '#fff1f0', color: '#dc2626' };
  if (lower === 'in progress') return { background: '#fff5e6', color: '#c2410c' };
  return { background: '#e0e7ff', color: '#4338ca' };
}

function deliveryPill(s: string) {
  if (!s) return { background: '#f6f5f4', color: '#9ca3af' };
  if (s === 'EARLY!') return { background: '#ecfdf3', color: '#15803d' };
  if (s === 'LATE DELIVERY') return { background: '#fff1f0', color: '#dc2626' };
  if (s === 'DEADLINE DAY') return { background: '#fff5e6', color: '#c2410c' };
  return { background: '#f6f5f4', color: '#6b7280' };
}

function pluralise(word: string): string {
  if (word.endsWith('s')) return word;
  return word + 's';
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

/* ── Add Task Modal ─────────────────────────── */

function AddTaskModal({
  clients, onClose, onAdded,
}: { clients: string[]; onClose: () => void; onAdded: () => void }) {
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!client || !title) { setError('Client and title required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/project-tracking/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, title, deadline, linkUrl }),
      });
      const data = await res.json();
      if (data.ok) { onAdded(); onClose(); }
      else { setError(data.error || 'Failed'); }
    } catch { setError('Network error'); }
    setSaving(false);
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>＋ Add New Task</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Client">
            <select value={client} onChange={(e) => setClient(e.target.value)} style={inputStyle}>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Content Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How to…" style={inputStyle} />
          </Field>
          <Field label="Deadline (DD/MM/YYYY)">
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="e.g. 15/08/2026" style={inputStyle} />
          </Field>
          <Field label="Raw Files Link (Google Drive, column K)">
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://drive.google.com/…" style={inputStyle} />
          </Field>
          {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} className="btn small outline" style={{ fontSize: 13 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn small" style={{ fontSize: 13 }}>
              {saving ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
      {label}
      {children}
    </label>
  );
}

/* ── Main Page ──────────────────────────────── */

export default function ProjectTrackingPage() {
  // Default to the current month — client-side filter only (no re-fetch on month change).
  const CURRENT_MONTH = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const CURRENT_YEAR  = String(new Date().getFullYear());

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [editors, setEditors] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterMonth, setFilterMonth] = useState(CURRENT_MONTH);
  const [filterEditor, setFilterEditor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAddTask, setShowAddTask] = useState(false);
  const isMobile = useIsMobile();

  /* Auth check */
  useEffect(() => {
    fetch('/api/project-tracking').then((r) => {
      if (r.status === 403) window.location.href = '/login';
    });
  }, []);

  const load = useCallback(async () => {
    // Always fetch ALL tasks; month/year filtering is client-side only.
    const params = new URLSearchParams();
    try {
      const res = await fetch(`/api/project-tracking?${params}`);
      const data = await res.json();
      if (data.ok) {
        setTasks(data.tasks);
        setMonths(data.months || []);
        setClients(data.clients || []);
        setEditors(data.editors || []);
        setStatuses(data.statuses || []);
        setDeliveryStatuses(data.deliveryStatuses || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // On first data load: if the current month tab doesn't exist yet,
  // fall back to the most recent available month (not blank).
  useEffect(() => {
    const sorted = months.sort((a, b) => (MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)));
    if (sorted.length && !sorted.includes(CURRENT_MONTH)) {
      setFilterMonth(sorted[sorted.length - 1]); // most recent month
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);


  const sortedMonths = useMemo(() =>
    months.sort((a, b) => (MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))),
    [months]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.content_title.toLowerCase().includes(q) || t.client_name.toLowerCase().includes(q) || (t.video_editor || '').toLowerCase().includes(q));
    }
    if (filterClient) list = list.filter((t) => t.client_name === filterClient);
    if (filterEditor) list = list.filter((t) => t.video_editor === filterEditor);
    if (filterStatus) list = list.filter((t) => t.status === filterStatus);
    // Month/year filter — client-side only. '__ALL__' = show all.
    if (filterMonth && filterMonth !== '__ALL__') {
      if (filterMonth.startsWith('__YEAR__')) {
        const yr = filterMonth.slice(8); // e.g. "__YEAR__2026"
        if (yr) list = list.filter((t) => (t.sheet_tab || '').includes(yr));
      } else {
        list = list.filter((t) => t.sheet_tab === filterMonth);
      }
    }
    return list;
  }, [tasks, search, filterClient, filterEditor, filterStatus, filterMonth]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'deadline') cmp = (a.deadline || '').localeCompare(b.deadline || '');
      else if (sortKey === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      else if (sortKey === 'delivery_status') cmp = (a.delivery_status || '').localeCompare(b.delivery_status || '');
      else if (sortKey === 'content_no') cmp = (a.content_no || 0) - (b.content_no || 0);
      else cmp = ((a as any)[sortKey] || '').localeCompare((b as any)[sortKey] || '');
      return sortDir === 'asc' ? cmp : -cmp;
    }),
    [filtered, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {};
    for (const t of sorted) { if (!map[t.client_name]) map[t.client_name] = []; map[t.client_name].push(t); }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted]);

  const toggleClient = (n: string) => setExpanded((p) => { const nx = new Set(p); nx.has(n) ? nx.delete(n) : nx.add(n); return nx; });
  const toggleAll = () => setExpanded(expanded.size === grouped.length ? new Set() : new Set(grouped.map(([n]) => n)));

  const handleSort = (k: string) => { if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc'); } };

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilterClient('');
    setFilterEditor('');
    setFilterStatus('');
    setFilterMonth('__ALL__');
  }, []);

  const handleFieldEdit = useCallback(async (tid: string, f: string, v: string) => {
    setSavingId(tid);
    setTasks((p) => p.map((t) => t.id === tid ? { ...t, [f]: v } : t));
    try { await fetch(`/api/project-tracking/${tid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: f, value: v }) }); } catch { /* */ }
    setSavingId(null);
  }, []);

  const sortInd = (k: string) => sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <AppShell sectionLabel="Internal" sideTitle="Project Tracking" sideCopy={`${tasks.length} tasks from Google Sheets. Edits sync both ways.`}>
      {/* Top bar */}
      <div className="project-tracking-mobile">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="crumb">
            <Link href="/internal" style={{ textDecoration: 'none', color: 'inherit' }}>Internal</Link>
            {' / '}<b>Project Tracking</b>
          </div>
          <Link href="/internal/dashboard" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>📊 Dashboard</Link>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading} className="btn small outline" style={{ fontSize: 12 }}>{loading ? '⏳' : '🔄'} Sync</button>
          <button onClick={() => setShowAddTask(true)} className="btn small" style={{ fontSize: 13 }}>＋ Add Task</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{
        ...filterBarStyle,
        ...(isMobile ? { flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '8px 10px' } : {}),
      }}>
        <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: isMobile ? undefined : 1, minWidth: isMobile ? undefined : 120, padding: isMobile ? '6px 4px' : undefined }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <QuickSelect value={filterClient} onChange={setFilterClient} options={clients} label="Client" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6, WebkitAppearance: 'none', appearance: 'none' }}
        >
          <option value="__ALL__">All months</option>
          <option value={`__YEAR__${CURRENT_YEAR}`}>All ({CURRENT_YEAR})</option>
          {sortedMonths.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <QuickSelect value={filterEditor} onChange={setFilterEditor} options={editors} label="Editor" />
        <QuickSelect value={filterStatus} onChange={setFilterStatus} options={statuses} label="Status" />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{filtered.length} of {tasks.length}</span>
        </div>
      </div>

      {/* Expand all + count — hidden while loading */}
      {!loading && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button onClick={toggleAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--blue)', padding: 0 }}>
          {expanded.size === grouped.length ? 'Collapse all' : 'Expand all'} ({grouped.length} clients)
        </button>
      </div>
      )}

      {/* Groups */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              border: '1px solid var(--line)', borderRadius: 10,
              background: 'var(--surface)', padding: '14px 16px',
            }}>
              <div className="skeleton-bar" style={{ height: 14, width: '26%', marginBottom: 10 }} />
              <div className="skeleton-bar" style={{ height: 10, width: '48%' }} />
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 16, minHeight: 260, textAlign: 'center',
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 'var(--space-md)', maxWidth: 400, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 36, lineHeight: 1, opacity: 0.35 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              No tasks match your current filters
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Try selecting a different month or clear filters
            </div>
            <button onClick={resetFilters} className="btn small outline" style={{ fontSize: 13, marginTop: 4 }}>
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grouped.map(([client, ctasks]) => (
                <ClientGroup
                  key={client}
                  client={client}
                  tasks={ctasks}
                  isOpen={expanded.has(client)}
                  onToggle={() => toggleClient(client)}
                  sortInd={sortInd}
                  onSort={handleSort}
                  onFieldEdit={handleFieldEdit}
                  savingId={savingId}
                  editors={editors}
                  statuses={statuses}
                  deliveryStatuses={deliveryStatuses}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal clients={clients} onClose={() => setShowAddTask(false)} onAdded={load} />
      )}
    </AppShell>
  );
}

/* ── Editable Date Cell ───────────────────── */

function EditableDate({ value, onChange, disabled, isMobile }: { value: string | null; onChange: (v: string) => void; disabled: boolean; isMobile?: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing && !disabled) {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => { onChange(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        autoFocus
        style={{ border: '1px solid var(--blue)', borderRadius: 4, padding: isMobile ? '8px 6px' : '2px 4px', fontSize: isMobile ? 14 : 11, fontFamily: 'inherit', width: isMobile ? '100%' : 100, minHeight: isMobile ? 44 : undefined, boxSizing: 'border-box' }}
      />
    );
  }
  return (
    <span onClick={() => !disabled && setEditing(true)} style={{ cursor: disabled ? 'default' : 'pointer', borderBottom: value ? '1px dashed var(--line)' : 'none', display: 'inline-block', padding: isMobile ? '10px 4px' : undefined, minHeight: isMobile ? 44 : undefined, lineHeight: isMobile ? '24px' : undefined }} title="Click to edit">
      {fmtDate(value)}
    </span>
  );
}

/* ── Editable Raw Files Cell ───────────────── */

function RawFilesCell({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (editing && !disabled) {
    return (
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onChange(draft); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }}
        autoFocus
        placeholder="https://drive.google.com/…"
        style={{ border: '1px solid var(--blue)', borderRadius: 4, padding: '2px 4px', fontSize: 11, fontFamily: 'inherit', width: 170 }}
      />
    );
  }
  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      title={value ? 'Open raw files — click to edit' : 'Click to add raw files link'}
    >
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600, fontSize: 12 }}
        >
          📁 Raw Files
        </a>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
      )}
    </span>
  );
}

/* ── Mobile Field (label:value row) ────────── */

function MobileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
      <span style={{ width: 70, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12 }}>{value}</span>
    </div>
  );
}

/* ── Client Group Card ─────────────────────── */

function ClientGroup({ client, tasks, isOpen, onToggle, sortInd, onSort, onFieldEdit, savingId, editors, statuses, deliveryStatuses, isMobile }: any) {
  const doneCount = tasks.filter((t: ProjectTask) => t.status === 'Done').length;
  const pct = Math.round((doneCount / tasks.length) * 100);

  // Status breakdown counts
  const statusCounts: Record<string, number> = {};
  for (const t of tasks) {
    const s = t.status || 'Unassigned';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  const breakdown = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a);

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
      <button onClick={onToggle} style={clientHeaderStyle}>
        <span style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', display: 'inline-block' }}>▶</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{client}</span>
        <span style={{ background: 'var(--surface-2)', borderRadius: 999, padding: '1px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>{tasks.length}</span>
        <div style={{ flex: 1, maxWidth: 80, height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--orange)', borderRadius: 3 }} />
        </div>
        {/* Status breakdown badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 10 }}>
          {breakdown.map(([s, c]) => (
            <span key={s} style={{
              ...statusPill(s === 'Unassigned' ? '' : s),
              borderRadius: 999, padding: '1px 6px', fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap',
            }}>
              {s} {c}
            </span>
          ))}
        </div>
      </button>
      {isOpen && (
        <>
          {/* Mobile card layout — always rendered, CSS media query controls visibility */}
          <div className="mobile-cards">
            {tasks.map((t: ProjectTask) => (
              <div key={`mc-${t.id}`} style={mobileCardStyle}>
                <MobileField label="#" value={t.content_no ? String(t.content_no) : '—'} />
                <MobileField
                  label="Title"
                  value={<span style={{ fontSize: 12, fontWeight: 500 }}>{t.content_title}</span>}
                />
                <MobileField
                  label="Raw Files"
                  value={
                    <RawFilesCell
                      value={t.content_ref || ''}
                      onChange={(v: string) => onFieldEdit(t.id, 'content_ref', v)}
                      disabled={savingId === t.id}
                    />
                  }
                />
                <MobileField
                  label="Editor"
                  value={
                    <select value={t.video_editor || ''} onChange={(e) => onFieldEdit(t.id, 'video_editor', e.target.value)} disabled={savingId === t.id} style={mobileSelectStyle}>
                      <option value="">—</option>
                      {editors.map((e: string) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  }
                />
                <MobileField
                  label="Status"
                  value={
                    <select value={t.status || ''} onChange={(e) => onFieldEdit(t.id, 'status', e.target.value)} disabled={savingId === t.id} style={{ ...mobileSelectStyle, ...statusPill(t.status) }}>
                      <option value="">—</option>
                      {statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  }
                />
                <MobileField
                  label="Deadline"
                  value={
                    <EditableDate
                      value={t.deadline}
                      onChange={(v: string) => onFieldEdit(t.id, 'deadline', v)}
                      disabled={savingId === t.id}
                      isMobile={isMobile}
                    />
                  }
                />
                <MobileField
                  label="Delivery"
                  value={
                    <select value={t.delivery_status || ''} onChange={(e) => onFieldEdit(t.id, 'delivery_status', e.target.value)} disabled={savingId === t.id} style={{ ...mobileSelectStyle, ...deliveryPill(t.delivery_status) }}>
                      <option value="">—</option>
                      {deliveryStatuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  }
                />
                <MobileField
                  label="Completed"
                  value={
                    <EditableDate
                      value={t.completion_date}
                      onChange={(v: string) => onFieldEdit(t.id, 'completion_date', v)}
                      disabled={savingId === t.id}
                      isMobile={isMobile}
                    />
                  }
                />
              </div>
            ))}
          </div>
          {/* Desktop table layout — always rendered, CSS media query controls visibility */}
          <div className="desktop-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid var(--line)' }}>
                  <SortTh k="content_no" label="#" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="content_title" label="Title" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="content_ref" label="📁 Raw Files" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="video_editor" label="Editor" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="status" label="Status" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="deadline" label="Deadline" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="delivery_status" label="Delivery" onSort={onSort} sortInd={sortInd} />
                  <SortTh k="completion_date" label="Completed" onSort={onSort} sortInd={sortInd} />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t: ProjectTask, i: number) => (
                  <tr key={`dt-${t.id}`} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={tdStyle}>{t.content_no || '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.content_title}>{t.content_title}</td>
                    <td style={tdStyle}>
                      <RawFilesCell
                        value={t.content_ref || ''}
                        onChange={(v) => onFieldEdit(t.id, 'content_ref', v)}
                        disabled={savingId === t.id}
                      />
                    </td>
                    <td style={tdStyle}>
                      <select value={t.video_editor || ''} onChange={(e) => onFieldEdit(t.id, 'video_editor', e.target.value)} disabled={savingId === t.id} style={{ ...selectInputStyle, maxWidth: 100 }}>
                        <option value="">—</option>
                        {editors.map((e: string) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <select value={t.status || ''} onChange={(e) => onFieldEdit(t.id, 'status', e.target.value)} disabled={savingId === t.id} style={{ ...selectInputStyle, ...statusPill(t.status), border: 'none' }}>
                        <option value="">—</option>
                        {statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 11 }}>
                      <EditableDate
                        value={t.deadline}
                        onChange={(v) => onFieldEdit(t.id, 'deadline', v)}
                        disabled={savingId === t.id}
                      />
                    </td>
                    <td style={tdStyle}>
                      <select value={t.delivery_status || ''} onChange={(e) => onFieldEdit(t.id, 'delivery_status', e.target.value)} disabled={savingId === t.id} style={{ ...selectInputStyle, ...deliveryPill(t.delivery_status), border: 'none' }}>
                        <option value="">—</option>
                        {deliveryStatuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: 11 }}>
                      <EditableDate
                        value={t.completion_date}
                        onChange={(v) => onFieldEdit(t.id, 'completion_date', v)}
                        disabled={savingId === t.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SortTh({ k, label, onSort, sortInd }: { k: string; label: string; onSort: (k: string) => void; sortInd: (k: string) => string }) {
  return (
    <th onClick={() => onSort(k)} style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '.05em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: 'left' }}>
      {label}{sortInd(k)}
    </th>
  );
}

function QuickSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 6, WebkitAppearance: 'none', appearance: 'none' }}>
      <option value="">All {pluralise(label)}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ── Shared Styles ─────────────────────────── */

const filterBarStyle: React.CSSProperties = {
  display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
  background: '#fff', border: '1px solid var(--line)', borderRadius: 12,
  padding: '6px 14px', marginBottom: 12, fontSize: 12,
};

const clientHeaderStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: '#fafbfc', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
  textAlign: 'left', font: 'inherit', fontSize: 13, color: 'var(--ink)',
};

const tdStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12 };
const selectInputStyle: React.CSSProperties = { border: '1px solid var(--line)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontFamily: 'inherit', background: '#fff' };
const inputStyle: React.CSSProperties = { border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)' };
const modalStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,.15)', width: '90%', maxWidth: 440, padding: 24 };

const mobileCardStyle: React.CSSProperties = {
  border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', background: '#fff',
};
const mobileSelectStyle: React.CSSProperties = {
  border: '1px solid var(--line)', borderRadius: 6, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', background: '#fff', width: '100%', minHeight: 44, boxSizing: 'border-box',
};
