# Chunk 10 — HealthKit + Health Connect ingest (mobile + API)

Status: ⬜ not started
Plan mode: **REQUIRED** — permission UX, sync cadence, data-type allowlist, and consent wording all need explicit decisions before code.

## Goal
Read activity, sleep, resting heart rate, HRV, and workout data from iOS HealthKit and Android Health Connect on the client mobile app. Normalize, deduplicate, and store on the API. Overlay on pain-trend charts in the therapist web UI.

## Prerequisites
- Chunk 02 (check-ins + body map): the data model + pain charts that health metrics will overlay against.
- Chunk 05 (program templates + config gating): `healthIntegration` config block must exist so the feature can be toggled per client/clinic.
- Chunk 07 (consent records): `ConsentRecord` table must accept the `health_data_sync` type before this chunk runs end-to-end.

## Context for fresh session
Pain check-ins exist (chunk 02). Therapist sees pain trends (chunk 03). Program templates gate which modules render (chunk 05). Consent records are in place (chunk 07). This chunk adds the missing biometric dimension: client's phone reads device-aggregated health data and ships it to the API for the therapist to correlate with pain.

Read ADR 0006 first. It pins data types, sync cadence, consent model, and platform constraints.

## Locked decisions (see ADR 0006 + PLAN.md)
- Read-only ingest. No write-back to HealthKit or Health Connect.
- Platforms: iOS HealthKit + Android Health Connect. No third-party SDKs, no Garmin/Whoop/Fitbit.
- Data types (MVP): steps, sleep duration, resting HR, HRV (RMSSD), workouts (type + duration). Nothing else.
- Foreground-only sync. On app open + manual pull-to-refresh. No background tasks.
- Server dedupes by `(clientId, source, externalId)` unique index.
- Consent: explicit `ConsentRecord` of type `health_data_sync` granted once before any sync request is accepted by the API.
- Module gating: `effectiveConfig.modules.healthIntegration === true` required for ingest endpoint to accept writes.
- Audit log captures sync batch summary (counts per type), never raw sample values.
- Sub-processors list adds Apple + Google with documented posture (data flows device → our server directly).

## Open decisions (surface in plan mode)
- **Library choice for HealthKit**: `react-native-health` (community, mature) vs `expo-health-kit` (config-plugin friendly, less mature). Pick one. Document tradeoff in ADR 0006 update.
- **Library choice for Health Connect**: `react-native-health-connect` is effectively the only viable option, confirm version pin.
- **Permission denial UX**: dead-end ("health features unavailable") vs partial grant (sync the data types user did grant). MVP recommendation: partial grant — keep what works.
- **Sleep stage handling**: HealthKit returns inBed + awake + asleep + REM + core + deep as separate samples. Health Connect returns stages inside a single SleepSessionRecord. Normalize to `valueNumeric = totalAsleepSeconds` and store stage breakdown in `valueJson`, or store one row per stage? MVP recommendation: roll up to total asleep, stash stage breakdown in `valueJson` for future use.
- **Workout type taxonomy**: HealthKit and Health Connect have different enum lists. Normalize to a single VitaPeak `WorkoutType` enum, or pass through platform-native strings? MVP recommendation: pass-through string + a `valueJson.platformType` field. Resist premature normalization until therapists ask.
- **iOS testing strategy**: do we have a physical iPhone? Sim has no HealthKit data. If no, scope iOS portion as "code only, ship dark, enable when device available."

## Scope (in)
- Mobile (Expo):
  - Install + Expo config plugin for chosen HealthKit library and `react-native-health-connect`.
  - Permission flow screen under `apps/mobile/app/(client)/insights/connect-health.tsx`. Renders only when `effectiveConfig.modules.healthIntegration === true` AND `ConsentRecord(health_data_sync)` not yet granted.
  - Sync engine `apps/mobile/src/health/sync.ts`:
    - On app open (after login + consent), read since `lastHkSync` / `lastHcSync` per platform.
    - Normalize samples to `{ source, metricType, startAt, endAt, valueNumeric, valueJson, unit, externalId }`.
    - Batch up to 500 samples, POST `/me/health/sync`.
    - Update local `lastSync` only on 2xx.
  - Insights tab `apps/mobile/app/(client)/insights/index.tsx`: simple list of last sync time + per-type counts + manual refresh button.
- API:
  - ts-rest contracts in `packages/contracts/src/health.ts`: `POST /me/health/sync`, `GET /me/health/summary`, `GET /clients/:id/health/timeline` (therapist view).
  - Prisma schema: `HealthMetric`, `HealthSyncState` models + enums.
  - NestJS `health` module under `apps/api/src/modules/health/`:
    - `health.controller.ts` — endpoints above.
    - `health.service.ts` — upsert via `createMany` with `skipDuplicates`, emit `health_sync_total` metric.
    - `health.guard.ts` — verifies `effectiveConfig.modules.healthIntegration === true` for the calling client.
    - `consent.dependency.ts` — guard rejects sync if no `ConsentRecord(health_data_sync, granted=true)` for the user.
- Web (therapist):
  - Update client detail page `apps/web/app/(app)/clients/[id]/page.tsx` to overlay health metrics on the pain timeline chart (chunk 03 chart, extended with secondary y-axes).
  - Simple data toggles: show/hide steps, sleep, resting HR, HRV per axis.
- Config resolution: `healthIntegration` block already exists per chunk 05; this chunk only consumes it.
- Metric emission: `health_sync_total{platform, status}` per ADR 0003.
- Audit log: every sync request writes an `AuditLog` row (counts only, no PHI). Per ADR 0006.

## Scope (out)
- Background sync (defer to v2).
- Write-back to HealthKit / Health Connect.
- Third-party wearable SDKs (Garmin, Whoop, Fitbit, Oura).
- Body weight, body temperature, mindful minutes, blood pressure, blood glucose data types.
- Trend-detection alerting (e.g., "client's resting HR has risen 10% week-over-week" — defer to a future analytics chunk).
- Auto-correlation between health metrics and pain (just visual overlay for MVP; no statistical analysis).
- iOS Apple Watch on-device complications.

## Files to create / modify
- `packages/db/prisma/schema.prisma` — add `HealthMetric`, `HealthSyncState`, `HealthSource`, `HealthMetricType`.
- `packages/contracts/src/health.ts` — new.
- `packages/contracts/src/index.ts` — re-export.
- `packages/validation/src/health.ts` — Zod schemas for sync payload.
- `apps/api/src/modules/health/health.module.ts`
- `apps/api/src/modules/health/health.controller.ts`
- `apps/api/src/modules/health/health.service.ts`
- `apps/api/src/modules/health/health.guard.ts`
- `apps/api/src/modules/audit/audit.interceptor.ts` — extend with `health.sync` action.
- `apps/api/test/e2e/health-sync.e2e-spec.ts`
- `apps/mobile/app.config.ts` — add HealthKit + Health Connect config plugins, iOS `NSHealthShareUsageDescription`, Android Health Connect permissions in manifest.
- `apps/mobile/src/health/types.ts`
- `apps/mobile/src/health/sync.ts`
- `apps/mobile/src/health/permissions.ts`
- `apps/mobile/src/health/platforms/healthkit.ts`
- `apps/mobile/src/health/platforms/health-connect.ts`
- `apps/mobile/app/(client)/insights/connect-health.tsx`
- `apps/mobile/app/(client)/insights/index.tsx`
- `apps/mobile/.maestro/health-sync.flow.yaml`
- `apps/web/app/(app)/clients/[id]/page.tsx` — extend chart with health overlay.
- `apps/web/src/charts/PainHealthTimeline.tsx` — new chart component (extends chunk 03 component).

## Implementation notes
- HealthKit library: at time of writing, `react-native-health` is more battle-tested. `expo-health-kit` may be cleaner with config-plugins but check release activity at chunk-time. Plan-mode prompt should surface this choice.
- Health Connect requires Android 14+ for built-in support. Android 13 users get a prompt to install Health Connect from Play Store. Library handles this — verify in plan mode.
- iOS `NSHealthShareUsageDescription` text: write per ADR 0006 wording exactly. App Review reads this verbatim.
- Android Play Console: Health Connect data declaration form is a manual review step. Submit after MVP code is ready; don't block code on it. Document in chunk 09 deploy runbook.
- API dedupe is the safety net. Mobile sync engine should be optimistic (don't lock UI on response).
- `valueJson` payloads: keep small (< 4 KB). Strip per-second heart-rate streams; we only want the resting-HR summary samples.
- Time zones: store UTC in `startAt` / `endAt`. Capture client tz in `HealthSyncState.timezone` (string IANA) for display.
- Test fixtures: include sample HK + HC payloads in `apps/api/test/fixtures/health-samples.json` so e2e doesn't depend on a physical device.
- Web chart: use Recharts `ComposedChart` with multiple Y-axes. Cap to two visible metric overlays at a time to keep the chart readable.

## Acceptance criteria
- [ ] Schema migrates cleanly; `HealthMetric` unique constraint enforced.
- [ ] ts-rest contract for `POST /me/health/sync` compiles end-to-end (mobile + API + web).
- [ ] Mobile permission screen requests HealthKit (iOS) and Health Connect (Android) access for the five MVP data types.
- [ ] Partial grant works: user denying HRV still syncs steps + sleep + RHR + workouts.
- [ ] API rejects sync when `ConsentRecord(health_data_sync)` is absent (403, body `{ code: "CONSENT_REQUIRED" }`).
- [ ] API rejects sync when client's effective config has `modules.healthIntegration !== true` (403, body `{ code: "MODULE_DISABLED" }`).
- [ ] Re-syncing identical samples returns success and does not create duplicates (`@@unique([clientId, source, externalId])`).
- [ ] `health_sync_total{platform="healthkit", status="success"}` increments after successful sync.
- [ ] Audit log row written per sync with `action="health.sync"` and `diff={ counts: { steps: N, sleep: N, ... } }`. No raw sample values present.
- [ ] Therapist web client-detail page renders pain timeline with at least steps + sleep overlay, toggleable.
- [ ] Maestro flow `health-sync.flow.yaml` passes against a stubbed device payload (or real device when available).
- [ ] e2e API test `health-sync.e2e-spec.ts` covers happy path, consent missing, module disabled, dedupe.
- [ ] iOS `Info.plist` contains exact `NSHealthShareUsageDescription` text from ADR 0006.
- [ ] Android manifest declares Health Connect intent filter + permissions.
- [ ] README updated with "enabling HealthKit testing on real iPhone" and "submitting Health Connect data declaration form" runbooks.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/10-health-integration.md. Read ADR 0006 first, then enter plan mode and surface the open decisions (HealthKit library choice, sleep-stage normalization, workout taxonomy, iOS device availability). Wait for my decisions before writing the schema or any code.
```
