import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';
import { runOnEditLogic } from '@/lib/sheet-onedit-logic';

const STAFF_ROLES = ['super_admin', 'general_manager', 'manager', 'admin', 'project_manager', 'qc', 'social_media_admin'];
// Editors may PATCH their own rows too (status only — enforced in PATCH below).
const ALLOWED_ROLES = [...STAFF_ROLES, 'editor'];

const SHEET_ID = '1YXsfIO4r6gC5dUSRSjsFjRm2TwSQoYE5JlLQSNnvE8M';

// Column index (0-based) for each editable field.
// Sheet layout: A=ID B=Client C=ContentNo D=Title E=Editor F=Status G=Deadline
//               H=Delivery I=Completion J=RawFiles(OFF-LIMITS) K=HardLinks(Drive)
// NOTE: column J (index 9) must NEVER appear here — the webapp must not touch it.
const FIELD_COL: Record<string, number> = {
  video_editor: 4,     // col E
  status: 5,           // col F
  deadline: 6,         // col G
  delivery_status: 7,  // col H
  completion_date: 8,  // col I
  content_ref: 10,     // col K — Google Drive / raw files link
};

type RouteContext = { params: Promise<{ id: string }> };

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
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) {
    const { data: pb } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('email', user.email)
      .maybeSingle();
    profile = pb;
  }
  if (!profile?.role || !ALLOWED_ROLES.includes(profile.role)) return null;
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
 * Resolves a task's CURRENT row in the sheet by matching (Client = col B, Title = col D).
 * Stored sheet_row values go stale whenever the tab is re-sorted (deadline sort in
 * runOnEditLogic or the Apps Script onEdit trigger), so we never trust them as the
 * write target — we look up the live position instead.
 */
async function resolveSheetRow(
  sheets: ReturnType<typeof getSheetsClient>['spreadsheets'],
  tabName: string,
  clientName: string | null,
  title: string | null,
  fallbackRow: number,
): Promise<number> {
  if (!clientName || !title) return fallbackRow;
  try {
    const res = await sheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tabName}'!A2:D1000`,
    });
    const rows = res.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[1] || String(r[1]).trim() === '') continue; // col B = Client
      if (
        String(r[1]).trim() === String(clientName).trim() &&   // col B = Client
        String(r[3] || '').trim() === String(title).trim()      // col D = Title
      ) {
        return i + 2; // 2-based sheet row (row 1 = header)
      }
    }
  } catch (err) {
    console.error('resolveSheetRow failed, falling back to stored row:', err);
  }
  return fallbackRow;
}

/**
 * PATCH /api/project-tracking/[id]
 * Body: { field: string, value: string }
 * Updates the task in Supabase AND writes back to the Google Sheet.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await getAuthUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized — staff only' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { field, value } = body as { field?: string; value?: string };

  if (!field || !FIELD_COL[field]) {
    return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 });
  }

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

  // Get the task to find its sheet location
  const { data: task } = await supabase
    .from('project_tasks')
    .select('id, sheet_tab, sheet_row, client_name, content_title, video_editor')
    .eq('id', id)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Editors: may only update STATUS on rows assigned to them (sheet editor name match).
  const isEditor = auth.profile.role === 'editor';
  if (isEditor) {
    const taskEditor = (task.video_editor || '').trim().toLowerCase();
    const me = (auth.profile.name || '').trim().toLowerCase();
    if (!me || taskEditor !== me) {
      return NextResponse.json({ error: 'You can only update your own tasks' }, { status: 403 });
    }
    if (field !== 'status') {
      return NextResponse.json({ error: 'Editors can only update status' }, { status: 403 });
    }
  }

  // Update Supabase mirror
  const { error: dbError } = await supabase
    .from('project_tasks')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (dbError) {
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  // Write back to Google Sheet
  try {
    const sheets = getSheetsClient().spreadsheets;
    const colIndex = FIELD_COL[field];
    const colLetter = String.fromCharCode(65 + colIndex);

    // Never trust stored sheet_row — the tab may have been re-sorted since it was
    // recorded. Resolve the live position by matching (Client, Title) in the sheet.
    const targetRow = await resolveSheetRow(
      sheets,
      task.sheet_tab,
      task.client_name,
      task.content_title,
      task.sheet_row,
    );
    const range = `'${task.sheet_tab}'!${colLetter}${targetRow}`;

    await sheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });

    // Run the equivalent of the Apps Script onEdit() trigger
    // (API edits don't fire triggers — this replicates sort/renumber,
    //  completion-date auto-set, and late-delivery logging)
    try {
      await runOnEditLogic(task.sheet_tab, targetRow, colIndex + 1, value ?? null);
    } catch (logicErr) {
      console.error('onEdit-logic replication failed:', logicErr);
    }

    // Keep the mirror's row fresh. A deadline edit re-sorts the tab, which can move
    // the task again — so after a sort we re-resolve before saving.
    if (targetRow !== task.sheet_row || colIndex + 1 === 7) {
      const freshRow =
        colIndex + 1 === 7
          ? await resolveSheetRow(sheets, task.sheet_tab, task.client_name, task.content_title, targetRow)
          : targetRow;
      if (freshRow !== task.sheet_row) {
        await supabase
          .from('project_tasks')
          .update({ sheet_row: freshRow, updated_at: new Date().toISOString() })
          .eq('id', id);
      }
    }
  } catch (sheetErr) {
    console.error('Sheet write-back failed:', sheetErr);
    // DB is updated, sheet write failed — warn but don't fail
    return NextResponse.json({
      ok: true,
      warning: 'DB updated but Sheet write-back failed — will sync on next refresh',
    });
  }

  return NextResponse.json({ ok: true, field, value });
}
