'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { StatusPill } from '@/components/StatusPill';
import { useAuth } from '@/lib/auth-context';
import type { WorkflowComment, WorkflowRecord, WorkflowState } from '@/lib/workflow-store';

const visibilityOptions = ['all', 'client', 'internal'] as const;
type VisibilityFilter = typeof visibilityOptions[number];

/** Convert only the supported Google Drive sharing URL shapes to a safe preview URL. */
export function drivePreviewUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['drive.google.com', 'www.drive.google.com'].includes(url.hostname)) return null;
    let id = url.pathname.match(/^\/file\/d\/([^/]+)(?:\/|$)/)?.[1] || null;
    if (!id && url.pathname === '/open') id = url.searchParams.get('id');
    if (!id) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
    return `https://drive.google.com/file/d/${id}/preview`;
  } catch { return null; }
}

function validTimestamp(value: string) {
  const match = value.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  return Boolean(match);
}

function timestampSeconds(value: string) {
  const [minutes, seconds] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}

function displayDate(value: string | null | undefined) {
  if (!value) return 'No deadline set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function commentVisibility(comment: WorkflowComment) {
  return comment.visibility === 'client' || comment.visibility === 'client_visible' ? 'Client-visible' : 'CCA internal only';
}

export function ReviewWorkspace({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [record, setRecord] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [timestamp, setTimestamp] = useState('00:00');
  const [timestampError, setTimestampError] = useState('');
  const [filter, setFilter] = useState<VisibilityFilter>(user?.role === 'client' ? 'client' : 'all');
  const [visibility, setVisibility] = useState(user?.role === 'client' ? 'client' : 'internal');
  const [activeTab, setActiveTab] = useState<'comments' | 'approval' | 'activity'>('comments');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/workflow');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to load this review');
      const found = (json.records as WorkflowRecord[]).find(item => item.taskId === taskId);
      if (!found) throw new Error('This review is not available to your account.');
      setRecord(found); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load this review'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [taskId]);
  useEffect(() => { if (user?.role === 'client') { setFilter('client'); setVisibility('client'); } }, [user?.role]);

  const previewUrl = drivePreviewUrl(record?.outputVideoUrl);
  const comments = useMemo(() => (record?.comments || []).filter(comment => filter === 'all' || (filter === 'client' ? commentVisibility(comment) === 'Client-visible' : commentVisibility(comment) !== 'Client-visible')), [record, filter]);
  const quickTimestamps = useMemo(() => Array.from(new Set(['00:00', '00:15', '00:30', '01:00', ...(record?.comments || []).map(comment => comment.timestamp || '')].filter(Boolean))).slice(0, 6), [record]);

  function chooseTimestamp(value: string) {
    if (!validTimestamp(value)) { setTimestampError('Use mm:ss, with seconds from 00 to 59.'); return; }
    setTimestamp(value.padStart(5, '0')); setTimestampError('');
    // Drive is cross-origin, so the parent cannot seek its player. Keep the control
    // explicit and focus the embed so the reviewer can seek with Drive's controls.
    document.querySelector<HTMLIFrameElement>('.review-drive-frame')?.focus();
  }

  async function act(payload: Record<string, string>) {
    if (!record || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, ...payload }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Action failed');
      setRecord(json.record as WorkflowRecord);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action failed'); }
    finally { setSaving(false); }
  }

  async function addComment() {
    if (!body.trim()) return;
    if (!validTimestamp(timestamp)) { setTimestampError('Use mm:ss, with seconds from 00 to 59.'); return; }
    await act({ action: 'comment', body: body.trim(), visibility, timestamp });
    setBody('');
  }

  if (loading) return <AppShell sectionLabel="Review" sideTitle="Video review" sideCopy="Loading review data…"><div className="review-empty-state panel">Loading review…</div></AppShell>;
  if (!record) return <ReviewNotFound message={error || 'Review not found'} />;
  const isClient = user?.role === 'client';
  const decisionLabel = record.state === 'Approved for Posting' ? 'Approved for posting' : record.state === 'Client Amendment' || record.state === 'Amendment' ? 'Amendments requested' : 'Awaiting decision';
  const nextActions = isClient ? (record.state === 'Client Review' ? [{ label: 'Request amendment', state: 'Client Amendment' }, { label: 'Approve video', state: 'Approved for Posting' }] : []) : record.state === 'Submitted for Review' ? [{ label: 'Request amendments', state: 'Amendment' }, { label: 'Approve video', state: 'Manager Approved' }] : [];

  return <AppShell sectionLabel={isClient ? 'Client Portal' : 'Internal Ops'} sideTitle="Video review" sideCopy="Review the Drive preview, leave timestamped notes, and record a decision." navItems={[{ href: '/client/reviews', label: 'Client Reviews', active: isClient }, { href: '/internal/review-queue', label: 'Review Queue', active: !isClient }]}>
    <div className="topbar"><div className="crumb">Reviews / <b>{record.clientName}</b> / {record.title}</div>{previewUrl && <a className="btn small outline" href={record.outputVideoUrl} target="_blank" rel="noreferrer">Open Drive file</a>}</div>
    {error && <div className="review-error" role="alert">{error}</div>}
    <section className="video-review-layout">
      <div className="panel video-review-main">
        <div className="review-heading"><div><h1>{record.title}</h1><div className="review-meta"><StatusPill label={record.state} /><span>{record.clientName}</span><span>Deadline: {displayDate(record.deadline)}</span></div></div><span className={`decision-badge ${decisionLabel.includes('Approved') ? 'approved' : decisionLabel.includes('Amend') ? 'amendments' : ''}`}>{decisionLabel}</span></div>
        <div className="drive-player" aria-label={previewUrl ? 'Google Drive video preview' : 'Video preview unavailable'}>{previewUrl ? <iframe className="review-drive-frame" title={`Video preview: ${record.title}`} src={previewUrl} allow="autoplay; fullscreen" allowFullScreen /> : <div className="review-video-empty"><strong>Video preview unavailable</strong><span>The editor has not added a valid Google Drive output link yet.</span></div>}</div>
        <div className="timestamp-help"><strong>Timestamped review</strong><span>Enter the point you want to discuss. Drive preview controls handle playback and seeking; its cross-origin player does not expose the current time to this page.</span></div>
        <div className="quick-timestamps">{quickTimestamps.map(time => <button type="button" key={time} className={timestamp === time ? 'active' : ''} onClick={() => chooseTimestamp(time)}>Use {time}</button>)}</div>
        <dl className="review-details"><div><dt>Client</dt><dd>{record.clientName}</dd></div><div><dt>Assigned editor</dt><dd>{record.editorName || 'Not assigned'}</dd></div><div><dt>Hook</dt><dd>{record.hook || 'Not provided'}</dd></div><div><dt>Caption</dt><dd>{record.caption || 'Not provided'}</dd></div></dl>
      </div>
      <aside className="panel video-review-sidebar">
        <div className="review-tabs">{(['comments', 'approval', 'activity'] as const).map(tab => <button type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} key={tab}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
        {activeTab === 'comments' && <><div className="comment-filter"><label htmlFor="comment-filter">Show</label><select id="comment-filter" value={filter} onChange={event => setFilter(event.target.value as VisibilityFilter)}><option value="all">All comments</option><option value="client">Client-visible</option><option value="internal">Internal</option></select></div><div className="comment-list">{comments.length ? comments.map(comment => <article className="review-comment" key={comment.id}><div className="comment-head"><div><strong>{comment.authorName}</strong><small>{comment.authorRole} · {displayDate(comment.createdAt)}</small></div><button type="button" className="timecode" onClick={() => chooseTimestamp(comment.timestamp || '00:00')}>{comment.timestamp || '00:00'}</button></div><p>{comment.body}</p><span className="visibility-label">{commentVisibility(comment)}</span></article>) : <div className="review-empty-state">No comments in this view yet.</div>}</div><div className="composer"><div className="composer-grid"><div><label htmlFor="review-timestamp">Timestamp</label><input id="review-timestamp" inputMode="numeric" value={timestamp} aria-invalid={Boolean(timestampError)} onChange={event => { setTimestamp(event.target.value); setTimestampError(''); }} onBlur={() => { if (!validTimestamp(timestamp)) setTimestampError('Use mm:ss, with seconds from 00 to 59.'); }} /><small>{timestampError || 'mm:ss'}</small></div><div><label htmlFor="review-visibility">Visibility</label><select id="review-visibility" value={visibility} onChange={event => setVisibility(event.target.value)} disabled={isClient}><option value="client">Client-visible</option><option value="internal">CCA internal only</option></select></div></div><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Write a timestamped comment…" aria-label="Comment" /><div className="composer-row"><span>Attached to {timestamp || '00:00'}</span><Button variant="primary" onClick={addComment} disabled={saving || !body.trim()}>Add comment</Button></div></div></>}
        {activeTab === 'approval' && <div className="approval-state"><h2>Decision</h2><p>Current workflow state: <b>{record.state}</b></p><div className="decision">{nextActions.length ? nextActions.map(action => <Button key={action.state} variant={action.state.includes('Amendment') ? 'danger' : 'green'} onClick={() => act({ state: action.state })} disabled={saving}>{action.label}</Button>) : <span className="muted">No decision is available at this stage.</span>}</div></div>}
        {activeTab === 'activity' && <div className="activity padless">{record.events.length ? record.events.map(event => <div className="event" key={event.id}><div className="icon">{event.toState ? '↗' : '•'}</div><div><p>{event.actorName} moved this to {event.toState || event.eventType}</p><small>{displayDate(event.createdAt)}</small></div></div>) : <div className="review-empty-state">No activity recorded yet.</div>}</div>}
        {activeTab !== 'approval' && nextActions.length > 0 && <div className="decision"><Button variant="danger" onClick={() => act({ state: nextActions[0].state })} disabled={saving}>{nextActions[0].label}</Button><Button variant="green" onClick={() => act({ state: nextActions[1].state })} disabled={saving}>{nextActions[1].label}</Button></div>}
      </aside>
    </section>
  </AppShell>;
}

export function ReviewNotFound({ message = 'This review could not be found.' }: { message?: string }) {
  return <main className="not-found"><section className="panel"><h1>Review unavailable</h1><p>{message}</p><Link className="btn primary" href="/client/reviews">Back to reviews</Link></section></main>;
}

export { timestampSeconds };
