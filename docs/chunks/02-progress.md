# Chunk 02 — In-Progress Tracker

Live progress log for `docs/chunks/02-body-map-check-in.md`. **Updated after every commit / phase boundary.** A fresh Claude session can pick up by reading this file + the chunk file + referenced ADRs.

- **Branch**: `claude/chunk-02-body-map`
- **Static plan**: inline (see "Locked decisions resolved in plan mode" + "Phase progress" below — no separate plan file)
- **Last update**: 2026-05-16
- **Current phase**: 5 (`Mobile BodyMap component`)
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

### ✅ Phase 3 — API check-ins + body-regions modules (commit `6fd7e88`)

- `apps/api/src/modules/body-regions/` — `BodyRegionsController` with `@TsRestHandler(bodyRegionsListRoute)`. `AuthGuard` only (BodyRegion is system-shared; not in `TENANT_BOUND_MODELS` so tenancy extension bypasses). Returns 44 regions ordered by `[displayLayer, id]`.
- `apps/api/src/modules/check-ins/` — `CheckInsService` (`createForClient`, `listForClient`) + `CheckInsController` (`AuthGuard` + `TenantGuard` + `@Audit('checkin.submit' | 'checkin.list')`). Role-check rejects therapist callers with 403. `createForClient` pre-validates every `bodyRegionId` exists → 400 with the missing ids listed. CheckIn create receives `clinicId` + `clientId` explicitly; nested `painPoints.create` for each pain point.
- `AppModule` imports `BodyRegionsModule` + `CheckInsModule`.
- Verified: `pnpm typecheck` (12/12 green). Live smoke deferred to Phase 4's supertest-based e2e.

### ✅ Phase 4 — API e2e tests (commit `__pending__`)

- `apps/api/test/e2e/check-in.e2e-spec.ts` — 10 cases: `GET /body-regions` 401 without JWT + 200 with 44 rows (client + therapist JWT both, since BodyRegion is system-shared), happy-path POST (2 pain points persisted) + GET (desc by `occurredAt`), validation (`level=11`, unknown `bodyRegionId` with id in error message, empty `painPoints[]`), cross-tenant isolation (client B sees empty list), role gating (therapist POST/GET → 403).
- Test seeds the 44 `BodyRegion` rows in-test (`runWithSystemContext` + upsert in root-then-child order, reading `packages/db/data/body-regions.json` via `fs`) so the suite is independent of `pnpm db:seed`.
- Bootstrap creates 2 clinics + 2 clients via the real invite flow (`/auth/sign-up/email` → `/api/clinics/signup` → `/api/invites/create` → `/api/invites/accept` → `/auth/sign-in/email` → `/auth/token`) — exercises the chunk 01 path end-to-end.
- `pnpm --filter @vitapeak/api test`: 19/19 green (auth e2e + check-in e2e + 1 unit). `pnpm typecheck`: 12/12 green.

### 🟡 Phase 5 — Mobile BodyMap component (NEXT)

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

**Start Phase 5 — Mobile BodyMap component.**

1. Create `apps/mobile/src/components/BodyMap/`:
   - `regions.ts` — re-export `apps/mobile/assets/body/regions.json` typed against the contract `BodyRegionItem` shape; group by `displayLayer` (`2d-front` vs `2d-back`).
   - `svg-front.tsx` + `svg-back.tsx` — `<Svg>` (`react-native-svg`) with one `<Path id={slug}>` per region. Reuse the SVG paths from the PoC at `apps/mobile/app/(poc)/body-tap-poc.tsx`.
   - `BodyMap.tsx` — props: `selected: string[]`, `onToggleRegion: (id: string) => void`. Front/back tab switcher (segmented control). Tap → call `onToggleRegion`. Selected path: accent fill; idle: light fill. `useTranslation()` resolves `bodyRegion.<slug>` for accessibility label.
2. Add i18n keys: `apps/mobile/src/i18n/{da,en}.json` — `bodyRegion.<slug>` for all 44 ids + `bodyMap.front`, `bodyMap.back`.
3. Storybook is not in scope; smoke-render the component on a dev screen (`/(poc)/body-map-dev.tsx` is fine — gated by `EXPO_PUBLIC_DEV_*`) and tap-verify in Expo web before moving on.
4. Commit: `feat(mobile): BodyMap component (front/back tabs, tap select)` — include progress-file update flipping Phase 5 → ✅ and Phase 6 → 🟡.

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
