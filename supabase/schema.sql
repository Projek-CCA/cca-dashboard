-- CCA Dashboard Supabase/PostgreSQL schema draft v0.1
-- This is not applied yet. It documents the target database shape for the real build.

create type app_role as enum ('client', 'admin', 'producer', 'qc', 'editor');
create type content_status as enum ('idea', 'shoot', 'editing', 'pending_qc', 'pending_client_approval', 'amendments_requested', 'pending_hook_caption', 'ready_to_post', 'posted');
create type assignment_status as enum ('assigned', 'in_progress', 'submitted', 'needs_revision', 'accepted');
create type comment_visibility as enum ('client_visible', 'cca_internal_only', 'editor_visible_amendment');
create type approval_decision as enum ('approved', 'amendments_requested');
create type sync_status as enum ('pending', 'synced', 'failed');
create type import_status as enum ('pending', 'created', 'updated', 'skipped', 'failed');

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  hub_name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  name text not null,
  email text unique,
  role app_role not null,
  avatar_initials text,
  created_at timestamptz not null default now()
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  slug text not null unique,
  title text not null,
  category text,
  brief text,
  post_date date,
  status content_status not null default 'idea',
  duration text,
  hook text,
  caption text,
  drive_file_id text,
  drive_embed_url text,
  drive_preview_url text,
  notion_page_id text,
  google_sheet_row_id text,
  google_calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content_assignments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  editor_profile_id uuid references profiles(id) on delete set null,
  assigned_by_profile_id uuid references profiles(id) on delete set null,
  deadline_at timestamptz,
  status assignment_status not null default 'assigned',
  raw_footage_url text,
  editor_notes_url text,
  submission_url text,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  author_profile_id uuid references profiles(id) on delete set null,
  author_name text not null,
  author_role text not null check (author_role in ('client', 'internal', 'editor')),
  timestamp_code text not null default '00:00',
  body text not null,
  visibility comment_visibility not null default 'client_visible',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  client_profile_id uuid references profiles(id) on delete set null,
  decision approval_decision not null,
  note text,
  created_at timestamptz not null default now()
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references content_items(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  icon text,
  event_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table notion_sync_records (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  notion_page_id text not null,
  last_synced_at timestamptz,
  sync_status sync_status not null default 'pending',
  last_error text
);

create table sheet_import_rows (
  id uuid primary key default gen_random_uuid(),
  source_sheet_id text not null,
  source_tab_name text not null,
  source_row_number integer not null,
  content_item_id uuid references content_items(id) on delete set null,
  import_status import_status not null default 'pending',
  row_hash text,
  last_error text,
  imported_at timestamptz not null default now(),
  unique (source_sheet_id, source_tab_name, source_row_number)
);

create index idx_content_items_client_status on content_items(client_id, status);
create index idx_content_items_post_date on content_items(post_date);
create index idx_comments_content_item on comments(content_item_id, created_at desc);
create index idx_activity_logs_content_item on activity_logs(content_item_id, created_at desc);
create index idx_assignments_editor on content_assignments(editor_profile_id, status);
