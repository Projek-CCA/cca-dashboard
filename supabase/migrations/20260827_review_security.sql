-- Durable video-review persistence and row-level security.
-- Additive migration: does not alter project_tasks or Google Sheets columns (especially J).
-- Apply with `supabase db push` / `supabase migration up` after reviewing against the
-- deployed schema. This file is intentionally not applied remotely by this change.

create table if not exists review_records (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references project_tasks(id) on delete cascade,
  workflow_item_id uuid references workflow_items(id) on delete set null,
  slug text not null,
  decision text not null default 'pending' check (decision in ('pending', 'approved', 'amendments_requested')),
  status text not null default 'Client Review',
  client_amendment_count integer not null default 0 check (client_amendment_count between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references review_records(id) on delete cascade,
  task_id uuid not null references project_tasks(id) on delete cascade,
  workflow_item_id uuid references workflow_items(id) on delete set null,
  author_profile_id uuid references profiles(id) on delete set null,
  author_name text not null,
  author_role text not null,
  timestamp_text text not null default '00:00',
  timestamp_seconds integer not null default 0 check (timestamp_seconds >= 0),
  body text not null check (length(btrim(body)) > 0),
  visibility text not null check (visibility in ('client_visible', 'internal', 'editor_visible_amendment')),
  created_at timestamptz not null default now()
);

create table if not exists review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references review_records(id) on delete cascade,
  task_id uuid not null references project_tasks(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  actor_role text not null,
  decision text not null check (decision in ('approved', 'amendments_requested')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists review_records_task_idx on review_records(task_id);
create index if not exists review_comments_review_created_idx on review_comments(review_id, created_at desc);
create index if not exists review_comments_task_created_idx on review_comments(task_id, created_at desc);
create index if not exists review_decisions_review_created_idx on review_decisions(review_id, created_at desc);

-- Keep the review identity connected to an already-created workflow item when one exists.
create or replace function link_review_workflow_item() returns trigger language plpgsql as $$
begin
  if new.workflow_item_id is null then
    select id into new.workflow_item_id from workflow_items where task_id = new.task_id::text limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists review_records_link_workflow_item on review_records;
create trigger review_records_link_workflow_item before insert or update on review_records
for each row execute function link_review_workflow_item();

-- Server-side defense in depth for the three-amendment rule.
create or replace function enforce_review_amendment_cap() returns trigger language plpgsql as $$
begin
  if new.client_amendment_count > 3 then
    raise exception 'Client amendment limit reached (3 of 3 used)';
  end if;
  return new;
end;
$$;
drop trigger if exists review_records_amendment_cap on review_records;
create trigger review_records_amendment_cap before insert or update on review_records
for each row execute function enforce_review_amendment_cap();

alter table workflow_items enable row level security;
alter table workflow_comments enable row level security;
alter table workflow_events enable row level security;
alter table integration_events enable row level security;
alter table review_records enable row level security;
alter table review_comments enable row level security;
alter table review_decisions enable row level security;

-- Profile roles are the repo's existing ownership/authorization source.
create policy workflow_items_staff_or_assigned on workflow_items for select to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_items.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')))
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));
create policy workflow_items_staff_write on workflow_items for all to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')));
create policy workflow_items_assigned_editor_write on workflow_items for all to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_items.task_id
    where p.id = auth.uid() and p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,''))))
with check (exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_items.task_id
    where p.id = auth.uid() and p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,''))));

create policy workflow_comments_visible_to_actor on workflow_comments for select to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_comments.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')) and visibility <> 'internal')
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name) and visibility = 'client_visible'))));
create policy workflow_comments_staff_write on workflow_comments for insert to authenticated with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')));
create policy workflow_comments_assigned_editor_write on workflow_comments for insert to authenticated with check (
  exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_comments.task_id
    where p.id = auth.uid() and p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')) and visibility <> 'internal'));
create policy workflow_comments_client_write on workflow_comments for insert to authenticated with check (
  exists (select 1 from profiles p join project_tasks t on t.id::text = workflow_comments.task_id
    where p.id = auth.uid() and p.role = 'client' and visibility = 'client_visible'
      and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)));

create policy workflow_events_visible_to_actor on workflow_events for select to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')));
create policy workflow_events_staff_write on workflow_events for insert to authenticated with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')));
create policy integration_events_staff_only on integration_events for all to authenticated using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('super_admin','admin','manager','project_manager','general_manager','qc','social_media_admin')));

create policy review_records_visible_to_actor on review_records for select to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id = review_records.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')))
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));
create policy review_records_create_for_actor on review_records for insert to authenticated with check (
  exists (select 1 from profiles p join project_tasks t on t.id = review_records.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')))
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));
create policy review_records_manage on review_records for update to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id = review_records.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name))))) with check (
  exists (select 1 from profiles p join project_tasks t on t.id = review_records.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));

create policy review_comments_visible_to_actor on review_comments for select to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id = review_comments.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')) and visibility <> 'internal')
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name) and visibility = 'client_visible'))));
create policy review_comments_create_for_actor on review_comments for insert to authenticated with check (
  author_profile_id = auth.uid() and exists (select 1 from profiles p join project_tasks t on t.id = review_comments.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager')
      or (p.role = 'editor' and lower(coalesce(t.video_editor,'')) = lower(coalesce(p.name,'')) and visibility <> 'internal')
      or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name) and visibility = 'client_visible'))));

create policy review_decisions_visible_to_actor on review_decisions for select to authenticated using (
  exists (select 1 from profiles p join project_tasks t on t.id = review_decisions.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager') or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));
create policy review_decisions_create_for_actor on review_decisions for insert to authenticated with check (
  actor_profile_id = auth.uid() and exists (select 1 from profiles p join project_tasks t on t.id = review_decisions.task_id
    where p.id = auth.uid() and (p.role in ('super_admin','admin','manager','project_manager','general_manager') or (p.role = 'client' and exists (select 1 from clients c where c.id = p.client_id and c.name = t.client_name)))));
