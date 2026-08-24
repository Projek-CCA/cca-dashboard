-- Workflow persistence migration (created, not applied by this change).
-- Existing project_tasks columns A-K remain unchanged; column J is intentionally absent.
create table if not exists workflow_items (
  id uuid primary key default gen_random_uuid(),
  task_id text not null unique,
  state text not null default 'Assigned',
  editor_name text,
  deadline_at timestamptz,
  output_video_url text,
  hook text,
  caption text,
  client_amendment_tokens_used integer not null default 0,
  editor_completed_count integer not null default 0,
  delivery_bucket text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists workflow_comments (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  author_name text not null,
  author_role text not null,
  body text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);
create table if not exists workflow_events (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  actor_name text,
  actor_role text,
  event_type text not null,
  from_state text,
  to_state text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists integration_events (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  integration text not null,
  status text not null default 'pending',
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists workflow_events_task_idx on workflow_events(task_id, created_at desc);
create index if not exists workflow_comments_task_idx on workflow_comments(task_id, created_at desc);
