# Chunk 04 — Treatment plans + exercise library + calendar

Status: ⬜ not started
Plan mode: **REQUIRED** — plan-builder UX + bulk-recurrence model must be decided first.

## Goal
Therapist builds a plan from an exercise library (system-seeded + clinic-additions). Plans schedule exercises with sets/reps/notes per date. Client sees plan as a calendar in the mobile app and marks items done.

## Prerequisites
- Chunk 00, 01 (auth/tenancy)
- Chunk 02 useful but not strictly required (the calendar is independent of check-ins)

## Context for fresh session
Auth + clients exist. Therapist can see clients (chunk 03) but cannot prescribe anything yet. Clients have no calendar. This chunk lands the second core feature loop: plan creation → daily adherence.

## Locked decisions
- Exercise library: **system-seeded global + clinic additions**. `Exercise.clinicId = null` ⇒ global.
- Plan item = one exercise scheduled for one date. A weekly recurring schedule expands to many `PlanItem` rows on creation (no recurring-rule magic — flat rows).
- Each exercise can OPTIONALLY have a `mediaUrl` (video or image link). MinIO stores uploads; external URLs allowed too.
- Client marks `completedAt` (timestamp) + optional notes. No partial completion in MVP (whole item done or not).
- Calendar view: month + day in Expo. Day view shows today's planned items in order.

## Scope (in)
- Prisma models: `Exercise`, `PlanItem`, `MediaType` enum.
- Seed: ~100 common physio exercises (`clinicId = null`). Curated names + descriptions (placeholder OK; real curation in a follow-up).
- ts-rest contracts:
  - `GET /exercises?search=...&tag=...` — own clinic + globals
  - `POST /exercises` (clinic exercise creation)
  - `POST /exercises/:id/media` — pre-signed PUT URL for MinIO
  - `POST /plans` — create plan (accepts batch of `PlanItem`s)
  - `GET /clients/:id/plan?from=...&to=...`
  - `PATCH /plan-items/:id/complete` — client-only
- NestJS modules: `exercises`, `plans`.
- Web (therapist):
  - `/exercises` — library browser, add/edit clinic exercise, media upload.
  - `/clients/[id]/plan/builder` — pick exercises, place on calendar (drag-drop or click-to-schedule), set sets/reps/frequency. Bulk repeat (e.g. "every Mon/Wed/Fri for 4 weeks").
  - `/clients/[id]/plan` — read-only week/month overview.
- Mobile (client):
  - Calendar tab: month view (dot under days with items, accent if any incomplete past).
  - Day view: list of items with checkmark.
  - Item detail: instructions, sets/reps, optional video (open in WebView or system player).
- Plan completion writes through optimistically; sync queued offline.

## Scope (out)
- Program templates (chunk 05) — plans here are bare, no template binding yet (we'll attach later).
- Notifications for due exercises (chunk 06).
- Exercise video recording in-app (defer; uploaded URL only).
- Sharing plans across clients as templates (defer).

## Files to create / modify
- `packages/db/prisma/schema.prisma` — `Exercise`, `PlanItem`, `MediaType` enum + indexes.
- `packages/db/prisma/seed.ts` — extend with ~100 global exercises.
- `packages/db/data/exercises.ts` — seed source data (name, description, tags).
- `packages/contracts/src/exercises.ts`
- `packages/contracts/src/plans.ts`
- `apps/api/src/modules/exercises/exercises.controller.ts` + service
- `apps/api/src/modules/exercises/media.controller.ts` — pre-signed S3/MinIO URL
- `apps/api/src/modules/plans/plans.controller.ts` + service + bulk-create util
- `apps/web/app/(app)/exercises/page.tsx`
- `apps/web/app/(app)/exercises/[id]/page.tsx`
- `apps/web/app/(app)/clients/[id]/plan/builder/page.tsx` (drag-drop)
- `apps/web/app/(app)/clients/[id]/plan/page.tsx`
- `apps/web/components/ExercisePicker.tsx`
- `apps/web/components/PlanCalendar.tsx`
- `apps/mobile/app/(client)/plan/index.tsx` — month calendar
- `apps/mobile/app/(client)/plan/day.tsx`
- `apps/mobile/app/(client)/plan/[planItemId].tsx`
- `apps/mobile/src/components/CalendarMonth.tsx` (use `react-native-calendars`)
- `apps/web/e2e/plan-builder.spec.ts`
- `apps/mobile/.maestro/plan-complete.flow.yaml`

## Implementation notes
- MinIO pre-signed PUT URLs valid 5 min. Bucket `vitapeak-media`. Public-read off; serve via signed GET URLs in clients.
- Plan builder UX: simplest path — calendar grid, click day → modal to add exercise + sets/reps. "Repeat" option creates batch of rows.
- Indexes: `@@index([clientId, scheduledFor])` on `PlanItem`.
- Tags on exercises: string[] (Postgres native). Suggested seed tags: `lower-back`, `shoulder`, `knee`, `mobility`, `strength`, `cardio`, `core`, `posture`, `balance`.
- Tenant rule: clinic exercises filter by `clinicId`. Globals (`clinicId = null`) visible to all.
- Mobile calendar lib: `react-native-calendars` works on iOS+Android, customizable theming.

## Acceptance criteria
- [ ] Seed produces ~100 global exercises browsable from any clinic.
- [ ] Therapist can create a clinic-local exercise + upload video → URL stored.
- [ ] Therapist builds a 4-week plan in < 5 minutes (manual UX check).
- [ ] Client app shows today's exercises + future days dotted on calendar.
- [ ] Client taps an item → sees instructions + optional video plays → marks done → completion timestamp persists.
- [ ] Therapist refreshes client plan view → completion reflected.
- [ ] Cross-tenant guard prevents reading another clinic's exercises.
- [ ] Playwright + Maestro flows pass.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/04-plans-and-calendar.md. Propose the plan-builder UX (modal
vs drawer vs full-page) and the bulk-recurrence model before writing code.
```
