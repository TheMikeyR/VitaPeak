# Chunk 08 — Therapist mobile companion features

Status: ⬜ not started
Plan mode: **OPTIONAL** — UI assembly on top of existing contracts.

## Goal
Therapist mobile view: today's clients, quick status, push alerts on flagged pain, quick note. Lightweight — power features stay on web.

## Prerequisites
- Chunk 01 (role gating)
- Chunk 02, 03 (pain data + aggregations)
- Chunk 06 (push for incoming alerts)

## Context for fresh session
Mobile app has `(client)` group fleshed out. `(therapist)` group has only a placeholder. Therapists log in and see nothing useful on mobile. This chunk delivers the companion experience: triage on the go, react to alerts, leave a quick note.

## Locked decisions
- Read-mostly. NO plan builder, NO program template editor, NO full audit viewer on mobile.
- Write surface limited to: quick note on a client, mark alert resolved, push token register (chunk 06).
- Re-use ts-rest contracts already built for web.

## Scope (in)
- Mobile (therapist):
  - `Today` tab — list of own clients with last check-in summary + flag badge.
  - `Alerts` tab — incoming high-pain / missed-check-in alerts (server-side feed).
  - `Client` detail — read-only: latest pain snapshot, recent trend mini-chart, today's plan + completion status.
  - `Quick note` — bottom-sheet to add free-text note tied to client; persists to `TherapistNote` table.
  - Push handling: tap notification → deep-link into relevant client or alert detail.
- Backend additions:
  - Prisma: `TherapistNote` (id, clinicId, therapistId, clientId, body, createdAt).
  - Prisma: `Alert` (id, clinicId, clientId, kind, severity, createdAt, resolvedAt, resolvedBy) — also enables Alerts tab.
  - Alerts: feed populated by alert evaluator from chunk 06.
  - ts-rest: `GET /me/alerts`, `PATCH /alerts/:id/resolve`, `POST /clients/:id/notes`, `GET /clients/:id/notes`.
- Tab bar role-aware (chunk 01 already has role gate; extend).

## Scope (out)
- Two-way chat with client (defer)
- Voice notes (defer)
- Editing plans from mobile (defer)
- Full audit log on mobile (defer)

## Files to create / modify
- `packages/db/prisma/schema.prisma` — `TherapistNote`, `Alert`
- `packages/contracts/src/alerts.ts`
- `packages/contracts/src/notes.ts`
- `apps/api/src/modules/alerts/alerts.controller.ts` + service (resolution write)
- `apps/api/src/modules/notes/notes.controller.ts` + service
- `apps/api/src/modules/notifications/alerts.service.ts` — extend chunk 06 to persist `Alert` rows alongside email send
- `apps/mobile/app/(therapist)/_layout.tsx` (tab bar)
- `apps/mobile/app/(therapist)/today/index.tsx`
- `apps/mobile/app/(therapist)/alerts/index.tsx`
- `apps/mobile/app/(therapist)/clients/[id]/index.tsx`
- `apps/mobile/src/components/ClientCard.tsx`
- `apps/mobile/src/components/QuickNoteSheet.tsx`
- `apps/mobile/src/notifications/handlers.ts` — deep-link on tap
- `apps/web/app/(app)/clients/[id]/notes/page.tsx` — therapist can also see notes on web (parity read)
- `apps/mobile/.maestro/therapist-resolve-alert.flow.yaml`

## Implementation notes
- Alert tab: server-side pagination + filter (open / resolved). Mark resolved updates `resolvedAt + resolvedBy`.
- Push tap → deep link via Expo Linking: `vitapeak://alerts/<id>` or `vitapeak://clients/<id>`.
- Today tab default sort: clients with open alerts first, then by last check-in ascending.
- Notes are private to clinic. Index `@@index([clientId, createdAt(desc)])`.
- Reuse `BodyMapSvg` / `PainTrendChart` patterns from web — port to RN-svg version if needed (heatmap is OK to be smaller-footprint on mobile).

## Acceptance criteria
- [ ] Therapist logs in on Expo → sees Today tab with own clients.
- [ ] Pain check-in level 9 triggers Alert row + push to therapist device.
- [ ] Tapping notification deep-links into alert detail.
- [ ] Therapist resolves alert → web list and mobile list both reflect.
- [ ] Quick note from mobile appears on web client detail.
- [ ] Cross-tenant guard prevents reading other clinic notes/alerts.
- [ ] Maestro flow passes.
- [ ] No regression.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/08-therapist-mobile-companion.md. Begin by deciding the
deep-link URL scheme and the Today-tab sort/grouping rule before any UI work.
```
