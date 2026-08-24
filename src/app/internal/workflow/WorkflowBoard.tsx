'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import type { WorkflowRecord, WorkflowState } from '@/lib/workflow-store';

const states: WorkflowState[] = ['Assigned', 'Editing', 'Submitted for Review', 'Amendment', 'Manager Approved', 'Client Review', 'Client Amendment', 'Approved for Posting', 'Done'];
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const sortOptions = [
  ['deadline-asc', 'Deadline (earliest)'],
  ['deadline-desc', 'Deadline (latest)'],
  ['title-asc', 'Title (A–Z)'],
  ['client-asc', 'Client (A–Z)'],
  ['state-asc', 'State (A–Z)'],
] as const;

type SortKey = (typeof sortOptions)[number][0];

function fmtDate(value: string | null | undefined) {
  const raw = (value || '').slice(0, 10);
  if (!raw) return 'Not set';
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}-${month}-${year}` : value || 'Not set';
}

function nextFor(role: string, state: WorkflowState): WorkflowState[] {
  if (role === 'editor') return state === 'Assigned' ? ['Editing'] : state === 'Editing' || state === 'Amendment' || state === 'Client Amendment' ? ['Submitted for Review'] : [];
  if (role === 'client') return state === 'Client Review' ? ['Client Amendment', 'Approved for Posting'] : [];
  return state === 'Submitted for Review' ? ['Amendment', 'Manager Approved'] : state === 'Manager Approved' ? ['Client Review'] : state === 'Approved for Posting' ? ['Done'] : [];
}

function compareRecords(a: WorkflowRecord, b: WorkflowRecord, sort: SortKey) {
  const direction = sort.endsWith('desc') ? -1 : 1;
  const left = sort.startsWith('deadline') ? (a.deadline || '9999-12-31') : sort.startsWith('client') ? a.clientName : sort.startsWith('state') ? a.state : a.title;
  const right = sort.startsWith('deadline') ? (b.deadline || '9999-12-31') : sort.startsWith('client') ? b.clientName : sort.startsWith('state') ? b.state : b.title;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }) * direction;
}

export default function WorkflowBoard({ mode = 'manager' }: { mode?: 'manager' | 'editor' | 'client' }) {
  const [records, setRecords] = useState<WorkflowRecord[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('all');
  const [year, setYear] = useState('all');
  const [state, setState] = useState('all');
  const [client, setClient] = useState('all');
  const [sort, setSort] = useState<SortKey>('deadline-asc');
  const [groupByClient, setGroupByClient] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const role = mode === 'editor' ? 'editor' : mode === 'client' ? 'client' : 'manager';

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/workflow');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load workflow');
      setRecords(json.records || []);
      setMetrics(json.metrics);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workflow');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const years = useMemo(() => Array.from(new Set(records.map(record => record.deadline?.slice(0, 4)).filter(Boolean))).sort().reverse() as string[], [records]);
  const clients = useMemo(() => Array.from(new Set(records.map(record => record.clientName))).sort((a, b) => a.localeCompare(b)), [records]);
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter(record => {
      const deadline = record.deadline?.slice(0, 10) || '';
      const matchesQuery = !normalizedQuery || [record.title, record.clientName, record.editorName, record.state].some(value => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (month === 'all' || deadline.slice(5, 7) === month) && (year === 'all' || deadline.slice(0, 4) === year) && (state === 'all' || record.state === state) && (client === 'all' || record.clientName === client);
    }).sort((a, b) => compareRecords(a, b, sort));
  }, [records, query, month, year, state, client, sort]);
  const groups = useMemo(() => filteredRecords.reduce<Record<string, WorkflowRecord[]>>((result, record) => { (result[record.clientName] ||= []).push(record); return result; }, {}), [filteredRecords]);
  const current = filteredRecords.find(record => record.taskId === selected) || filteredRecords[0];

  async function act(taskId: string, payload: any) {
    setError('');
    try {
      const response = await fetch('/api/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, ...payload }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Action failed');
      await load();
      setSelected(taskId);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Action failed'); }
  }

  const title = mode === 'client' ? 'Client Reviews' : mode === 'editor' ? 'Editor Workflow' : 'Manager Workflow';
  const resetFilters = () => { setQuery(''); setMonth('all'); setYear('all'); setState('all'); setClient('all'); };

  return <AppShell sectionLabel={mode === 'client' ? 'Client Portal' : 'Internal Ops'} sideTitle={title} sideCopy="One workflow from assignment to posting. External integrations report pending/unconfigured instead of claiming success.">
    <div className="topbar"><div className="crumb">Workflow / <b>{title}</b></div><Link className="btn small outline" href="/internal/workflow">Process guide</Link></div>
    {error && <div role="alert" style={{ background: '#fff1f0', color: '#b42318', padding: 10, borderRadius: 8, marginBottom: 12 }}>{error}</div>}
    {metrics && <div className="review-metrics">{[['Tasks', metrics.total], ['Amendments', metrics.amendments], ['Editor completed', metrics.editorCompleted], ['Early', metrics.early], ['Deadline day', metrics.deadlineDay], ['Late', metrics.late]].map(([label, value]) => <div key={String(label)} className="panel review-metric"><b>{value}</b><div>{label}</div></div>)}</div>}
    <section className="review-queue" aria-label="Review queue">
      <div className="review-toolbar">
        <input className="review-search" aria-label="Search workflow" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, client, editor…" />
        <select aria-label="Filter by month" value={month} onChange={event => setMonth(event.target.value)}><option value="all">All months</option>{months.map(value => <option key={value} value={value}>{new Date(2000, Number(value) - 1, 1).toLocaleString('en', { month: 'long' })}</option>)}</select>
        <select aria-label="Filter by year" value={year} onChange={event => setYear(event.target.value)}><option value="all">All years</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter by state" value={state} onChange={event => setState(event.target.value)}><option value="all">All states</option>{states.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter by client" value={client} onChange={event => setClient(event.target.value)}><option value="all">All clients</option>{clients.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Sort workflow" value={sort} onChange={event => setSort(event.target.value as SortKey)}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="btn small outline" onClick={() => setGroupByClient(value => !value)}>{groupByClient ? 'Grouped by client' : 'Group by client'}</button>
        {(query || month !== 'all' || year !== 'all' || state !== 'all' || client !== 'all') && <button className="btn small ghost" onClick={resetFilters}>Clear filters</button>}
      </div>
      <div className="review-count">{filteredRecords.length} of {records.length} workflow {records.length === 1 ? 'item' : 'items'}</div>
      <div className="review-panes">
        <div className="panel review-list-pane"><div className="review-pane-heading"><b>Content pipeline</b><span>{loading ? 'Loading…' : 'Select an item'}</span></div>
          {loading ? <div className="review-state">Loading workflow items…</div> : records.length === 0 ? <div className="review-state">No mirrored project tasks found.</div> : filteredRecords.length === 0 ? <div className="review-state">No items match these filters.<button className="btn small outline" onClick={resetFilters}>Clear filters</button></div> : groupByClient ? Object.entries(groups).map(([group, items]) => <div className="review-group" key={group}><button className="review-group-heading" onClick={() => setOpenGroups(currentOpen => ({ ...currentOpen, [group]: !(currentOpen[group] ?? true) }))} aria-expanded={openGroups[group] ?? true}><span>{openGroups[group] === false ? '▸' : '▾'} {group}</span><span>{items.length}</span></button>{(openGroups[group] ?? true) && items.map(record => <QueueItem key={record.taskId} record={record} selected={current?.taskId === record.taskId} onSelect={() => setSelected(record.taskId)} />)}</div>) : filteredRecords.map(record => <QueueItem key={record.taskId} record={record} selected={current?.taskId === record.taskId} onSelect={() => setSelected(record.taskId)} />)}
        </div>
        <div className="review-detail-pane">{current ? <Detail record={current} role={role} draft={draft} setDraft={setDraft} act={act} /> : <div className="panel review-state">Select content to manage its workflow.</div>}</div>
      </div>
    </section>
  </AppShell>;
}

function QueueItem({ record: r, selected, onSelect }: { record: WorkflowRecord; selected: boolean; onSelect: () => void }) {
  return <button className={`review-item${selected ? ' selected' : ''}`} onClick={onSelect}><b>{r.title}</b><span>{r.editorName || 'Unassigned'} · Due {fmtDate(r.deadline)}</span><em>{r.state}</em></button>;
}

function Detail({ record: r, role, draft, setDraft, act }: { record: WorkflowRecord; role: string; draft: Record<string, string>; setDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>; act: (id: string, payload: any) => Promise<void> }) {
  const set = (key: string, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const next = nextFor(role, r.state);
  return <div className="panel review-detail"><h1>{r.title}</h1><p className="review-detail-meta">{r.clientName} · Editor: {r.editorName || 'Unassigned'} · Deadline: {fmtDate(r.deadline)}</p>
    <div className="review-states">{states.map((status, index) => <span key={status} className={status === r.state ? 'current' : index < states.indexOf(r.state) ? 'complete' : ''}>{status}</span>)}</div>
    {role === 'manager' && <><label style={label}>Assign editor<input style={input} value={draft.editorName ?? r.editorName} onChange={e => set('editorName', e.target.value)} placeholder="Editor name" /></label><label style={label}>Deadline<input style={input} type="date" value={draft.deadline ?? (r.deadline || '').slice(0, 10)} onChange={e => set('deadline', e.target.value)} /></label><button className="btn small" onClick={() => act(r.taskId, { action: 'assign', editorName: draft.editorName ?? r.editorName, deadline: draft.deadline ?? r.deadline })}>Save assignment</button></>}
    {(role === 'editor' || role === 'manager') && <label style={label}>Output video link<input style={input} type="url" value={draft.outputVideoUrl ?? r.outputVideoUrl} onChange={e => set('outputVideoUrl', e.target.value)} placeholder="https://drive.google.com/..." /></label>}
    {role === 'manager' && <><label style={label}>Hook<input style={input} value={draft.hook ?? r.hook} onChange={e => set('hook', e.target.value)} /></label><label style={label}>Caption<textarea style={input} value={draft.caption ?? r.caption} onChange={e => set('caption', e.target.value)} /></label></>}
    {(role === 'manager' || role === 'editor' || role === 'client') && <><label style={label}>Comment<textarea style={input} value={draft.body || ''} onChange={e => set('body', e.target.value)} placeholder="Add context or amendment notes" /></label><button className="btn small outline" onClick={() => { act(r.taskId, { action: 'comment', body: draft.body, visibility: role === 'client' ? 'client' : 'internal' }); set('body', ''); }}>Add comment</button></>}
    {role === 'client' && <div style={{ margin: '14px 0', padding: 10, borderRadius: 8, background: '#f7f8fa' }}><b>{3 - r.clientAmendmentTokensUsed} comment rounds remaining</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>Client amendment requests are capped at exactly three.</div></div>}
    <div className="review-actions">{next.map(status => <button key={status} className={`btn small ${status.includes('Amendment') ? 'outline' : ''}`} onClick={() => act(r.taskId, { state: status, outputVideoUrl: draft.outputVideoUrl ?? r.outputVideoUrl, hook: draft.hook ?? r.hook, caption: draft.caption ?? r.caption })}>{status === 'Client Amendment' ? 'Request amendment' : status}</button>)}{role === 'manager' && r.state === 'Client Review' && <button className="btn small outline" onClick={() => act(r.taskId, { action: 'notify_client' })}>Notify client</button>}{role === 'manager' && r.state === 'Approved for Posting' && <button className="btn small" onClick={() => act(r.taskId, { action: 'sync_posting', state: 'Done' })}>Mark Done + sync</button>}</div>
    {r.outputVideoUrl && <p className="review-video">Video: <a href={r.outputVideoUrl} target="_blank" rel="noreferrer">Open output</a></p>}<h3>Comments &amp; history</h3>{r.comments.map(comment => <div className="review-comment" key={comment.id}><b>{comment.authorName}</b> <span>{comment.authorRole}</span><div>{comment.body}</div></div>)}{r.integrations.map((integration, index) => <div className="review-integration" key={index}>🔌 {integration.integration}: <b>{integration.status}</b> — {integration.detail}</div>)}
  </div>;
}

const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: '10px 0' };
const input: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4, padding: 9, border: '1px solid var(--line)', borderRadius: 7, fontFamily: 'inherit' };
