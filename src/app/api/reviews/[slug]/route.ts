import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canReview, canReviewComment, canApproveReview, amendmentCountAfterDecision } from '@/lib/review-security';

const EDITOR_ROLE = 'editor';
const CLIENT_ROLE = 'client';
const VISIBILITIES = ['client_visible', 'internal', 'editor_visible_amendment'] as const;
type Visibility = typeof VISIBILITIES[number];
type Decision = 'approved' | 'amendments_requested';
type Supabase = any;
type Profile = { id: string; name: string; role: string; client_id: string | null };
type Task = { id: string; client_name: string | null; content_title: string | null; video_editor: string | null; deadline: string | null; status: string | null; content_ref: string | null };

type RouteContext = { params: Promise<{ slug: string }> };

function dbVisibility(value: unknown): Visibility | null {
  if (value === 'Client-visible') return 'client_visible';
  if (value === 'CCA internal only') return 'internal';
  if (value === 'Editor-visible amendment') return 'editor_visible_amendment';
  return VISIBILITIES.includes(value as Visibility) ? value as Visibility : null;
}

function apiVisibility(value: string): string {
  return value === 'client_visible' ? 'Client-visible' : value === 'editor_visible_amendment' ? 'Editor-visible amendment' : 'CCA internal only';
}

function timestampSeconds(text: string): number {
  const value = text.trim() || '00:00';
  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0) || parts.length > 3) throw new Error('Timestamp must be MM:SS or HH:MM:SS');
  const seconds = parts.length === 1 ? parts[0] : parts.reduce((total, part) => total * 60 + part, 0);
  if (seconds > 24 * 60 * 60) throw new Error('Timestamp is out of range');
  return seconds;
}

function slugify(value: string | null): string {
  return (value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function auth(request: NextRequest) {
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  let { data: profile } = await sb.from('profiles').select('id,name,role,client_id').eq('id', user.id).maybeSingle();
  if (!profile) profile = (await sb.from('profiles').select('id,name,role,client_id').eq('email', user.email).maybeSingle()).data;
  if (!profile?.role) return null;
  return { sb, user, profile: profile as Profile };
}

async function findTask(sb: Supabase, slug: string): Promise<Task | null> {
  const query = await sb.from('project_tasks').select('id,client_name,content_title,video_editor,deadline,status,content_ref').limit(2000);
  if (query.error) throw query.error;
  return (query.data || []).find((task: Task) => task.id === slug || task.content_ref === slug || slugify(task.content_title) === slug) || null;
}


async function clientName(sb: Supabase, profile: Profile): Promise<string | null> {
  if (!profile.client_id) return null;
  const result = await sb.from('clients').select('name').eq('id', profile.client_id).maybeSingle();
  return result.data?.name || null;
}

function allowedToView(profile: Profile, task: Task, client: string | null): boolean {
  return canReview(profile.role,
    profile.role === EDITOR_ROLE && (task.video_editor || '').trim().toLowerCase() === (profile.name || '').trim().toLowerCase(),
    profile.role === CLIENT_ROLE && Boolean(client && task.client_name === client));
}

function allowedVisibility(role: string, visibility: Visibility): boolean {
  return canReviewComment(role, visibility, true, true);
}

async function reviewFor(sb: Supabase, task: Task) {
  let result = await sb.from('review_records').select('*').eq('task_id', task.id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) {
    const created = await sb.from('review_records').insert({ task_id: task.id, slug: task.content_ref || slugify(task.content_title), status: task.status || 'Client Review' }).select('*').single();
    if (created.error) throw created.error;
    result = created;
  }
  return result.data;
}

function publicRecord(task: Task, review: any, comments: any[], decisions: any[]) {
  return {
    item: { id: task.id, slug: review.slug || task.content_ref || slugify(task.content_title), title: task.content_title || 'Untitled content', clientId: task.client_name || '', category: 'Video', postDate: task.deadline || '', status: review.status, tags: [], editor: task.video_editor || undefined, brief: '', comments: [], activity: [] },
    reviewId: review.id,
    taskId: task.id,
    comments: comments.map((comment) => ({ id: comment.id, author: comment.author_name, role: comment.author_role === 'client' ? 'Client' : comment.author_role === 'editor' ? 'Editor' : 'Internal', initials: (comment.author_name || '?').split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(), timestamp: comment.timestamp_text, timestampSeconds: comment.timestamp_seconds, createdAt: comment.created_at, body: comment.body, visibility: apiVisibility(comment.visibility), authorProfileId: comment.author_profile_id, taskId: comment.task_id, reviewId: comment.review_id })),
    activity: decisions.map((decision) => ({ id: decision.id, icon: decision.decision === 'approved' ? '✅' : '🛠️', text: decision.decision, time: decision.created_at })),
    decision: review.decision || 'pending',
    status: review.status,
    clientAmendmentTokensUsed: review.client_amendment_count || 0,
  };
}

async function loadRecord(sb: Supabase, profile: Profile, task: Task, client: string | null) {
  const review = await reviewFor(sb, task);
  const commentsQuery = await sb.from('review_comments').select('*').eq('review_id', review.id).order('created_at', { ascending: false });
  if (commentsQuery.error) throw commentsQuery.error;
  const comments = profile.role === CLIENT_ROLE ? (commentsQuery.data || []).filter((comment: any) => comment.visibility === 'client_visible') : commentsQuery.data || [];
  const decisions = (await sb.from('review_decisions').select('*').eq('review_id', review.id).order('created_at', { ascending: false })).data || [];
  return publicRecord(task, review, comments, decisions);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await auth(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await context.params;
  try {
    const task = await findTask(actor.sb, slug);
    if (!task) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    const client = await clientName(actor.sb, actor.profile);
    if (!allowedToView(actor.profile, task, client)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(await loadRecord(actor.sb, actor.profile, task, client));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Review persistence unavailable', migration: 'not-applied' }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const actor = await auth(request);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { slug } = await context.params;
  const body = await request.json().catch(() => null) as any;
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  try {
    const task = await findTask(actor.sb, slug);
    if (!task) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    const client = await clientName(actor.sb, actor.profile);
    if (!allowedToView(actor.profile, task, client)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const review = await reviewFor(actor.sb, task);

    if (body.action === 'add_comment') {
      if (!body.body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
      const visibility = dbVisibility(body.visibility);
      if (!visibility || !allowedVisibility(actor.profile.role, visibility)) return NextResponse.json({ error: 'Invalid or unauthorized visibility' }, { status: 403 });
      const text = String(body.timestamp || '00:00');
      const seconds = timestampSeconds(text);
      const inserted = await actor.sb.from('review_comments').insert({ review_id: review.id, task_id: task.id, author_profile_id: actor.profile.id, author_name: actor.profile.name || actor.user.email, author_role: actor.profile.role, timestamp_text: text, timestamp_seconds: seconds, body: body.body.trim(), visibility }).select('*').single();
      if (inserted.error) throw inserted.error;
    } else if (body.action === 'set_decision') {
      const decision = body.decision as Decision;
      if (decision !== 'approved' && decision !== 'amendments_requested') return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
      if (!canApproveReview(actor.profile.role, actor.profile.role === CLIENT_ROLE)) return NextResponse.json({ error: 'This role cannot approve reviews' }, { status: 403 });
      if (actor.profile.role === CLIENT_ROLE && task.status && task.status !== 'Client Review' && task.status !== 'Client Amendment') return NextResponse.json({ error: 'This task is not awaiting client decision' }, { status: 403 });
      const update: Record<string, unknown> = { decision, updated_at: new Date().toISOString() };
      if (decision === 'amendments_requested') {
        try { update.client_amendment_count = amendmentCountAfterDecision(review.client_amendment_count || 0, decision); }
        catch { return NextResponse.json({ error: 'Client amendment limit reached (3 of 3 used)' }, { status: 409 }); }
      }
      const updateQuery = actor.profile.role === CLIENT_ROLE && decision === 'amendments_requested'
        ? actor.sb.from('review_records').update(update).eq('id', review.id).lt('client_amendment_count', 3)
        : actor.sb.from('review_records').update(update).eq('id', review.id);
      const updated = await updateQuery.select('*').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) return NextResponse.json({ error: 'Client amendment limit reached (3 of 3 used)' }, { status: 409 });
      await actor.sb.from('review_decisions').insert({ review_id: review.id, task_id: task.id, actor_profile_id: actor.profile.id, actor_role: actor.profile.role, decision });
    } else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    return NextResponse.json(await loadRecord(actor.sb, actor.profile, task, client));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Review action failed' }, { status: 503 });
  }
}
