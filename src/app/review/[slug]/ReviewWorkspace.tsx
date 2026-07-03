'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { StatusPill } from '@/components/StatusPill';
import type { ActivityItem, Comment, ContentItem, ContentStatus, Visibility } from '@/lib/types';
import type { ReviewDecision, ReviewRecord } from '@/lib/review-store';
import { deriveStatus } from '@/lib/review-store';

const navItems = [
  { href: '/calendar', label: 'Content Calendar' },
  { href: '/review/content-scaling-mistakes', label: 'Client Reviews', active: true },
  { href: '/calendar', label: 'Approved Outputs' },
  { href: '/internal/review-queue', label: 'Internal Queue' },
  { href: '/editor/tasks', label: 'Editor Tasks' },
];

const visibilityOptions: Visibility[] = ['Client-visible', 'CCA internal only', 'Editor-visible amendment'];

type Decision = ReviewDecision;

type ReviewApiRecord = ReviewRecord;

interface ReviewWorkspaceProps {
  item: ContentItem;
}

export function ReviewWorkspace({ item }: ReviewWorkspaceProps) {
  const [comments, setComments] = useState<Comment[]>(item.comments);
  const [commentBody, setCommentBody] = useState('');
  const [timestamp, setTimestamp] = useState('00:42');
  const [visibility, setVisibility] = useState<Visibility>('Client-visible');
  const [decision, setDecision] = useState<Decision>('pending');
  const [activity, setActivity] = useState<ActivityItem[]>(item.activity);
  const [currentStatus, setCurrentStatus] = useState<ContentStatus>(item.status);
  const [activeTab, setActiveTab] = useState<'comments' | 'approval' | 'activity'>('comments');

  const clientVisibleComments = useMemo(() => comments.filter((comment) => comment.visibility === 'Client-visible').length, [comments]);
  const [apiLoading, setApiLoading] = useState(false);

  function applyRecord(record: ReviewApiRecord) {
    setComments(record.comments);
    setActivity(record.activity);
    setDecision(record.decision);
    setCurrentStatus(record.status);
  }

  useEffect(() => {
    let ignore = false;
    fetch(`/api/reviews/${item.slug}`)
      .then((response) => response.ok ? response.json() : null)
      .then((record: ReviewApiRecord | null) => {
        if (!ignore && record) applyRecord(record);
      })
      .catch(() => undefined);
    return () => { ignore = true; };
  }, [item.slug]);

  async function addComment() {
    if (!commentBody.trim() || apiLoading) return;
    const pendingBody = commentBody.trim();
    setCommentBody('');
    setApiLoading(true);
    setActiveTab('comments');
    const response = await fetch(`/api/reviews/${item.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_comment', body: pendingBody, timestamp: timestamp.trim() || '00:00', visibility }),
    });
    if (response.ok) applyRecord(await response.json() as ReviewApiRecord);
    setApiLoading(false);
  }

  async function approveVideo() {
    setApiLoading(true);
    const response = await fetch(`/api/reviews/${item.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_decision', decision: 'approved' }),
    });
    if (response.ok) applyRecord(await response.json() as ReviewApiRecord);
    else {
      setDecision('approved');
      setCurrentStatus(deriveStatus('approved', item.status));
    }
    setApiLoading(false);
    setActiveTab('approval');
  }

  async function requestAmendments() {
    setApiLoading(true);
    const response = await fetch(`/api/reviews/${item.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_decision', decision: 'amendments_requested' }),
    });
    if (response.ok) applyRecord(await response.json() as ReviewApiRecord);
    else {
      setDecision('amendments_requested');
      setCurrentStatus(deriveStatus('amendments_requested', item.status));
    }
    setApiLoading(false);
    setActiveTab('approval');
  }

  return (
    <AppShell
      sectionLabel="Workspace"
      navItems={navItems}
      sideTitle="Functional MVP"
      sideCopy="This version now has API-backed mock behavior: add timestamp comments, approve, request amendments, and update the visible status."
    >
      <div className="topbar">
        <div className="crumb">Clients / <b>Munif Isa</b> / January 2026 / Video Review</div>
        <div className="top-actions"><Button>Copy review link</Button><Button variant="primary">Open Drive file</Button></div>
      </div>
      <section className="review-layout">
        <div className="panel">
          <div className="header">
            <div>
              <h1>{item.title}</h1>
              <div className="meta">
                <StatusPill label={currentStatus} />
                <span className="pill">Posting: Jan 12, 2026</span>
                <span className="pill">{clientVisibleComments} client-visible comments</span>
              </div>
            </div>
            <span className={`decision-badge ${decision === 'amendments_requested' ? 'amendments' : decision}`}>{decision === 'pending' ? 'Awaiting decision' : decision === 'approved' ? 'Approved' : 'Amendments requested'}</span>
          </div>
          <div className="video-wrap">
            <div className="drive-video" aria-label="Google Drive embed placeholder">
              <div className="timeline"><span /></div>
              <div className="marker m1" /><div className="marker m2" /><div className="marker m3" />
              <button className="play" type="button" onClick={() => setTimestamp('00:42')}><span>▶</span></button>
              <div className="video-caption"><small>Google Drive embed-ready preview</small><strong>{timestamp} / {item.duration}</strong></div>
            </div>
          </div>
          <div className="quick-timestamps">
            {['00:18', '00:42', '01:12'].map((time) => <button className={timestamp === time ? 'active' : ''} key={time} onClick={() => setTimestamp(time)} type="button">Use {time}</button>)}
          </div>
          <div className="content-body">
            <div className="field"><label>Client</label><p>Munif Isa / Sixma</p></div>
            <div className="field"><label>Assigned editor</label><p>{item.editor}</p></div>
            <div className="field"><label>Content category</label><p>{item.category}</p></div>
            <div className="field"><label>Status after approval</label><p>Pending Hook & Caption → Ready to Post</p></div>
            <div className="field wide"><label>Content brief</label><p>{item.brief}</p></div>
            <div className="field wide"><label>Hook / Caption</label><p><b>Hook:</b> {item.hook}. <br /><b>Caption:</b> {item.caption}</p></div>
          </div>
        </div>
        <div className="panel">
          <div className="tabs">
            <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Comments</button>
            <button className={`tab ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => setActiveTab('approval')}>Approval</button>
            <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
          </div>
          {activeTab === 'comments' ? (
            <>
              <div className="comment-list">
                {comments.map((comment) => (
                  <div className={`comment ${comment.visibility === 'CCA internal only' ? 'internal' : ''}`} key={comment.id}>
                    <div className="comment-head">
                      <div className="who"><div className="avatar">{comment.initials}</div><div><strong>{comment.author}</strong><small>{comment.role} · {comment.createdAt}</small></div></div>
                      <button className="timecode" type="button" onClick={() => setTimestamp(comment.timestamp)}>{comment.timestamp}</button>
                    </div>
                    <p>{comment.body}</p>
                    <div className="visibility">{comment.visibility === 'CCA internal only' ? '🔒' : comment.visibility === 'Editor-visible amendment' ? '🛠️' : '👁'} {comment.visibility}</div>
                  </div>
                ))}
              </div>
              <div className="composer">
                <div className="composer-grid">
                  <input className="select" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} aria-label="Timestamp" />
                  <select className="select" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>{visibilityOptions.map((option) => <option key={option}>{option}</option>)}</select>
                </div>
                <textarea placeholder="Write a timestamped comment…" value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
                <div className="composer-row"><small>Comment will be attached to {timestamp}</small><Button variant="primary" onClick={addComment}>Add comment</Button></div>
              </div>
            </>
          ) : null}
          {activeTab === 'approval' ? (
            <div className="approval-state">
              <h2>Approval decision</h2>
              <p>Current state: <b>{decision === 'pending' ? 'Waiting for client decision' : decision === 'approved' ? 'Approved by client' : 'Amendments requested by client'}</b></p>
              <p>Next operational status: <b>{currentStatus}</b></p>
              <div className="decision"><Button variant="danger" onClick={requestAmendments} disabled={apiLoading}>Request amendments</Button><Button variant="green" onClick={approveVideo} disabled={apiLoading}>Approve video</Button></div>
            </div>
          ) : null}
          {activeTab === 'activity' ? (
            <div className="activity padless">
              {activity.map((event) => <div className="event" key={event.id}><div className="icon">{event.icon}</div><div><p>{event.text}</p><small>{event.time}</small></div></div>)}
            </div>
          ) : null}
          {activeTab !== 'approval' ? <div className="decision"><Button variant="danger" onClick={requestAmendments}>Request amendments</Button><Button variant="green" onClick={approveVideo}>Approve video</Button></div> : null}
        </div>
        <div className="panel pad">
          <div className="activity">
            <h2>Approval trail</h2>
            {activity.map((event) => <div className="event" key={event.id}><div className="icon">{event.icon}</div><div><p>{event.text}</p><small>{event.time}</small></div></div>)}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export function ReviewNotFound() {
  return (
    <main className="not-found">
      <section className="panel">
        <h1>Review not found</h1>
        <p>This mock review does not exist yet.</p>
        <Link className="btn primary" href="/calendar">Back to calendar</Link>
      </section>
    </main>
  );
}
