import { NextResponse } from 'next/server';
import { addReviewComment, getReview, setReviewDecision } from '@/lib/review-store';
import type { Visibility } from '@/lib/types';

const visibilityValues: Visibility[] = ['Client-visible', 'CCA internal only', 'Editor-visible amendment'];

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const record = getReview(slug);
  if (!record) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json(record);
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null) as null | { action?: string; body?: string; timestamp?: string; visibility?: Visibility; decision?: 'approved' | 'amendments_requested' };
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  if (body.action === 'add_comment') {
    if (!body.body?.trim()) return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
    if (!body.visibility || !visibilityValues.includes(body.visibility)) return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    const record = addReviewComment(slug, { body: body.body.trim(), timestamp: body.timestamp || '00:00', visibility: body.visibility });
    if (!record) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    return NextResponse.json(record);
  }

  if (body.action === 'set_decision') {
    if (body.decision !== 'approved' && body.decision !== 'amendments_requested') return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    const record = setReviewDecision(slug, body.decision);
    if (!record) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    return NextResponse.json(record);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
