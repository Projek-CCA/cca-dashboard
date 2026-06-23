# CCA Dashboard MVP

Content Coach Academy — a centralized web dashboard replacing scattered Notion, WhatsApp, Google Sheets, and Google Drive workflows with one source of truth for content production.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **In-memory mock data** (globalThis store) — ready for Supabase migration
- **Production build:** `npm run build`

## Routes

| Route | Purpose | Role |
|-------|---------|------|
| `/` | Landing page with navigation links | All |
| `/calendar` | Client content calendar (monthly grid, filters, approval queue, activity) | Client, CCA Staff |
| `/review/[slug]` | Video review page (embedded Drive preview, timestamped comments, approve/amend) | Client, CCA Staff |
| `/internal/review-queue` | Internal board (Pending QC, Client Approval, Amendments, Hook & Caption) | CCA Staff |
| `/editor/tasks` | Editor task view (assigned edits, resources, deadlines, submission) | Editor |
| `/api/reviews/[slug]` | API — GET (fetch review), POST (add_comment / set_decision) | Backend |

## Status Flow

`Idea → Shoot → Editing → Pending QC → Pending Client Approval → Amendments Requested → Pending Hook & Caption → Ready to Post → Posted`

## Comment Visibility

- **Client-visible** — shown to client and CCA team
- **CCA internal only** — hidden from client
- **Editor-visible amendment** — shown to assigned editor only

## Running Locally

```bash
cd /Users/brc/cca-dashboard
npm run dev      # Dev server on http://localhost:3000
npm run build    # Production build
npm run typecheck  # TypeScript check
```

## Project Structure

```
src/
  app/
    calendar/           # Client calendar page
    review/[slug]/      # Video review page + API
    internal/review-queue/  # CCA internal queue
    editor/tasks/       # Editor task view
    api/reviews/[slug]/ # Review API route
    globals.css         # Shared styles
    layout.tsx          # Root layout
    page.tsx            # Landing page
  components/           # Reusable: AppShell, Button, MetricCard, StatusPill
  lib/                  # Types, mock data, review store
docs/                   # Data model docs, plan, schema
supabase/schema.sql     # Target PostgreSQL schema for production migration
```

## Next Steps

1. Supabase setup (auth, database, RLS policies)
2. Google Drive video embedding
3. Google Calendar shoot integration
4. Email notifications
5. Real user authentication and role-based access
