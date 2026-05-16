# Chunk 02 — In-Progress Tracker

Live progress log for `docs/chunks/02-body-map-check-in.md`. **Updated after every commit / phase boundary.** A fresh Claude session can pick up by reading this file + the chunk file + referenced ADRs.

- **Branch**: `claude/chunk-02-body-map`
- **Static plan**: inline (see "Locked decisions resolved in plan mode" + "Phase progress" below — no separate plan file)
- **Last update**: 2026-05-16
- **Current phase**: ✅ chunk complete (Phases 8 + 9 landed)
- **Token-budget hint**: low (chunk done)

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

### ✅ Phase 4 — API e2e tests (commit `4786c71`)

- `apps/api/test/e2e/check-in.e2e-spec.ts` — 10 cases: `GET /body-regions` 401 without JWT + 200 with 44 rows (client + therapist JWT both, since BodyRegion is system-shared), happy-path POST (2 pain points persisted) + GET (desc by `occurredAt`), validation (`level=11`, unknown `bodyRegionId` with id in error message, empty `painPoints[]`), cross-tenant isolation (client B sees empty list), role gating (therapist POST/GET → 403).
- Test seeds the 44 `BodyRegion` rows in-test (`runWithSystemContext` + upsert in root-then-child order, reading `packages/db/data/body-regions.json` via `fs`) so the suite is independent of `pnpm db:seed`.
- Bootstrap creates 2 clinics + 2 clients via the real invite flow (`/auth/sign-up/email` → `/api/clinics/signup` → `/api/invites/create` → `/api/invites/accept` → `/auth/sign-in/email` → `/auth/token`) — exercises the chunk 01 path end-to-end.
- `pnpm --filter @vitapeak/api test`: 19/19 green (auth e2e + check-in e2e + 1 unit). `pnpm typecheck`: 12/12 green.

### ✅ Phase 5 — Mobile BodyMap component (commit `9c2ee43`)

- `apps/mobile/src/components/BodyMap/`:
  - `regions.ts` — shape data per view (front 31, back 35 — shoulders/arms/hands/feet appear on both). Discriminated union `RegionShape = ellipse | rect | path`. `BODY_VIEWBOX = '0 0 200 470'`. `regionI18nKey(id)` flattens dotted slugs (`shoulder.left` → `bodyRegion.shoulder_left`) to dodge i18next's `.` keySeparator.
  - `body-svg.tsx` — shared `<Svg>` renderer; toggles `fill`/`stroke` on `selected`. Scapulae keep their `#e0e0e0` idle tint when not selected (matches PoC). `accessibilityLabel` from i18n.
  - `svg-front.tsx` + `svg-back.tsx` — thin wrappers binding `BodySvg` to `FRONT_SHAPES` / `BACK_SHAPES`.
  - `BodyMap.tsx` — front/back tab pressables + render the chosen `SvgComponent`. Props: `selected: ReadonlySet<string>`, `onToggleRegion(id)`, optional `initialView`/`width`/`height`. Internal state for active view only — selection is controlled by parent (check-in flow drives it).
  - `index.ts` re-exports.
- `packages/i18n/src/locales/{da,en}.json` — `bodyMap.{front,back}` + flat `bodyRegion.<key>` map covering all 44 ids (Danish translations on the `da` side).
- `apps/mobile/app/(poc)/body-map-dev.tsx` — visual smoke harness wiring `BodyMap` to local `Set<string>` state, listing selected ids + labels. Route: `/(poc)/body-map-dev`.
- Verified: `pnpm typecheck` (12/12 green). Live web smoke deferred to user via `dev.rontved.com` → `/(poc)/body-map-dev`. Pre-existing lint nit in `body-tap-poc.tsx` (`G` unused) is unrelated and out of scope here.

### ✅ Phase 6 — Mobile check-in flow (commit `e6baff1`)

- `apps/mobile/src/query/client.ts` + `app/_layout.tsx` — `QueryClientProvider` wraps `AuthGate` (split from `RootLayout`). Defaults: retry=1, no window-focus refetch, 30s staleTime.
- `apps/mobile/src/api/check-ins.ts` — `useCheckIns()` (`GET /api/check-ins`) + `useSubmitCheckIn()` (POST). Optimistic insert into `['check-ins']` cache + rollback on error via `onMutate`/`onError`/`onSuccess` (swaps optimistic row for server row by `optimisticId`). `onSettled` invalidates so a subsequent fetch reconciles.
- `apps/mobile/src/state/check-in-draft.ts` — module-scoped `useSyncExternalStore` draft shared across the three flow screens. Exposes `toggleRegion`, `updatePainPoint`, `setMood`, `setNotes`, `buildPainPointsPayload`, `resetDraft`. Default `painType=ACHING`, `level=5` for a freshly-tapped region.
- `apps/mobile/app/(client)/check-in/{index,details,review}.tsx` — three steps:
  - **Step 1 / `index.tsx`**: `BodyMap` driven by `useCheckInDraft().selectedRegions`; "Continue" disabled until ≥1. `useEffect(resetDraft, [])` on mount clears the draft.
  - **Step 2 / `details.tsx`**: per-region card → 6 painType chips, `@react-native-community/slider` (0–10, step=1), optional notes (max 2000). Updates via `updatePainPoint`.
  - **Step 3 / `review.tsx`**: lists each pain point summary, mood 1–5 chip row (toggleable, optional), check-in-level notes. Submit → `useSubmitCheckIn.mutateAsync(...)` → `Alert.alert(t('checkIn.saved'))` → `router.replace('/(client)/history')`.
- `apps/mobile/app/(client)/history/index.tsx` — Phase-7 stub (empty state copy) so `review.tsx`'s post-submit redirect doesn't crash.
- `apps/mobile/app/(client)/index.tsx` — added "New check-in" + "View history" CTAs that navigate into the flow.
- i18n: `checkIn.*` (home/step/selectRegions/details/review + `selectedCount_one|_other`), `painType.<ENUM>`, `history.*` keys added to `da.json` + `en.json`.
- Deps: `@tanstack/react-query@^5.100`, `@react-native-community/slider@4.5.5`, `@vitapeak/contracts@workspace:*` added to `apps/mobile`.
- Verified: `pnpm typecheck` (12/12 green). Live web smoke deferred to user.

### ✅ Phase 7 — Mobile history screens (commit `HEAD` — see `git log` for SHA)

- `apps/mobile/app/(client)/history/index.tsx` — `useCheckIns()` → `FlatList` of cards. Each card: `Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })` for `occurredAt`, dedup chip row of region labels (`regionI18nKey`), mood pill when present. States: `isLoading` → `ActivityIndicator` + `history.loading`; `isError` → `history.loadFailed` + retry button (`refetch()`); empty (`checkIns.length === 0`) → `history.empty`. `onRefresh` wired to `refetch()`. Tap card → `router.push({ pathname: '/(client)/history/[id]', params: { id } })`.
- `apps/mobile/app/(client)/history/[id].tsx` — `useLocalSearchParams<{ id: string }>` + `useCheckIns()` → find by id in cached list (no separate fetch — list is the source of truth). Renders: date header, pain-points card (each row: region label + `painType` badge + `level/10` + per-point notes when present), meta card (mood pill + check-in notes) only when at least one is set. Missing id → `history.notFound` + back button to `/(client)/history`.
- `packages/i18n/src/locales/{da,en}.json` — added `history.{retry,notFound,back,painPoints,mood,notes,painNotes,noPoints}`.
- Verified: `pnpm typecheck` (12/12 green). Live web smoke deferred to user.

### ✅ Phase 8 — Maestro e2e + dev quick-login (commit `HEAD` — combined with Phase 9)

- `apps/mobile/app/(auth)/login.tsx` — dev quick-login button gated by `process.env.EXPO_PUBLIC_DEV_QUICK_LOGIN === 'true'`. Hard-codes the seeded `client@vitapeak.local` / `demo-password-123` from `packages/db/prisma/seed.ts` and goes through the same `/auth/sign-in/email` → `signInWithSession` path the form uses. `testID="dev-quick-login"`.
- `testID`s added to the flow's tap targets: `home-new-checkin`, `body-tab-front`, `body-tab-back`, `region-<slug>` on every region (via `body-svg.tsx`), `pain-type-<TYPE>-<regionId>` on each pain-type chip, `checkin-step1-continue`, `checkin-step2-continue`, `checkin-submit`. Locale-agnostic selectors so the Maestro flow doesn't depend on Danish vs English text.
- `apps/mobile/.maestro/check-in.flow.yaml` — launch (clearState) → quick-login → home `New check-in` → back tab → `region-lower-back` → continue → `pain-type-SHARP-lower-back` (slider left at default 5; Maestro slider drags are flaky and API accepts any 0–10) → continue → submit → assert Danish `Check-in gemt` native alert.
- Maestro CLI is not installed on the dev VPS, so the flow is committed but not executed in CI here. Run locally with `maestro test apps/mobile/.maestro/check-in.flow.yaml` after `EXPO_PUBLIC_DEV_QUICK_LOGIN=true pnpm --filter @vitapeak/mobile dev` + `pnpm --filter @vitapeak/db db:seed`.
- Verified: `pnpm typecheck` (12/12 green), `pnpm --filter @vitapeak/api test` (19/19 green).

### ✅ Phase 9 — Acceptance + PR (commit `HEAD` — combined with Phase 8)

- Chunk spec `docs/chunks/02-body-map-check-in.md` Status flipped to ✅ done. Acceptance checklist updated — 8/9 boxes checked; the only unchecked box is the live Maestro run (CLI unavailable on dev VPS — flow file present and ready).
- No code regression: `pnpm --filter @vitapeak/api test` (19/19), `pnpm typecheck` (12/12).
- Branch pushed; PR opened via `gh pr create` (URL in the commit's parent message body).

---

## Next concrete step

**Chunk 02 is done.** A fresh session should pick the next chunk from `docs/chunks/README.md` — most likely `docs/chunks/03-pain-trends-web.md` (therapist trends + heatmap on web, which consumes the check-in data persisted here).

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
