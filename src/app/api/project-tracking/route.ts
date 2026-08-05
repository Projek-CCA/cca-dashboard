import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';

const STAFF_ROLES = ['super_admin', 'general_manager', 'manager', 'admin', 'project_manager', 'qc', 'social_media_admin'];
const SHEET_ID = '1YXsfIO4r6gC5dUSRSjsFjRm2TwSQoYE5JlLQSNnvE8M';

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) {
    const { data: pb } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();
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

async function fetchEditorsFromSheet(): Promise<string[]> {
  try {
    const sheets = getSheetsClient().spreadsheets;
    const result = await sheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Editor List'!A2:D30",
    });
    const rows = result.data.values || [];
    const editors: string[] = [];
    for (const row of rows) {
      const name = row[1]?.trim();
      const active = (row[3] || '').trim().toLowerCase();
      if (name && active === 'active') {
        editors.push(name);
      }
    }
    return editors.sort();
  } catch (err) {
    console.error('Failed to fetch editors from sheet:', err);
    return [];
  }
}

/**
 * GET /api/project-tracking
 * Returns all project tasks, with optional ?client= filter and ?month= filter.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized — staff only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const client = searchParams.get('client') || '';
  const month = searchParams.get('month') || '';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    },
  );

  let query = supabase
    .from('project_tasks')
    .select('*')
    .order('deadline', { ascending: false });

  if (client) query = query.ilike('client_name', `%${client}%`);
  if (month) query = query.eq('sheet_tab', month);

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }

  // Also get available months and clients for filters
  const { data: months } = await supabase
    .from('project_tasks')
    .select('sheet_tab')
    .limit(1000);
  const uniqueMonths = [...new Set((months || []).map((m) => m.sheet_tab))].sort();

  const { data: clients } = await supabase
    .from('project_tasks')
    .select('client_name')
    .limit(1000);
  const uniqueClients = [...new Set((clients || []).map((c) => c.client_name))].sort();

  // Fetch editors live from the Editor List sheet
  const editors = await fetchEditorsFromSheet();

  // Dynamically derive statuses and delivery statuses from actual data
  const uniqueStatuses = [...new Set((tasks || []).map((t) => t.status).filter(Boolean))].sort();
  const uniqueDeliveryStatuses = [...new Set((tasks || []).map((t) => t.delivery_status).filter(Boolean))].sort();

  return NextResponse.json({
    ok: true,
    tasks,
    months: uniqueMonths,
    clients: uniqueClients,
    editors,
    statuses: uniqueStatuses,
    deliveryStatuses: uniqueDeliveryStatuses,
  });
}
