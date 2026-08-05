import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';
import { runOnEditLogic } from '@/lib/sheet-onedit-logic';

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

/**
 * POST /api/project-tracking/add-task
 * Body: { client: string, title: string, deadline: string (DD/MM/YYYY), linkUrl?: string }
 * Appends a new row to the current month's tab in the Google Sheet.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { client, title, deadline, linkUrl } = body as {
    client?: string; title?: string; deadline?: string; linkUrl?: string;
  };

  if (!client || !title) {
    return NextResponse.json({ error: 'client and title are required' }, { status: 400 });
  }

  // Determine target month tab (current month)
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const tabName = `${monthName} ${year}`;

  // Parse deadline to ISO
  let deadlineIso = '';
  if (deadline) {
    try {
      const parts = deadline.split(/[\/\-]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
        const dt = new Date(y > 2000 ? y : 2000 + y, m - 1, d);
        if (!isNaN(dt.getTime())) deadlineIso = dt.toISOString().split('T')[0];
      }
    } catch { /* keep raw */ }
  }

  const sheets = getSheetsClient().spreadsheets;

  // Find the next empty row in the tab
  // Read column A to find last populated row
  const colAResult = await sheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A2:A1000`,
  });
  const colAValues = colAResult.data.values || [];
  const nextRow = colAValues.length + 2; // +2 because row 1=header, and length is 0-indexed

  // Generate the unique ID (same pattern as the Apps Script generateUniqueIDs):
  //   "<Tab Name> - NNNN", picking up after the highest existing number in column A.
  let nextIdNumber = 0;
  for (const row of colAValues) {
    const v = row && row[0] ? String(row[0]) : '';
    const match = v.match(/(\d+)$/);
    if (match) nextIdNumber = Math.max(nextIdNumber, Number(match[1]));
  }
  const uniqueId = `${tabName} - ${String(nextIdNumber + 1).padStart(4, '0')}`;

  // Build the row values.
  // Sheet layout: A=ID B=Client C=ContentNo D=Title E=Editor F=Status G=Deadline
  //               H=Delivery I=Completion J=RawFiles(OFF-LIMITS) K=HardLinks(Drive)
  // Column J is intentionally left empty — the webapp must not touch it.
  const newRow = [
    uniqueId,      // A: ID
    client,        // B: Client Name
    '',            // C: Content No (auto renumbered by deadline sort)
    title,         // D: Content Title
    '',            // E: Video Editor (assigned later)
    '',            // F: Status
    deadline,      // G: Deadline
    '',            // H: Delivery Status
    '',            // I: Completion Date
    '',            // J: Link to Raw Files — NOT touched by the webapp
    linkUrl || '', // K: Hard Links (Google Drive) — plain URL, clickable in Sheets
  ];

  // Append the row
  await sheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tabName}'!A${nextRow}:K${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] },
  });

  // Replicate the Apps Script onEdit() trigger for the deadline write (col G = 7):
  // sorts the tab by deadline and renumbers Column C. API edits don't fire triggers.
  try {
    await runOnEditLogic(tabName, nextRow, 7, deadline || null);
  } catch (logicErr) {
    console.error('onEdit-logic replication failed:', logicErr);
  }

  return NextResponse.json({
    ok: true,
    tab: tabName,
    row: nextRow,
    id: uniqueId,
    message: `Added "${title}" for ${client} in ${tabName}`,
  });
}
