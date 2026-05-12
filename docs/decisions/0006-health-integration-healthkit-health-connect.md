# 0006 — Health data integration: read-only HealthKit + Health Connect ingest

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/10-health-integration.md

## Context

Pain trend data alone tells a partial story. Activity load, sleep quality, resting heart rate, and HRV correlate strongly with musculoskeletal pain and recovery trajectories. Surfacing these alongside pain check-ins gives the therapist a complete picture and differentiates VitaPeak from journal-only competitors.

Both mobile platforms expose this data through native APIs:

- **iOS HealthKit** (read-only access to a curated subset of HK data types via user grant).
- **Android Health Connect** (system-level health data hub introduced in Android 14; older Androids install Health Connect from the Play Store).

Both are special-category data under GDPR Art. 9. Explicit per-data-type consent is required. Apple and Google have separate review processes for apps requesting health data.

## Options considered

1. **Skip entirely from MVP** — Pain check-in only. Cheapest. Risks the product positioning ("smart pain tracking with biometric context").
2. **Build a unified health-data abstraction across iOS, Android, and Garmin/Whoop SDKs** — Complete but expensive. Wearable integrations are out-of-MVP per PLAN.md and stay so. Deferred.
3. **Read-only ingest from HealthKit + Health Connect, store normalized rows, dedupe by external sample UUID** *(chosen)* — Native platform APIs only. No third-party SDKs. Apple/Google handle device-side aggregation. We just read.
4. **Write-back to HealthKit / Health Connect** (e.g., logged exercise sessions appear in Apple Health) — Defer until v2. MVP is read-only.

## Decision

**We will add a read-only ingest path from HealthKit (iOS) and Health Connect (Android) in a dedicated chunk (10), targeted at the last chunk before pilot launch. The pilot is not gated on this integration; if it slips, MVP still ships.**

### Data types (MVP scope)

| Type | iOS HealthKit identifier | Android Health Connect record |
|------|--------------------------|-------------------------------|
| Steps | `HKQuantityTypeIdentifierStepCount` | `StepsRecord` |
| Sleep duration | `HKCategoryTypeIdentifierSleepAnalysis` (inBed/asleep) | `SleepSessionRecord` |
| Resting heart rate | `HKQuantityTypeIdentifierRestingHeartRate` | `RestingHeartRateRecord` |
| HRV (RMSSD) | `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` | `HeartRateVariabilityRmssdRecord` |
| Workouts (type + duration) | `HKWorkoutType` | `ExerciseSessionRecord` |

Body weight, body temperature, mindful minutes, blood pressure, blood glucose are **out** for MVP. Add post-pilot only if a clinic asks.

### Data model

```prisma
model HealthMetric {
  id            String   @id @default(cuid())
  clientId      String
  clinicId      String
  source        HealthSource     // HEALTHKIT, HEALTH_CONNECT, MANUAL
  metricType    HealthMetricType // STEPS, SLEEP_DURATION, RESTING_HR, HRV_RMSSD, WORKOUT
  startAt       DateTime
  endAt         DateTime?
  valueNumeric  Float?
  valueJson     Json?            // workout details, sleep stage breakdown
  unit          String?          // "steps", "ms", "bpm", "seconds"
  externalId    String           // platform sample UUID, used for dedupe
  ingestedAt    DateTime @default(now())
  client        Client   @relation(fields: [clientId], references: [id])
  @@unique([clientId, source, externalId])
  @@index([clientId, metricType, startAt])
}

model HealthSyncState {
  id          String   @id @default(cuid())
  clientId    String   @unique
  lastHkSync  DateTime?
  lastHcSync  DateTime?
  permissions Json     // { steps: true, sleep: true, ... } per platform
  client      Client   @relation(fields: [clientId], references: [id])
}

enum HealthSource { HEALTHKIT  HEALTH_CONNECT  MANUAL }
enum HealthMetricType { STEPS  SLEEP_DURATION  RESTING_HR  HRV_RMSSD  WORKOUT }
```

### Sync strategy (MVP)

- **Foreground sync only.** On app open + on pull-to-refresh in the Insights tab.
- Read since `HealthSyncState.lastHkSync` (or `lastHcSync`), batch up to 500 samples per type, POST `/health/sync` with normalized payload.
- Server dedupes via `@@unique([clientId, source, externalId])`. Conflicts are no-ops.
- Backend pipeline: validate → store rows → emit `health_sync_total{platform, status}` counter (ADR 0003) → return summary.
- **Background sync is explicitly deferred.** iOS `HKObserverQuery` + BGTaskScheduler is unreliable on real devices; Android Health Connect background read requires extra permission justification. Both add complexity for marginal MVP value.

### Module gating

Add `healthIntegration` to the program-template config block (PLAN.md § "Program template + config resolution"):

```jsonc
{
  "modules": {
    "healthIntegration": true
  },
  "healthIntegration": {
    "platforms": ["healthkit", "healthConnect"],
    "metrics": ["steps", "sleep", "restingHr", "hrv", "workouts"],
    "syncFrequency": "onAppOpen"
  }
}
```

Therapist can disable per-client (e.g., client opts out of HRV).

### Consent and compliance

- New `ConsentRecord.consentType` value: `"health_data_sync"`. Granted once per client when health integration is first enabled.
- Per-data-type permission grants are platform-managed (HealthKit / Health Connect dialogs). We mirror grant state in `HealthSyncState.permissions` for UX (don't re-prompt unnecessarily) but the platform is the source of truth.
- iOS `Info.plist`: `NSHealthShareUsageDescription` written precisely. Example: *"VitaPeak reads your activity, sleep, and heart-rate data to help your therapist correlate biometric trends with your reported pain levels. You can revoke this at any time in iOS Settings → Health."*
- Android: Health Connect data declaration form filled in Play Console at submission. Justify each permission with the same wording.
- Sub-processors list adds: **Apple Inc.** (HealthKit data resides on device, surfaced via Apple SDK; arguably not a processor since data flows device → our server directly, not via Apple infrastructure — document this position) and **Google LLC** (same posture for Health Connect). Final wording on legal review.
- Audit log: every `/health/sync` request writes an `AuditLog` row with action `"health.sync"` and the batch summary (counts per type), but **never the raw sample values** (volume + sensitivity).

### Platform requirements

- **Apple**: enable HealthKit capability in Xcode + App Store Connect. No separate application form (HealthKit access is gated only at App Review). Privacy nutrition labels must list each data type.
- **Google**: Play Console Health Connect declaration form, typically 3–7 day review. Each permission justified in writing.
- **Apple Developer account** ($99/yr) and **Google Play Developer account** ($25 one-time) are prerequisites (already in PLAN.md follow-ups).

## Consequences

- **Positive**:
  - Pain trend charts can overlay activity / sleep / HR data — strong product differentiator.
  - Read-only posture minimizes data-flow surface area for compliance.
  - Foreground-only sync sidesteps the most expensive iOS/Android background-execution complexity.
- **Negative**:
  - Special-category data adds compliance scrutiny. DPIA likely required before EU pilot expansion.
  - HealthKit can only be tested on physical iPhones (simulator has no data). Adds device dependency to QA.
  - Health Connect declaration form is a manual, blocking review step before mobile release.
  - Foreground-only sync means stale data if the app is opened infrequently — a minor product limitation we document.
- **Follow-up actions**:
  - New chunk `docs/chunks/10-health-integration.md` (created alongside this ADR).
  - PLAN.md updates: add `HealthMetric` + `HealthSyncState` to data model, add `healthIntegration` config block, add MVP feature scope bullet under client mobile, add sub-processors entry, update milestones (insert week 9.5 for chunk 10), remove "wearable integrations" from explicit-OUT since the conceptual neighbor is now in.
  - chunks/README.md dep graph: add `10-health-integration` (deps: 02 + 05).
  - Privacy policy draft adds health-data section before mobile store submission.

## References

- HealthKit: https://developer.apple.com/documentation/healthkit
- Health Connect: https://developer.android.com/health-and-fitness/guides/health-connect
- react-native-health-connect: https://github.com/matinzd/react-native-health-connect
- react-native-health: https://github.com/agencyenterprise/react-native-health
- GDPR Art. 9 (special categories): https://gdpr-info.eu/art-9-gdpr/
