# Chunk 02 — Body map + pain check-in (mobile)

Status: ⬜ not started
Plan mode: **REQUIRED** — confirm 40-region taxonomy + UX flow before coding.
Pre-req: spike-svg-source ADR accepted.

## Goal
Build the interactive 2D body map (front + back, ~40 hierarchical regions) and the full pain check-in flow in the Expo app. Persist check-ins via API. Pain history list visible to the client.

## Prerequisites
- Chunk 00 (scaffold)
- Chunk 01 (auth + tenant model)

## Context for fresh session
Auth works. A client can log in. They land in `(client)` group with empty tabs. This chunk adds the central feature: tap a body region → pick pain type → set level → add notes → submit. Data goes to backend tied to client+clinic. Pain history list (chronological) renders own data.

## Locked decisions (see PLAN.md)
- 2D body map only (Phase 1). Data model supports Phase 2/3 later.
- ~40 regions (front + back), hierarchical (`torso > lumbar > L4-L5` etc.).
- Pain types: `BURNING`, `SHARP`, `RADIATING`, `DULL`, `ACHING`, `TINGLING`.
- Level: integer 0–10.
- Optional `x,y` free-tap coords stored even when a named region is selected.
- One `CheckIn` can have many `PainPoint`s (multiple regions per submission).
- SVG implementation: `react-native-svg`. Compatible with `react-native-web` for future web port.
- Region taxonomy lives in DB (`BodyRegion`) — seeded at install.

## Scope (in)
- `BodyRegion` Prisma model + seed (~40 regions, parent/child, front/back layer).
- `CheckIn` + `PainPoint` Prisma models with proper indexes (`clientId, occurredAt DESC`).
- ts-rest contract: `POST /check-ins`, `GET /check-ins?clientId=...&from=...&to=...`, `GET /body-regions`.
- NestJS `check-ins` module + `body-regions` module.
- Validation (Zod): regionId must exist; level 0–10; painType in enum; notes max 2000 chars.
- Expo `BodyMap` component (SVG, front/back tabs, tap → highlight region).
- Expo check-in flow: 3 steps — select region(s) → per-region set type+level+notes → review & submit.
- Expo history screen: list of past check-ins (date + summary), tap → detail.
- Local cache via React Query. Optimistic submit, rollback on error.
- Maestro flow: `apps/mobile/.maestro/check-in.flow.yaml`.

## Scope (out)
- Web heatmap / charts (chunk 03)
- Detailed sub-region drill-down UI (Phase 2, post-MVP)
- 3D body model (Phase 3, post-MVP)
- Push reminders to do a check-in (chunk 06)
- Therapist viewing client check-ins (chunk 03)
- Module gating from program template (chunk 05) — for now check-in is always on

## Files to create / modify
- `packages/db/prisma/schema.prisma` — add `BodyRegion`, `CheckIn`, `PainPoint`, `PainType` enum
- `packages/db/prisma/seed.ts` — extend with body-region seed
- `packages/db/data/body-regions.ts` — ~40 region definitions (id, parent, label, side, layer, svg path id)
- `packages/contracts/src/check-ins.ts`
- `packages/contracts/src/body-regions.ts`
- `apps/api/src/modules/check-ins/check-ins.controller.ts` + service + dto
- `apps/api/src/modules/body-regions/body-regions.controller.ts`
- `apps/api/test/e2e/check-in.e2e-spec.ts`
- `apps/mobile/src/components/BodyMap/BodyMap.tsx`
- `apps/mobile/src/components/BodyMap/svg-front.tsx` (or static SVG asset + regions overlay)
- `apps/mobile/src/components/BodyMap/svg-back.tsx`
- `apps/mobile/src/components/BodyMap/regions.ts` (slug → svg path mapping)
- `apps/mobile/app/(client)/check-in/index.tsx`
- `apps/mobile/app/(client)/check-in/details.tsx` — per-region type/level/notes
- `apps/mobile/app/(client)/check-in/review.tsx`
- `apps/mobile/app/(client)/history/index.tsx`
- `apps/mobile/app/(client)/history/[id].tsx`
- `apps/mobile/src/api/check-ins.ts` (React Query hooks against ts-rest client)
- `apps/mobile/.maestro/check-in.flow.yaml`

## Implementation notes
- SVG source: hand-curate or use an MIT-licensed anatomical SVG (e.g. derived from `human-body-svg` or commissioned). Each region must have a stable `id` attribute matching its `BodyRegion.id` slug.
- Touch target sizing: regions <44pt² should expand hit-area via `hitSlop` or a wrapping `<G>` with larger invisible path.
- Color states: idle (light fill), selected (accent), with-existing-pain (gradient by level for history overlay).
- Pain-level slider: native `Slider` from `@react-native-community/slider` or shadcn-equivalent for RN.
- Submission payload:
  ```ts
  {
    occurredAt: ISO,
    mood?: 1..5,
    notes?: string,
    painPoints: Array<{
      bodyRegionId: string,
      painType: PainType,
      level: 0..10,
      x?: number, y?: number,
      notes?: string,
    }>
  }
  ```
- Index strategy: `@@index([clientId, occurredAt(desc)])` on `CheckIn`. `@@index([checkInId])` on `PainPoint`.
- Therapist endpoint to read client check-ins is **out of scope here** — added in chunk 03.
- E2E (Maestro): launch → login as seeded client → tap "Check in" → tap front body view → tap lower-back region → tap "Sharp" → drag slider to 7 → continue → submit → assert "Check-in saved" toast.

## Acceptance criteria
- [ ] `pnpm db:seed` populates ~40 body regions; query returns hierarchical tree.
- [ ] Client app: pain check-in flow completes end-to-end in < 60s.
- [ ] Submitting a check-in creates one `CheckIn` row + N `PainPoint` rows.
- [ ] History screen lists check-ins with date + region summary; detail shows all pain points.
- [ ] Cross-tenant guard: client cannot read another client's check-ins (manual test).
- [ ] Validation: level 11 → 400; unknown regionId → 400.
- [ ] `pnpm test:e2e:api` passes for check-in tests.
- [ ] `maestro test apps/mobile/.maestro/check-in.flow.yaml` passes.
- [ ] No regression: chunks 00/01 acceptance still pass.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/02-body-map-check-in.md. Begin by proposing the 40-region
taxonomy (slug, parent, label, layer) as a single TS file. Wait for my OK
before generating SVGs or running migrations.
```
