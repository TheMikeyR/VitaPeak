# Chunk 02 — In-Progress Tracker

Live progress log for `docs/chunks/02-body-map-check-in.md`. **Updated after every commit / phase boundary.** A fresh Claude session can pick up by reading this file + the chunk file + referenced ADRs.

- **Branch**: `claude/chunk-02-body-map`
- **Static plan**: inline (see "Locked decisions resolved in plan mode" + "Phase progress" below — no separate plan file)
- **Last update**: 2026-05-16
- **Current phase**: 2 (`ts-rest contracts`)
- **Token-budget hint**: small

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

- (none yet)

---

## Phase progress

### ✅ Phase 1 — Prisma schema + seed + tenancy extension (commit `<PHASE1_SHA>`)

- `packages/db/prisma/schema.prisma` gained enums `Side` + `PainType` and models `BodyRegion`, `CheckIn`, `PainPoint`. `Client` gained `checkIns CheckIn[]` back-relation. `CheckIn` has `@@index([clientId, occurredAt(sort: Desc)])` + `@@index([clinicId, occurredAt(sort: Desc)])`; `PainPoint` cascades on `CheckIn` delete.
- Migration `20260516075650_body_map_and_check_ins` applied (PG advisory lock 72707369 was stuck from a killed prior session — terminated with `pg_terminate_backend` then migration succeeded).
- `packages/db/data/body-regions.json` is a verbatim copy of `apps/mobile/assets/body/regions.json` (44 regions). Decouples seed from `apps/mobile` package path.
- `packages/db/prisma/seed.ts` now: (1) upserts all 44 `BodyRegion` rows in parent-first order, (2) signs up `client@vitapeak.local` via Better-Auth, (3) creates a `Client` row linked to the demo therapist's clinic with `acceptedAt = now`. Idempotent: re-runs reuse existing user/client rows.
- `apps/api/src/db/tenancy.extension.ts` `TENANT_BOUND_MODELS` now includes `CheckIn`. `PainPoint` reaches tenancy transitively via `CheckIn` joins; `BodyRegion` is system-shared and bypasses.
- Verified: `pnpm db:seed` reports 44 regions + client created. `pnpm typecheck` passes across all 12 workspace tasks.

### 🟡 Phase 2 — ts-rest contracts (NEXT)

`packages/contracts/src/{check-ins,body-regions}.ts`. zod schemas: `CreateCheckIn`, `CheckInItem`, `PainPointItem`, `BodyRegionItem`. Routes: `POST /check-ins`, `GET /check-ins`, `GET /body-regions`. Export from `index.ts`.

### ⬜ Phase 3 — API check-ins + body-regions modules

`apps/api/src/modules/{check-ins,body-regions}/`. `@TsRestHandler(route)` + `tsRestHandler(route, async ({ body }) => ...)`. `AuthGuard` + `TenantGuard`. `@Audit('checkin.submit' | 'checkin.list')`. Wire into `AppModule`.

### ⬜ Phase 4 — API e2e tests

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

**Start Phase 2 — ts-rest contracts.**

1. Create `packages/contracts/src/body-regions.ts`:
   - `BodyRegionItemSchema = z.object({ id, parentId, side: z.enum(['LEFT','RIGHT','CENTER']).nullable(), displayLayer, label })`.
   - `bodyRegionsListRoute = c.query({ method: 'GET', path: '/api/body-regions', responses: { 200: z.object({ regions: z.array(BodyRegionItemSchema) }), 401: ... } })`.
   - Export `bodyRegionsContract = c.router({ list: bodyRegionsListRoute })`.
2. Create `packages/contracts/src/check-ins.ts`:
   - `PainTypeSchema = z.enum(['BURNING','SHARP','RADIATING','DULL','ACHING','TINGLING'])`.
   - `PainPointInputSchema = z.object({ bodyRegionId, painType: PainTypeSchema, level: z.number().int().min(0).max(10), x: z.number().optional(), y: z.number().optional(), notes: z.string().max(2000).optional() })`.
   - `CreateCheckInBodySchema = z.object({ occurredAt: z.string().datetime().optional(), mood: z.number().int().min(1).max(5).optional(), notes: z.string().max(2000).optional(), painPoints: z.array(PainPointInputSchema).min(1) })`.
   - `CheckInItemSchema` (response shape with id + occurredAt + painPoints[]).
   - `checkInsCreateRoute = c.mutation({ method: 'POST', path: '/api/check-ins', body: ..., responses: { 201, 400, 401, 403 } })`.
   - `checkInsListRoute = c.query({ method: 'GET', path: '/api/check-ins', query: z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), limit: z.coerce.number().int().min(1).max(200).optional() }), responses: { 200: z.object({ checkIns: z.array(CheckInItemSchema) }) } })`.
3. Update `packages/contracts/src/index.ts` to register `bodyRegions` + `checkIns` sub-routers + re-export everything.
4. `pnpm --filter @vitapeak/contracts build && pnpm typecheck` (must stay green — adding the contracts before consumers shouldn't break anything).
5. Commit: `feat(contracts): check-ins + body-regions ts-rest contracts` — include this progress file update.
6. Update this file: Phase 2 → ✅ + SHA, Phase 3 → 🟡 with first 1–3 sub-steps.

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
