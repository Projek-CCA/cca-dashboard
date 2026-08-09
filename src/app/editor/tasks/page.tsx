import { createClient } from '@/lib/supabase/server';
import { EditorTasksClient } from './EditorTasksClient';

export const dynamic = 'force-dynamic';

interface Task {
  id: string;
  sheet_tab: string;
  content_no: number | null;
  content_title: string;
  client_name: string;
  video_editor: string;
  status: string;
  deadline: string | null;
  delivery_status: string;
  completion_date: string | null;
  content_ref: string;
}

const STAFF_ROLES = ['super_admin', 'general_manager', 'manager', 'admin', 'project_manager', 'qc', 'social_media_admin'];

export default async function EditorTasksPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <EditorTasksClient tasks={[]} months={[]} statuses={[]} clients={[]} isEditor={false} editorName="" authRedirect />;
  }

  // Resolve profile (id first, email fallback — ids can mismatch auth.users.id)
  let { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) {
    const { data: pb } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('email', user.email)
      .maybeSingle();
    profile = pb;
  }

  const profileName = (profile?.name || '').trim();
  const role = profile?.role as string | undefined;
  const isEditor = role === 'editor';
  const isStaff = !!role && STAFF_ROLES.includes(role);

  // Editor: only their own tasks (matched by sheet editor name, case-insensitive).
  // Staff: full task list (lightweight view of the tracking sheet).
  let query = supabase
    .from('project_tasks')
    .select('*')
    .order('deadline', { ascending: true })
    .limit(1000);
  if (isEditor) query = query.ilike('video_editor', profileName);

  const { data: tasks } = await query;
  const allTasks = (tasks || []) as Task[];

  // Live filter options — pulled from actual data (never hardcoded)
  const { data: monthRows } = await supabase
    .from('project_tasks')
    .select('sheet_tab')
    .limit(1000);
  const months = [...new Set((monthRows || []).map((m) => m.sheet_tab))].sort();

  const statuses = [...new Set(allTasks.map((t) => t.status).filter(Boolean))].sort();

  // Client filter options — pulled from the editor's own tasks
  const clients = [...new Set(allTasks.map((t) => t.client_name).filter(Boolean))].sort();

  return (
    <EditorTasksClient
      tasks={allTasks}
      months={months}
      statuses={statuses}
      clients={clients}
      isEditor={isEditor}
      editorName={profileName}
    />
  );
}
