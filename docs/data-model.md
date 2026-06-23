# CCA Dashboard Data Model v0.1

This document defines the database-ready model for the approval/comment system. It is written to map cleanly to Supabase/PostgreSQL later, while the current MVP uses mock data/API routes.

## Core entities

### clients
- `id` uuid primary key
- `name` text
- `company_name` text
- `hub_name` text
- `created_at` timestamptz

### profiles
- `id` uuid primary key, same as auth user id later
- `client_id` uuid nullable
- `name` text
- `email` text
- `role` enum: `client`, `admin`, `producer`, `qc`, `editor`
- `avatar_initials` text
- `created_at` timestamptz

Visibility rule:
- client users only see their own `client_id`
- editors only see content assigned to them
- CCA admin/producer/qc see all operational content

### content_items
- `id` uuid primary key
- `client_id` uuid references clients
- `slug` text unique
- `title` text
- `category` text
- `brief` text
- `post_date` date
- `status` enum: `idea`, `shoot`, `editing`, `pending_qc`, `pending_client_approval`, `amendments_requested`, `pending_hook_caption`, `ready_to_post`, `posted`
- `duration` text nullable
- `hook` text nullable
- `caption` text nullable
- `drive_file_id` text nullable
- `drive_embed_url` text nullable
- `drive_preview_url` text nullable
- `notion_page_id` text nullable
- `google_sheet_row_id` text nullable
- `google_calendar_event_id` text nullable
- `created_at` timestamptz
- `updated_at` timestamptz

### content_assignments
- `id` uuid primary key
- `content_item_id` uuid references content_items
- `editor_profile_id` uuid references profiles
- `assigned_by_profile_id` uuid references profiles
- `deadline_at` timestamptz
- `status` enum: `assigned`, `in_progress`, `submitted`, `needs_revision`, `accepted`
- `raw_footage_url` text nullable
- `editor_notes_url` text nullable
- `submission_url` text nullable
- `created_at` timestamptz

### comments
- `id` uuid primary key
- `content_item_id` uuid references content_items
- `author_profile_id` uuid nullable references profiles
- `author_name` text
- `author_role` enum: `client`, `internal`, `editor`
- `timestamp_code` text, e.g. `00:42`
- `body` text
- `visibility` enum: `client_visible`, `cca_internal_only`, `editor_visible_amendment`
- `resolved_at` timestamptz nullable
- `created_at` timestamptz

### approvals
- `id` uuid primary key
- `content_item_id` uuid references content_items
- `client_profile_id` uuid nullable references profiles
- `decision` enum: `approved`, `amendments_requested`
- `note` text nullable
- `created_at` timestamptz

Rule:
- latest approval decision controls the visible review decision state
- `approved` moves content to `pending_hook_caption`
- `amendments_requested` moves content to `amendments_requested`

### activity_logs
- `id` uuid primary key
- `content_item_id` uuid nullable references content_items
- `actor_profile_id` uuid nullable references profiles
- `icon` text
- `event_type` text
- `message` text
- `created_at` timestamptz

## Integration tracking

### notion_sync_records
- `id` uuid primary key
- `content_item_id` uuid references content_items
- `notion_page_id` text
- `last_synced_at` timestamptz
- `sync_status` enum: `pending`, `synced`, `failed`
- `last_error` text nullable

### sheet_import_rows
- `id` uuid primary key
- `source_sheet_id` text
- `source_tab_name` text
- `source_row_number` integer
- `content_item_id` uuid nullable references content_items
- `import_status` enum: `pending`, `created`, `updated`, `skipped`, `failed`
- `row_hash` text
- `last_error` text nullable
- `imported_at` timestamptz

## MVP implementation phases

1. Current phase: mock data + API route store.
2. Next phase: Supabase tables and row-level security.
3. Integration phase: Google Drive embed fields + Notion/Sheets sync records.
