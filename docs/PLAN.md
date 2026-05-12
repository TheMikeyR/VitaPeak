# VitaPeak — Physiotherapist ↔ Client Tracking Platform

## Context

VitaPeak connects physiotherapists (and other movement therapists) to their clients between sessions. It captures structured pain check-ins, treatment plans, and adherence so therapists can make data-informed decisions. Differentiates from generic fitness apps (ZenFit-style) by adding:

- **Interactive body map pain check-in** — tap region, set type (burning/sharp/radiating/dull/aching), level 0–10, notes.
- **Pain trend tracking** over time per region.
- **Calendar/plan view** showing assigned exercises and check-in windows.
- **Program templates** (e.g. Injury Recovery, Strength, Post-Op, Chronic Pain) that bundle which modules and check-in cadence apply to a client. Therapist defines defaults at clinic + per-client overrides.

Current state: empty git repo at `C:\Users\miker\dev\VitaPeak`. Greenfield.

Outcome: a Dockerized monorepo deployable to a personal VPS for MVP, portable to cloud later. Native mobile (iOS+Android) for client and therapist (companion features only on mobile for therapist); web for therapist primary workflow.

---

## Architecture overview

```
┌────────────────────┐   ┌────────────────────┐
│  Expo app (iOS+    │   │  Next.js web       │
│  Android)          │   │  (therapist        │
│  - client primary  │   │   primary)         │
│  - therapist       │   │  - dashboards      │
│    companion       │   │  - plan builder    │
│  Role-aware after  │   │  - charts/reports  │
│  Keycloak login    │   │  - admin           │
└─────────┬──────────┘   └─────────┬──────────┘
          │                        │
          │  ts-rest typed REST    │
          │  (OpenAPI spec emitted)│
          └────────────┬───────────┘
                       │
        ┌──────────────▼───────────────┐
        │   NestJS API (TS)            │
        │   - modules: auth, clients,  │
        │     check-ins, body-map,     │
        │     plans, programs, audit   │
        │   - Prisma → Postgres        │
        └──────────────┬───────────────┘
                       │
   ┌─────────┬─────────┼─────────┬──────────┐
   │         │         │         │          │
┌──▼──┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────┐ ┌──▼────┐
│ PG  │ │Keycloak │ │MinIO │ │Mailer  │ │ Expo  │
│ (DB)│ │(OIDC)   │ │(S3)  │ │(SMTP / │ │ Push  │
│     │ │         │ │      │ │ Postal)│ │ (EAS) │
└─────┘ └─────────┘ └──────┘ └────────┘ └───────┘
```

All services run as Docker Compose on VPS for MVP. Reverse proxy: Caddy (auto-HTTPS via Let's Encrypt). Backups: nightly `pg_dump` → MinIO + offsite S3-compat.

---

## Stack (locked)

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend | **NestJS** (TS) + **ts-rest** | Quarkus-like structure (familiar), end-to-end types via ts-rest, also emits OpenAPI for future polyglot clients |
| ORM | **Prisma** | Typed, mature, great DX with Postgres |
| DB | **Postgres 16** | Locked. JSONB for config blobs, time-series fine until scale issue |
| Auth | **Better-Auth** (in-process) — Keycloak-compatible JWT shape, migration path documented in ADR 0002 | TS-native, ~0 extra RAM, OIDC migration path preserved |
| Mobile | **Expo (React Native)** | Single codebase iOS+Android, OTA via EAS Update, mature |
| Web | **Next.js (App Router)** + Tailwind + shadcn/ui | Therapist dashboard, charts via Recharts |
| Monorepo | **Turborepo + pnpm** | Standard for Expo + Next.js + shared TS packages |
| Object store | **MinIO** (S3-compat, on VPS) | Swappable to R2/S3 later — same SDK |
| Health data | **HealthKit (iOS)** + **Health Connect (Android)** read-only ingest (ADR 0006) | Native APIs only, no third-party wearable SDKs |
| Email | **MailProvider abstraction** — `console` (default on VPS for MVP), `smtp` (Mailhog local dev), `postmark` / `resend` (later). ADR 0004 | Defer outbound delivery + sub-processor until pilot demands |
| Push | **Expo Push** | Free, works iOS+Android via EAS |
| Logs/metrics | **Emit-only: `pino` JSON logs to stdout + `/metrics` Prometheus endpoint.** No collectors on VPS for MVP. Grafana Cloud free-tier activation path documented in ADR 0003 | Save ~1.2 GB RAM on 8 GB VPS, no instrumentation debt at activation time |
| Errors | **Sentry SDKs installed, env-gated init** (ADR 0005) — DSN unset on MVP VPS, activates on demand. SaaS only; self-host permanently rejected | Zero ops cost during MVP, fast activation when needed |
| CI/CD | **GitHub Actions** → SSH/registry deploy to VPS | Standard |
| E2E | **Maestro** (mobile), **Playwright** (web) | Lightweight, scriptable |

---

## Monorepo layout

```
VitaPeak/
├── apps/
│   ├── mobile/              # Expo app (client + therapist companion)
│   ├── web/                 # Next.js therapist web
│   └── api/                 # NestJS backend
├── packages/
│   ├── contracts/           # ts-rest contracts (shared API spec)
│   ├── db/                  # Prisma schema + client + migrations
│   ├── types/               # Domain types
│   ├── validation/          # Zod schemas
│   ├── config/              # Shared eslint, tsconfig, tailwind preset
│   └── ui/                  # Shared design tokens (mobile + web later)
├── infra/
│   ├── docker-compose.yml   # Local + VPS deployment
│   ├── caddy/Caddyfile
│   ├── keycloak/realm.json  # Pre-configured realm export
│   └── backup/              # pg_dump scripts
├── .github/workflows/       # CI/CD
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Data model (key tables)

Multi-tenant from day one. Every domain row carries `clinic_id` for tenant isolation. Postgres RLS optional later; for MVP enforce in NestJS guards.

```prisma
// packages/db/schema.prisma — abbreviated

model Clinic {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  therapists Therapist[]
  clients    Client[]
  programs   ProgramTemplate[]
}

model Therapist {
  id        String   @id @default(cuid())
  clinicId  String
  externalAuthId String  @unique   // Better-Auth user id today, Keycloak `sub` later (ADR 0002)
  email     String   @unique
  firstName String
  lastName  String
  role      TherapistRole @default(THERAPIST)  // OWNER, ADMIN, THERAPIST
  clinic    Clinic   @relation(fields: [clinicId], references: [id])
  clients   Client[]
}

model Client {
  id           String   @id @default(cuid())
  clinicId     String
  therapistId  String
  externalAuthId String? @unique   // null until invite accepted; see ADR 0002
  email        String
  firstName    String
  lastName     String
  dob          DateTime?
  invitedAt    DateTime @default(now())
  acceptedAt   DateTime?
  clinic       Clinic   @relation(fields: [clinicId], references: [id])
  therapist    Therapist @relation(fields: [therapistId], references: [id])
  program      ClientProgram?
  checkIns     CheckIn[]
  planItems    PlanItem[]
}

model ProgramTemplate {
  id          String   @id @default(cuid())
  clinicId    String?  // null = system seed
  name        String
  description String?
  config      Json     // { modules: {...}, checkIn: {...}, requiredFields: [...] }
  isSystemSeed Boolean @default(false)
}

model ClientProgram {
  id            String   @id @default(cuid())
  clientId      String   @unique
  templateId    String?
  configOverride Json    // deep-merged on top of template.config
  startDate     DateTime
  endDate       DateTime?
  template      ProgramTemplate? @relation(fields: [templateId], references: [id])
  client        Client   @relation(fields: [clientId], references: [id])
}

model BodyRegion {
  id          String   @id           // slug, e.g. "lumbar.l4-l5"
  parentId    String?
  side        Side?                  // LEFT, RIGHT, CENTER
  displayLayer String                // "2d-front" | "2d-back" | "3d-mesh-x"
  label       String
  parent      BodyRegion? @relation("RegionHierarchy", fields: [parentId], references: [id])
  children    BodyRegion[] @relation("RegionHierarchy")
}

model CheckIn {
  id           String   @id @default(cuid())
  clientId     String
  clinicId     String
  occurredAt   DateTime @default(now())
  mood         Int?                   // optional 1-5
  notes        String?
  client       Client   @relation(fields: [clientId], references: [id])
  painPoints   PainPoint[]
}

model PainPoint {
  id           String   @id @default(cuid())
  checkInId    String
  bodyRegionId String
  painType     PainType                // BURNING, SHARP, RADIATING, DULL, ACHING, TINGLING
  level        Int                     // 0-10
  x            Float?                  // optional free-tap coord
  y            Float?
  notes        String?
  checkIn      CheckIn @relation(fields: [checkInId], references: [id])
  region       BodyRegion @relation(fields: [bodyRegionId], references: [id])
}

model Exercise {
  id          String   @id @default(cuid())
  clinicId    String?  // null = system-seeded global
  name        String
  description String?
  mediaUrl    String?  // optional video or image
  mediaType   MediaType?
  tags        String[]
}

model PlanItem {
  id           String   @id @default(cuid())
  clientId     String
  exerciseId   String
  scheduledFor DateTime
  sets         Int?
  reps         Int?
  durationSec  Int?
  frequencyNote String?  // e.g. "3x/week"
  instructions String?
  completedAt  DateTime?
  client       Client   @relation(fields: [clientId], references: [id])
  exercise     Exercise @relation(fields: [exerciseId], references: [id])
}

model AuditLog {
  id        String   @id @default(cuid())
  clinicId  String?
  actorId   String?           // therapist or client keycloakId
  action    String            // "client.create", "checkin.submit", etc
  entity    String
  entityId  String?
  diff      Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
}

model ConsentRecord {
  id         String   @id @default(cuid())
  userId     String   // externalAuthId
  consentType String  // "data_processing", "research", "marketing", "health_data_sync"
  granted    Boolean
  version    String   // policy version hash
  grantedAt  DateTime @default(now())
}

// --- Health-data ingest (HealthKit + Health Connect). See ADR 0006 + chunk 10.

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
  externalId    String           // platform sample UUID, dedupe key
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
  permissions Json     // { steps: true, sleep: true, ... } per platform, mirror of grant state
  timezone    String?  // IANA, captured at sync for display
  client      Client   @relation(fields: [clientId], references: [id])
}
```

Reuse: pre-seed `BodyRegion` table at install with ~40 regions (front+back, hierarchical). Pre-seed ~100 common physio exercises into `Exercise` with `clinicId = null`.

---

## Program template + config resolution

**Resolution chain** (server-side, returned from `GET /me/program`):

1. System default config
2. Clinic-level default (if set)
3. Therapist-level default (if set)
4. Assigned program template
5. Per-client `configOverride`

Result: **effective config** object. Mobile app reads on login → conditionally renders enabled modules. Backend guards reject writes to disabled modules.

**Config shape**:
```jsonc
{
  "modules": {
    "painCheckIn": true,
    "bodyMap": true,
    "exercisePlan": true,
    "calendar": true,
    "journal": false,
    "mood": false,
    "sleep": false,
    "videoDemos": true,
    "chat": false,
    "homeMetrics": false,
    "healthIntegration": true
  },
  "checkIn": {
    "frequency": "daily",        // daily | weekly | onDemand | beforeWorkout | custom
    "customCron": null,
    "requiredFields": ["painLevel", "bodyRegion"],
    "skipAllowed": true,
    "reminderTimes": ["08:00", "20:00"]
  },
  "healthIntegration": {
    "platforms": ["healthkit", "healthConnect"],
    "metrics": ["steps", "sleep", "restingHr", "hrv", "workouts"],
    "syncFrequency": "onAppOpen"   // onAppOpen | hourly | daily — only onAppOpen for MVP
  }
}
```

**Seeded system templates** (`is_system_seed = true`):
- Injury Recovery — daily, painCheckIn + bodyMap + plan + calendar
- Strength Program — weekly, plan + calendar, no bodyMap
- Post-Op — daily pre-workout, all clinical modules
- Chronic Pain — 2×/day, painCheckIn + bodyMap + journal

Therapists clone/edit.

---

## MVP feature scope

### Therapist (web)
- Signup → creates Clinic (one therapist = owner)
- Invite clients (email link via configured `MailProvider`; on MVP VPS with `MAIL_PROVIDER=console`, the API returns the invite URL inline so the therapist shares it manually — ADR 0004)
- Client list, status (last check-in, recent pain trend sparkline, flags)
- Client detail: pain history charts, body-map heatmap, **health-metric overlay (steps / sleep / RHR / HRV)**, plan calendar, raw check-ins
- Plan builder: drag exercises from library, set sets/reps/schedule
- Program template manager: clone system seeds, customize, assign to clients, per-client override
- Audit log viewer (own clinic only)
- GDPR exports + deletion requests handler

### Therapist (mobile companion)
- Today's clients
- Quick view client status
- Push alerts on flagged pain spikes
- Quick note on a client

### Client (mobile)
- Onboard via invite link, accept consent
- Daily/configured check-in: body map tap → region → type → level → notes → submit
- View plan calendar (today + week)
- Mark exercise done (with optional notes)
- Pain history (own data, simple line chart per region)
- Connect Apple Health / Health Connect (gated by `modules.healthIntegration`): grant per-data-type permission, foreground sync on app open + manual refresh, see last-sync summary (chunk 10, ADR 0006)
- Account: data export, delete account

### Cross-cutting MVP
- Push reminders (Expo Push)
- Email alerts to therapist (high pain, skipped check-ins)
- Audit log on all writes
- Consent records on signup + on policy version bump

### Explicitly OUT of MVP
- Client web app (port later, ~2 weeks)
- 3D body map (Phase 3)
- Detailed sub-regions UI (Phase 2)
- In-app chat
- Billing/payments
- Multi-language (English first, structure for i18n)
- Third-party wearable SDKs (Garmin, Whoop, Fitbit, Oura). HealthKit + Health Connect are IN; native-platform-only.
- Background health sync (foreground only for MVP, ADR 0006)
- Health-data trend alerting / auto-correlation (visual overlay only for MVP)

### Deferred services with activation paths

Services that PLAN.md originally implied but MVP defers. Code path exists; the service is off until a trigger fires.

| Service | MVP state | Trigger to activate | Activation cost |
|---------|-----------|---------------------|-----------------|
| Keycloak | Better-Auth in-process (ADR 0002) | SSO/SAML asked; > 500 users; second compliance audit | Run user-migration script + swap docker-compose service + flip JWT issuer env |
| Outbound email delivery | `MAIL_PROVIDER=console`, invite link returned in API response (ADR 0004) | Pilot opens beyond friends; > 5 active invites/week | Set `MAIL_PROVIDER=postmark` + token env; unset `MAIL_FALLBACK_RETURN_LINK` |
| Loki / Promtail / Prometheus / Grafana on VPS | None deployed; `/metrics` + pino JSON logs already emitted (ADR 0003) | Production crash with no `docker logs` lead; sustained > 100 req/s; second clinic onboards | Add `grafana-agent` container, point at `api:3001/metrics` + Docker stdout, configure Grafana Cloud DSN |
| Sentry | SDKs installed, init no-op without `SENTRY_DSN` (ADR 0005) | Pilot opens to non-friend users; unreproducible production crash > 24 h; store submission | Set `SENTRY_DSN` env + verify PII scrubbing + upload source maps in CI |
| HealthKit ingest (iOS) | Chunk 10 code committed, may ship dark if no physical iPhone available | Physical iPhone available for QA | Enable HealthKit capability in Xcode + App Store Connect; submit privacy nutrition labels |
| Background health sync | Foreground only | iOS BGTaskScheduler reliability acceptable; > 50% of users open app < daily | Wire `HKObserverQuery` + Health Connect background read with extra Play declaration |
| Postgres RLS | Tenancy enforced via NestJS guard + Prisma middleware (ADR pending) | First tenancy bug found; second backend dev joins; auditor asks | Add `clinic_id` policy per table; keep guard as belt-and-braces |

---

## Compliance (GDPR + audit + consent + export/delete)

- **Hosting**: EU region only (VPS already EU-hosted assumed; verify).
- **Encryption**: at rest (Postgres LUKS or RDS-equivalent; MinIO server-side encryption); in transit (TLS 1.2+ via Caddy).
- **Consent**: `ConsentRecord` table; signup blocks until accepted; policy version stored; re-prompt on bump.
- **Audit log**: every mutation writes to `AuditLog` via NestJS interceptor (actor, action, entity, diff, IP, UA).
- **Data export**: `GET /me/export` returns ZIP (JSON + CSVs) of all user data. Therapist endpoint: `GET /clinic/export` for clinic-level.
- **Hard delete**: `DELETE /me` cascades. Soft-delete by default with 30-day grace; hard wipe after grace. Audit log retained anonymized.
- **Access controls**: Therapists access only own clinic's clients. Clients access only own data. Enforced in NestJS guards **and** a Prisma client extension/middleware that injects `where: { clinicId }` on every domain-table query (chunk 01). Two layers = belt + braces against accidental cross-tenant reads.
- **Special-category data (Art. 9)**: pain data + health-integration data (HealthKit / Health Connect). Explicit consent records required (`data_processing` for pain, `health_data_sync` for health metrics). DPIA drafted before pilot expands beyond friends-and-family.
- **DPA**: template document drafted (out of code scope, but architectural decisions support).
- **Sub-processors**: list maintained. Active for MVP: **Expo** (push), **GitHub** (source + GHCR images). Conditionally active (only when feature flipped): **Sentry SaaS** (ADR 0005), configured **mail provider** (Postmark or Resend, ADR 0004), **Apple Inc.** and **Google LLC** for HealthKit / Health Connect once health integration enabled (data flows device → our server directly; document posture per ADR 0006). MinIO runs on our VPS — not a sub-processor. Better-Auth runs in-process — not a sub-processor. Future-conditional: **Keycloak** vendor support contract if/when adopted, **offsite backup target** (e.g., Backblaze B2).
- **Backups**: encrypted at rest + offsite. Tested restore.

Not pursuing MDR class I in MVP — wellness/lifestyle posture documented. Architecture supports later upgrade (audit log, traceability, change control already in place).

---

## Deployment

### MVP (VPS Docker Compose)
- **Target VPS: 8 GB RAM** (soft constraint). Cuts taken to fit (ADR 0002–0005):
  - **Containers running on VPS for MVP**: `caddy`, `api` (NestJS, Better-Auth in-process), `web` (Next.js), `postgres`, `minio`, `redis`.
  - **Containers explicitly NOT on VPS for MVP**: `keycloak` (replaced by Better-Auth, ADR 0002), `loki` + `promtail` + `prometheus` + `grafana` (emit-only telemetry, ADR 0003), `sentry` (SaaS only if activated, never self-host, ADR 0005), `mailer` / `postal` (provider abstraction, no outbound on VPS by default, ADR 0004), `mailhog` (local dev only).
- Rough RAM budget at idle (in GB): OS + Docker ≈ 0.8, Postgres ≈ 1.0, API ≈ 0.5, Next.js ≈ 0.4, MinIO ≈ 0.3, Redis ≈ 0.1, Caddy ≈ 0.1. Used ≈ 3.2, headroom ≈ 4.8. Comfortable for MVP burst load.
- `.env` files per service, never committed. Upgrade path to sops/age documented but not implemented at MVP.
- Caddy auto-provisions HTTPS for `api.vitapeak.app`, `app.vitapeak.app`, `s3.vitapeak.app`. (`auth.vitapeak.app` reserved for future Keycloak migration; not provisioned during MVP.)
- GitHub Actions builds images → pushes to GHCR → SSH deploy script pulls + `docker compose up -d` on VPS.
- Backup: nightly `pg_dump` encrypted + uploaded to MinIO, then mirrored to offsite S3-compat (Backblaze B2 or equivalent — choice surfaced in chunk 09 plan mode).

### Portability (future cloud migration)
- All apps stateless, configured via env (12-factor).
- DB external → swap to managed Neon/RDS by changing `DATABASE_URL`.
- Object storage SDK points at MinIO endpoint → swap to R2/S3 by changing endpoint + bucket.
- Auth migration (Better-Auth → Keycloak) documented in ADR 0002. JWT shape is Keycloak-compatible from day one so guards do not change.
- Targets when scaling: Fly.io, Render, or AWS ECS/EKS. No code change needed.

### Mobile distribution
- Single Expo app, role login.
- One store listing each: App Store + Play Store.
- TestFlight + Play Internal Testing for pilot physiotherapists.
- EAS Update for JS-only OTA fixes (no store re-review).

---

## Dev environment

- Both Mac and Windows supported. Backend + web identical cross-OS. iOS sim Mac-only.
- Suggested workflow:
  - Backend/web/DB: either machine. Same git repo.
  - Mobile iOS testing: Mac (iOS Sim or real iPhone via cable).
  - Mobile Android testing: either (Android Studio emulator on both).
- Local stack: `docker compose up -d` brings Postgres + MinIO + Mailhog + Redis. (No Keycloak — Better-Auth runs in-process inside the API; no separate auth container.)
- `pnpm dev` runs API + web + Expo concurrently via Turborepo.
- `pnpm db:seed` populates: 1 clinic, 1 therapist, 3 clients, 30 days of pain history, 100 exercises, 4 system templates.

---

## Testing

- **Unit**: Vitest/Jest for NestJS modules; React Native Testing Library for Expo components.
- **Contract**: ts-rest compile-time enforcement across web + mobile + API.
- **API integration**: NestJS e2e tests against Dockerized Postgres + Keycloak in CI.
- **E2E mobile**: Maestro flows checked in at `apps/mobile/.maestro/`. Critical flow: check-in submission, plan completion, login.
- **E2E web**: Playwright at `apps/web/e2e/`. Critical flow: client invite, plan builder, view history.
- **Visual**: Storybook for shared components; Chromatic optional post-MVP.
- **Load**: k6 scripts on `POST /check-ins` and `GET /clients/:id/pain-trend` to validate Postgres index strategy.

---

## Milestones (rough)

| # | Goal | Weeks |
|---|------|-------|
| 0 | Repo scaffold, Turborepo, Docker Compose (Postgres + MinIO + Mailhog + Redis), Prisma schema, seed | 1 |
| 1 | Better-Auth (in-process) wired across API + web (Auth.js v5 client) + Expo (OIDC-shaped flow); clinic/therapist/client invite; Prisma tenancy middleware | 1.5 |
| 2 | Body map SVG component + region taxonomy + check-in submission (Expo) | 1.5 |
| 3 | Pain trend charts + body-map heatmap (web) | 1 |
| 4 | Plan builder (web) + plan calendar (Expo) + plan completion | 2 |
| 5 | Program templates + config resolution + module gating | 1 |
| 6 | Push reminders (Expo Push) + email via MailProvider abstraction (`console` default on VPS) | 1 |
| 7 | Audit log + consent + GDPR export/delete endpoints | 1 |
| 8 | Therapist mobile companion features | 1 |
| 9 | E2E test suite, hardening, CI/CD, Caddy, `/metrics` endpoint, Sentry hooks (DSN-gated), pilot deploy to VPS | 1.5 |
| 10 | HealthKit + Health Connect ingest (foreground sync) + web overlay | 1 |

**Target MVP**: ~13 weeks nominal, realistic 16–20 weeks solo. Health integration (chunk 10) is positioned last and is **not a pilot gate** — if it slips, MVP still ships without it.

---

## Critical files to create (initial scaffold)

```
infra/docker-compose.yml
infra/docker-compose.prod.yml
infra/caddy/Caddyfile
infra/backup/pg-dump.sh
.github/workflows/ci.yml
.github/workflows/deploy.yml

pnpm-workspace.yaml
turbo.json
package.json
.editorconfig
.gitignore

packages/db/prisma/schema.prisma
packages/db/prisma/seed.ts
packages/db/src/index.ts

packages/contracts/src/index.ts
packages/contracts/src/clients.ts
packages/contracts/src/checkIns.ts
packages/contracts/src/plans.ts
packages/contracts/src/programs.ts

packages/types/src/index.ts
packages/validation/src/index.ts

apps/api/src/main.ts
apps/api/src/app.module.ts
apps/api/src/auth/auth.guard.ts
apps/api/src/auth/tenant.guard.ts
apps/api/src/auth/better-auth.module.ts
apps/api/src/audit/audit.interceptor.ts
apps/api/src/db/tenancy.extension.ts
apps/api/src/mail/mail.module.ts
apps/api/src/mail/providers/console.provider.ts
apps/api/src/mail/providers/smtp.provider.ts
apps/api/src/metrics/metrics.module.ts
apps/api/src/modules/clients/clients.controller.ts
apps/api/src/modules/check-ins/check-ins.controller.ts
apps/api/src/modules/plans/plans.controller.ts
apps/api/src/modules/programs/programs.controller.ts
apps/api/src/modules/health/health.controller.ts
apps/api/src/modules/exports/exports.controller.ts
apps/api/test/e2e/check-in.e2e-spec.ts
apps/api/test/e2e/health-sync.e2e-spec.ts
apps/api/Dockerfile

apps/web/app/layout.tsx
apps/web/app/(auth)/login/page.tsx
apps/web/app/(app)/clients/page.tsx
apps/web/app/(app)/clients/[id]/page.tsx
apps/web/app/(app)/plans/builder/page.tsx
apps/web/app/(app)/programs/page.tsx
apps/web/lib/api-client.ts
apps/web/Dockerfile

apps/mobile/app/_layout.tsx
apps/mobile/app/(client)/check-in/index.tsx
apps/mobile/app/(client)/plan/index.tsx
apps/mobile/app/(client)/history/index.tsx
apps/mobile/app/(client)/insights/index.tsx
apps/mobile/app/(client)/insights/connect-health.tsx
apps/mobile/app/(therapist)/today/index.tsx
apps/mobile/src/components/BodyMap/BodyMap.tsx
apps/mobile/src/components/BodyMap/regions.ts
apps/mobile/src/health/sync.ts
apps/mobile/src/health/permissions.ts
apps/mobile/.maestro/check-in.flow.yaml
apps/mobile/.maestro/health-sync.flow.yaml
apps/mobile/app.config.ts
apps/mobile/eas.json
```

---

## Verification (end-to-end)

1. `docker compose up -d` — all services healthy (`docker compose ps` shows healthy on all).
2. `pnpm db:migrate && pnpm db:seed` — Postgres has clinic/therapist/clients/exercises/templates.
3. Open `https://app.vitapeak.local` → log in as seeded therapist (via Better-Auth) → see 3 clients with sparklines.
4. Open Expo on iPhone (Expo Go + dev server) → log in as seeded client → see pain check-in tab → tap lower back → select "burning" → set level 7 → submit. Confirm row in `pain_point` table.
5. Refresh therapist web → client detail → pain chart shows new data point at correct region.
6. Therapist creates new plan in plan builder → assigns "Squat 3x10" tomorrow → client app sees it on calendar → marks done → therapist sees completion.
7. Therapist creates custom program template → assigns to client → client logs in → only enabled modules visible.
8. Maestro: `maestro test apps/mobile/.maestro/check-in.flow.yaml` passes.
9. Playwright: `pnpm test:e2e` (web) passes.
10. NestJS e2e: `pnpm test:e2e:api` passes against Dockerized Postgres.
11. GDPR test: `curl /me/export` returns ZIP with all user data; `DELETE /me` soft-deletes; after grace period cron, hard-deletes; audit log retained anonymized.
12. Push test: send Expo push token notification → device receives.
13. Email test (local dev with `MAIL_PROVIDER=smtp`): trigger pain spike alert → therapist email arrives at Mailhog. On VPS with `MAIL_PROVIDER=console`, alert is structured-logged to stdout with `{ kind: "mail", ... }`.
14. Backup test: `pg-dump.sh` produces encrypted dump in MinIO; restore in fresh container loads identically.
15. Metrics test: `curl http://localhost:3001/metrics` returns Prometheus text exposition with `checkin_submitted_total`, `http_request_duration_seconds`, `auth_failure_total` series.
16. Health-sync test (chunk 10): on physical iPhone with HealthKit data, grant the five MVP types → app shows last-sync summary → `HealthMetric` rows present in DB → re-sync is a no-op (dedupe verified).

---

## Open follow-ups (post-plan)

- Final clinic/billing model (per-therapist seat? per-client active? defer).
- Exercise library curation (need physiotherapist input on 100 seed exercises).
- Brand: logo, color palette, design tokens.
- Apple/Google developer accounts setup ($99/yr + $25 once).
- Domain + DNS for `vitapeak.app` (or chosen).
- Privacy policy + ToS drafting (legal).
- Pilot clinic identification + onboarding script.
