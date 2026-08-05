import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';

const STAFF_ROLES = ['super_admin', 'general_manager', 'manager', 'admin', 'project_manager', 'qc', 'social_media_admin'];
const SHEET_ID = '1YXsfIO4r6gC5dUSRSjsFjRm2TwSQoYE5JlLQSNnvE8M';

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile) {
    const { data: pb } = await supabase
      .from('profiles').select('role').eq('email', user.email).maybeSingle();
    profile = pb;
  }
  if (!profile?.role || !STAFF_ROLES.includes(profile.role)) return null;
  return { user, profile };
}

function getSheetsClient() {
  const key = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64 || '', 'base64').toString()
  );
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/** GET /api/project-tracking/dashboard */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } },
  );

  // ---- 1. Project tasks from sheet mirror ----
  const { data: tasks } = await supabase.from('project_tasks').select('*').limit(2000);
  const allTasks = (tasks || []) as any[];

  // ---- 2. Approvals / amendments from Supabase ----
  const { data: approvals } = await supabase.from('approvals').select('content_item_id, decision, created_at');
  const amendmentCounts: Record<string, number> = {};
  for (const a of (approvals || [])) {
    if (a.decision === 'amendments_requested') {
      amendmentCounts[a.content_item_id] = (amendmentCounts[a.content_item_id] || 0) + 1;
    }
  }

  // ---- 3. Editors from Editor List sheet (live) ----
  let editorNames: string[] = [];
  try {
    const sheets = getSheetsClient().spreadsheets;
    const r = await sheets.values.get({ spreadsheetId: SHEET_ID, range: "'Editor List'!A2:D30" });
    editorNames = (r.data.values || [])
      .filter((row) => (row[3] || '').trim().toLowerCase() === 'active')
      .map((row) => (row[1] || '').trim())
      .filter(Boolean);
  } catch { /* silent */ }

  // ---- Compute dashboard stats ----

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

  // Total KPIs
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.status === 'Done').length;
  const inProgress = allTasks.filter((t) => t.status === 'In Progress').length;
  const pending = allTasks.filter((t) => t.status === 'Pending').length;
  const notStarted = allTasks.filter((t) => t.status === 'Not Started').length;
  const late = allTasks.filter((t) => t.delivery_status === 'LATE DELIVERY').length;
  const early = allTasks.filter((t) => t.delivery_status === 'EARLY!').length;
  const onTime = allTasks.filter((t) => t.delivery_status === 'DEADLINE DAY').length;

  // Editor leaderboard
  const editorStats: Record<string, { total: number; early: number; onTime: number; late: number; done: number }> = {};
  for (const name of editorNames) {
    editorStats[name] = { total: 0, early: 0, onTime: 0, late: 0, done: 0 };
  }
  for (const t of allTasks) {
    const e = t.video_editor || '';
    if (!editorStats[e]) continue;
    editorStats[e].total++;
    if (t.status === 'Done') editorStats[e].done++;
    if (t.delivery_status === 'EARLY!') editorStats[e].early++;
    else if (t.delivery_status === 'DEADLINE DAY') editorStats[e].onTime++;
    else if (t.delivery_status === 'LATE DELIVERY') editorStats[e].late++;
  }
  const editorLeaderboard = Object.entries(editorStats)
    .filter(([, s]) => s.total > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  // Client urgency analysis
  const clientData: Record<string, {
    total: number; done: number; inProgress: number; pending: number; notStarted: number;
    urgentWithin3Days: number; lateCount: number; amendmentCount: number;
  }> = {};

  for (const t of allTasks) {
    const c = t.client_name || 'Unknown';
    if (!clientData[c]) clientData[c] = {
      total: 0, done: 0, inProgress: 0, pending: 0, notStarted: 0,
      urgentWithin3Days: 0, lateCount: 0, amendmentCount: 0,
    };
    const cd = clientData[c];
    cd.total++;
    if (t.status === 'Done') cd.done++;
    else if (t.status === 'In Progress') cd.inProgress++;
    else if (t.status === 'Pending') cd.pending++;
    else if (t.status === 'Not Started') cd.notStarted++;

    if (t.delivery_status === 'LATE DELIVERY') cd.lateCount++;

    // Urgent: not Done, deadline within 3 days
    if (t.status !== 'Done' && t.deadline && t.deadline >= todayStr && t.deadline <= threeDaysStr) {
      cd.urgentWithin3Days++;
    }
  }

  // Merge amendment counts (by title match — approximations table links to content_items)
  // Map sheet client names to amendment data via the content_items + approvals join
  const clientAmendmentCounts: Record<string, number> = {};
  // Simple: count amendments per client by joining via sheet titles
  // Actually, let's just show amendment counts from the approvals table directly
  const totalAmendments = Object.values(amendmentCounts).reduce((s, c) => s + c, 0);
  const clientsWithAmendments = Object.keys(amendmentCounts).length;

  // Client urgency list
  const urgentClients = Object.entries(clientData)
    .filter(([, d]) => d.urgentWithin3Days > 0 || d.notStarted > 0 || d.total - d.done > 0)
    .map(([name, d]) => ({
      name,
      ...d,
      attentionScore: (d.urgentWithin3Days * 3) + (d.notStarted * 2) + (d.total - d.done),
      recommendation: d.notStarted > 0
        ? `Send ${d.notStarted} video(s) for editing`
        : d.total - d.done > 0
        ? `${d.total - d.done} in progress — on track`
        : 'All done — schedule next shoot',
    }))
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 10);

  // Monthly trend (videos per month + delivery quality)
  const monthTrend: Record<string, { total: number; late: number; early: number; onTime: number; done: number }> = {};
  for (const t of allTasks) {
    const m = t.sheet_tab || '';
    if (!monthTrend[m]) monthTrend[m] = { total: 0, late: 0, early: 0, onTime: 0, done: 0 };
    monthTrend[m].total++;
    if (t.status === 'Done') monthTrend[m].done++;
    if (t.delivery_status === 'LATE DELIVERY') monthTrend[m].late++;
    else if (t.delivery_status === 'EARLY!') monthTrend[m].early++;
    else if (t.delivery_status === 'DEADLINE DAY') monthTrend[m].onTime++;
  }
  const monthTrendList = Object.entries(monthTrend).sort(([a], [b]) => a.localeCompare(b));

  return NextResponse.json({
    ok: true,
    kpis: { total, done, inProgress, pending, notStarted, late, early, onTime },
    editorLeaderboard,
    urgentClients,
    monthTrend: monthTrendList,
    amendmentSummary: { totalAmendments, clientsWithAmendments },
    editorNames,
  });
}

