# CCA Dashboard MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the first functional web-app draft from the approved CCA dashboard prototypes: client calendar, client video review with timestamped comments, and CCA internal review queue.

**Architecture:** Start as a Next.js app with mocked local data and reusable components. Keep the data shape close to the future Notion/Supabase model so integrations can be added later without redesigning the UI. This first development pass prioritizes navigable screens, clean component structure, and deployable preview.

**Tech Stack:** Next.js, React, TypeScript, CSS modules/global CSS, local mock data. Later integrations: Notion API, Google Drive embeds, Google Calendar, auth, and database.

---

## Current-state assumptions

- Notion remains a likely source/input layer in early phases.
- Google Sheets/Docs bulk planning should later create Notion/content cards automatically.
- Google Drive remains video/file storage.
- Clients need in-system video review, timestamped comments, approve/request amendment actions.
- CCA staff need an internal queue for QC, client approvals, amendments/replies, and hook/caption bottlenecks.
- Editors will later need a task view, but the first coding pass covers the three approved screens.

## Visibility boundaries for v1 mocks

- Client portal sees only their own content calendar, reviewable videos, approval actions, and client-visible comments.
- Internal queue sees operational statuses, missing links, internal notes, editor assignment, and bottlenecks.
- Editor-specific portal is deferred to the next development milestone.

## Task 1: Scaffold Next.js app

**Objective:** Create a runnable Next.js app under `/Users/brc/cca-dashboard`.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Verification:**
- Run `npm install`
- Run `npm run build`
- Expected: build succeeds.

## Task 2: Add mock data model

**Objective:** Create typed mock data for clients, content items, comments, activity, review queue metrics, and statuses.

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/mock-data.ts`

**Verification:**
- Run `npm run typecheck`
- Expected: no TypeScript errors.

## Task 3: Build shared layout/components

**Objective:** Implement reusable shell, sidebar, status pills, cards, metrics, and buttons.

**Files:**
- Create: `src/components/AppShell.tsx`
- Create: `src/components/StatusPill.tsx`
- Create: `src/components/MetricCard.tsx`
- Create: `src/components/Button.tsx`

**Verification:**
- Run `npm run typecheck`
- Expected: no TypeScript errors.

## Task 4: Build client calendar page

**Objective:** Implement the approved client calendar/hub screen as `/calendar`.

**Files:**
- Create: `src/app/calendar/page.tsx`

**Acceptance criteria:**
- Shows monthly metrics.
- Shows calendar grid with content cards.
- Shows pending approval queue.
- Links a review item to `/review/content-scaling-mistakes`.

**Verification:**
- Run `npm run build`
- Expected: build succeeds.

## Task 5: Build video review page

**Objective:** Implement the approved client video review screen as `/review/[slug]`.

**Files:**
- Create: `src/app/review/[slug]/page.tsx`

**Acceptance criteria:**
- Shows Google Drive-style video embed placeholder.
- Shows timestamp markers/comments.
- Shows comment composer with visibility selector.
- Shows approve/request amendments buttons.
- Shows approval trail/activity.

**Verification:**
- Run `npm run build`
- Expected: build succeeds.

## Task 6: Build internal review queue page

**Objective:** Implement the approved internal queue screen as `/internal/review-queue`.

**Files:**
- Create: `src/app/internal/review-queue/page.tsx`

**Acceptance criteria:**
- Shows columns for Pending QC, Pending Client Approval, Amendments/Replies, Hook & Caption.
- Shows priority alerts and team activity.
- Links relevant tasks to the review page.

**Verification:**
- Run `npm run build`
- Expected: build succeeds.

## Task 7: Host local preview

**Objective:** Start the app locally and expose it through the existing preview tunnel if possible.

**Verification:**
- Run dev server.
- Confirm `/calendar`, `/review/content-scaling-mistakes`, and `/internal/review-queue` load.
