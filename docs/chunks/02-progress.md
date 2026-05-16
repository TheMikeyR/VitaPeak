# Chunk 02 — In-Progress Tracker

Live progress log for `docs/chunks/02-body-map-check-in.md`. **Updated after every commit / phase boundary.** A fresh Claude session can pick up by reading this file + the chunk file + referenced ADRs.

- **Branch**: `claude/chunk-02-body-map`
- **Static plan**: inline (see "Locked decisions resolved in plan mode" + "Phase progress" below — no separate plan file)
- **Last update**: 2026-05-16
- **Current phase**: 4 (`API e2e tests`)
- **Token-budget hint**: medium

---

## Resumption instructions for a fresh session

```
Read in this order:
1. docs/PLAN.md  (skim the locked decisions table, esp. body-map data model)
2. docs/chunks/02-body-map-check-in.md  (the chunk spec)
3. docs/chunks/02-progress.md  (THIS FILE — what is done, what is next)
4. docs/decisions/0001-body-svg-source.md (spike ADR)
5. docs/decisions/0007-i18n-danish-primary.md (i18n rule)

DO NOT re-enter plan mode. Decisions are locked below.
Resume at the "Next concrete step" section.
```

---

## Locked decisions resolved in plan mode

| Decision                | Pick                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taxonomy                | **44 regions from spike `apps/mobile/assets/body/regions.json` as-is** (31 front + 13 back, coarse — no L4-L5 sub-regions; deeper hierarchy is Phase 2 of PLAN.md)          |
| `mood` field on CheckIn | **Keep optional 1–5** (matches PLAN.md schema; surfaced on review screen)                                                                                                   |
| Pain type granularity   | **Per region** — each `PainPoint` carries its own `painType` + `level`                                                                                                      |
| Maestro auth approach   | **Combo: real Better-Auth login + dev quick-login button** gated by `EXPO_PUBLIC_DEV_QUICK_LOGIN=true` that pre-fills seeded client creds. Maestro flow exercises real form |
| Seeded client           | `db:seed` adds `client@vitapeak.local` (Better-Auth signup + `Client` row in demo clinic, linked to seeded therapist)                                                       |
| Tenancy extension scope | Add **`CheckIn`** (has `clinicId`). `PainPoint` covered transitively via parent CheckIn (no `clinicId` column). `BodyRegion` is system-shared — bypassed                    |
| i18n keys               | New namespaces: `checkIn.*`, `painType.*`, `history.*`, `bodyRegion.<slug>` — added to `da.json` + `en.json`                                                                |
| SVG implementation      | `react-native-svg` (reuse PoC at `apps/mobile/app/(poc)/body-tap-poc.tsx`)                                                                                                  |

## Implementation deviations from chunk spec

- **`CheckInsService` takes `clinicId` explicitly** (not relying on the Prisma tenancy extension to inject it on create). Reason: Prisma's `defineExtension` with `$allOperations` typed as `any` erases the model-specific return type, and forces the `data:` shape to include `clinicId` statically. Mirrors how `ClinicsService` passes `clinicId` to `Therapist.create` in chunk 01. Tenancy extension still acts as a belt-and-braces guard for `findMany`/`findUnique` (the read paths).
- **`prisma.client.checkIn.create({ include: { painPoints: true } })` cast at the call site** to a hand-narrowed `CheckInWithPoints` shape — the extension's `any` query type erases the include-narrowed return.

---

## Phase progress

### ✅ Phase 1 — Prisma schema + seed + tenancy extension (commit `eb5a561`)

- `packages/db/prisma/schema.prisma` gained enums `Side` + `PainType` and models `BodyRegion`, `CheckIn`, `PainPoint`. `Client` gained `checkIns CheckIn[]` back-relation. `CheckIn` has `@@index([clientId, occurredAt(sort: Desc)])` + `@@index([clinicId, occurredAt(sort: Desc)])`; `PainPoint` cascades on `CheckIn` delete.
- Migration `20260516075650_body_map_and_check_ins` applied (PG advisory lock 72707369 was stuck from a killed prior session — terminated with `pg_terminate_backend` then migration succeeded).
- `packages/db/data/body-regions.json` is a verbatim copy of `apps/mobile/assets/body/regions.json` (44 regions). Decouples seed from `apps/mobile` package path.
- `packages/db/prisma/seed.ts` now: (1) upserts all 44 `BodyRegion` rows in parent-first order, (2) signs up `client@vitapeak.local` via Better-Auth, (3) creates a `Client` row linked to the demo therapist's clinic with `acceptedAt = now`. Idempotent: re-runs reuse existing user/client rows.
- `apps/api/src/db/tenancy.extension.ts` `TENANT_BOUND_MODELS` now includes `CheckIn`. `PainPoint` reaches tenancy transitively via `CheckIn` joins; `BodyRegion` is system-shared and bypasses.
- Verified: `pnpm db:seed` reports 44 regions + client created. `pnpm typecheck` passes across all 12 workspace tasks.

### ✅ Phase 2 — ts-rest contracts (commit `748cc1d`)

- `packages/contracts/src/body-regions.ts` — `SideSchema`, `BodyRegionItemSchema`, `bodyRegionsListRoute` (`GET /api/body-regions`). `bodyRegionsContract.list`.
- `packages/contracts/src/check-ins.ts` — `PainTypeSchema`, `PainPointInputSchema`, `CreateCheckInBodySchema` (mood 1–5, notes ≤2000, ≥1 painPoints; level 0–10), `CheckInItemSchema`, `ListCheckInsQuerySchema` (from/to/limit coerce-int 1–200). Routes: `POST /api/check-ins` (201/400/401/403), `GET /api/check-ins` (200/401/403).
- `packages/contracts/src/index.ts` registers `bodyRegions` + `checkIns` sub-routers and re-exports everything.
- Verified: `pnpm --filter @vitapeak/contracts build` + `pnpm typecheck` (12/12 green).

### ✅ Phase 3 — API check-ins + body-regions modules (commit `<PHASE3_SHA>`)

- `apps/api/src/modules/body-regions/` — `BodyRegionsController` with `@TsRestHandler(bodyRegionsListRoute)`. `AuthGuard` only (BodyRegion is system-shared; not in `TENANT_BOUND_MODELS` so tenancy extension bypasses). Returns 44 regions ordered by `[displayLayer, id]`.
- `apps/api/src/modules/check-ins/` — `CheckInsService` (`createForClient`, `listForClient`) + `CheckInsController` (`AuthGuard` + `TenantGuard` + `@Audit('checkin.submit' | 'checkin.list')`). Role-check rejects therapist callers with 403. `createForClient` pre-validates every `bodyRegionId` exists → 400 with the missing ids listed. CheckIn create receives `clinicId` + `clientId` explicitly; nested `painPoints.create` for each pain point.
- `AppModule` imports `BodyRegionsModule` + `CheckInsModule`.
- Verified: `pnpm typecheck` (12/12 green). Live smoke deferred to Phase 4's supertest-based e2e.

### 🟡 Phase 4 — API e2e tests (NEXT)

`apps/api/test/e2e/check-in.e2e-spec.ts`: happy path (POST + GET), validation 400s (level=11, unknown regionId, empty painPoints), cross-tenant 403 (client A cannot see client B's check-ins), `GET /body-regions` returns 44 rows.

### ⬜ Phase 5 — Mobile BodyMap component

`apps/mobile/src/components/BodyMap/{BodyMap,svg-front,svg-back,regions}.tsx`. Front/back tabs, tap → select region(s), highlight state. Reuse PoC tap logic. i18n labels via `bodyRegion.<slug>`.

### ⬜ Phase 6 — Mobile check-in flow

`apps/mobile/app/(client)/check-in/{index,details,review}.tsx`. Step 1: BodyMap select. Step 2: per-region painType + level slider + notes. Step 3: review (mood 1–5 + check-in notes) + submit. React Query mutation with optimistic add + rollback on error.

### ⬜ Phase 7 — Mobile history screens

`apps/mobile/app/(client)/history/{index,[id]}.tsx`. List by date desc, summary chip per region. Detail screen lists all pain points.

### ⬜ Phase 8 — Maestro e2e + dev quick-login

`apps/mobile/.maestro/check-in.flow.yaml`. Dev quick-login button on `(auth)/login.tsx` gated by `EXPO_PUBLIC_DEV_QUICK_LOGIN=true`. Maestro: launch → quick-login as seeded client → tap "Check in" → tap front body view → tap lower back → select "Sharp" → slider 7 → next → submit → assert "Check-in saved" toast.

### ⬜ Phase 9 — Acceptance + PR

Run all chunk acceptance criteria. Update `docs/chunks/02-body-map-check-in.md` Status line. `git push origin claude/chunk-02-body-map && gh pr create`.

---

## Next concrete step

**Start Phase 4 — API e2e tests.**

1. Create `apps/api/test/e2e/check-in.e2e-spec.ts` (model after the existing `auth.e2e-spec.ts`):
   - `beforeAll`: build `AppModule` testing module, mount Better-Auth handler the way `main.ts` does, run `pnpm db:seed` (or recreate equivalent rows in-test).
   - **Body regions**: GET `/api/body-regions` with the seeded client's JWT → 200, `regions.length === 44`. Without JWT → 401.
   - **Happy path**: sign up a fresh client via invite, exchange JWT, POST `/api/check-ins` with 2 pain points → 201, returned body has `painPoints.length === 2`. GET `/api/check-ins` → 200, `checkIns.length === 1`, sorted desc by `occurredAt`.
   - **Validation**: POST with `level: 11` → 400. POST with `bodyRegionId: 'nonexistent'` → 400 with message naming the unknown ids. POST with `painPoints: []` → 400.
   - **Cross-tenant**: in clinic B, sign up another therapist + client. Client B GET `/api/check-ins` → 200, empty array (does not see client A's data). Client B's CheckIn ID against client A's filter set → also empty.
   - **Role gating**: therapist JWT POST `/api/check-ins` → 403. Therapist JWT GET `/api/check-ins` → 403.
2. Run `pnpm --filter @vitapeak/api test:e2e` (uses vitest, sequential `pool: 'forks'`, `maxWorkers: 1`).
3. Commit: `test(api): e2e for check-ins + body-regions` — include this progress file update.
4. Update this file: Phase 4 → ✅ + SHA, Phase 5 → 🟡 with first 1–3 sub-steps.

---

## How to update this file

After every commit (or every phase boundary if commits are mid-phase):

1. Move the just-completed phase to ✅ with commit SHA + 1–3 line summary.
2. Move the next phase to 🟡 (in progress) and list the first 1–3 sub-steps.
3. Update the **Next concrete step** section with one paragraph the resuming agent can execute immediately.
4. Update the `Last update` date + `Current phase` + `Token-budget hint` at the top.
5. Commit the progress file change **as part of the work commit** (no separate `docs: update progress` commits — keep history clean).

## Token-budget discipline

- **Before starting a phase**: if the phase looks larger than the remaining budget, stop and update this file first — do **not** start a phase you cannot finish + commit + log.
- **At every commit**: update this file in the same commit so resumption is atomic.
- **At session end / handoff**: leave the `Current phase` line, `Token-budget hint`, and **Next concrete step** section accurate enough that a cold session can resume without asking questions.
