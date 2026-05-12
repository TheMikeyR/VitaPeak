# VitaPeak — Session Chunks

This folder slices the master plan (`docs/PLAN.md`) into independent work packages. Each chunk is sized so you can open a **fresh AI coding session** with just the chunk + bootstrap prompt and produce useful work without prior conversation context.

## How to use a chunk in a new AI session

1. Open new session in repo root: `claude` (or VS Code extension / web).
2. Paste the **bootstrap prompt** from `docs/SESSION_BOOTSTRAP.md`.
3. Tell the AI which chunk to work on:
   `Execute docs/chunks/02-body-map-check-in.md`
4. The bootstrap forces /plan mode automatically when the chunk's `Plan mode:` field says REQUIRED.
5. Acceptance criteria in the chunk = done signal.
6. Commit after each chunk.

## Plan-mode policy (declared per chunk)

| Value | AI behavior |
|-------|-------------|
| `REQUIRED` | AI invokes /plan immediately, surfaces decisions, waits for ExitPlanMode approval |
| `OPTIONAL` | AI proceeds; enters plan mode only if ambiguity hit |
| `SKIP` | AI proceeds directly without plan mode |

## Order & dependencies

```
00-scaffold              (no deps)
   ├─ spike-svg-source              (needs 00, gates 02)
   └─ 01-auth-and-tenancy           (needs 00; Better-Auth + Prisma tenancy extension)
        ├─ 02-body-map-check-in     (needs 01 + spike-svg-source)
        │     └─ 03-pain-trends-web (needs 02)
        ├─ 04-plans-and-calendar    (needs 01)
        │     └─ 05-program-templates (needs 02, 04)
        │           └─ 10-health-integration (needs 02 + 05, not a deploy gate)
        ├─ 06-notifications         (needs 02, 04; extends MailProvider abstraction from 01)
        ├─ 07-gdpr-audit-consent    (needs 01)
        ├─ 08-therapist-mobile-companion (needs 02, 03, 06)
        └─ 09-hardening-and-deploy  (needs 00-08; 10 may follow or precede)
```

Roughly the milestones in `docs/PLAN.md` § "Milestones".

## START HERE

First chunk to run on a fresh repo: **`00-scaffold.md`**.
Then **`spike-svg-source.md`** (must complete before chunk 02 starts).
Then follow the dep graph above.

## Chunk index

| Chunk | Plan mode | Purpose |
|-------|-----------|---------|
| `spike-svg-source.md` | REQUIRED | Pick body SVG source + write ADR |
| `00-scaffold.md` | SKIP | Monorepo, Docker stack (Postgres + MinIO + Mailhog + Redis, **no Keycloak**), blank apps |
| `01-auth-and-tenancy.md` | REQUIRED | Better-Auth (in-process) + clinics + invite flow + Prisma tenancy extension. See ADR 0002, 0004. |
| `02-body-map-check-in.md` | REQUIRED | Interactive body map + pain check-in (mobile) |
| `03-pain-trends-web.md` | OPTIONAL | Therapist web: client list + charts + heatmap (extended in chunk 10 with health overlay) |
| `04-plans-and-calendar.md` | REQUIRED | Plans + exercise library + calendar |
| `05-program-templates.md` | REQUIRED | Templates + config resolution + module gating (includes `healthIntegration` block) |
| `06-notifications.md` | OPTIONAL | Expo Push + MailProvider abstraction extended (Postmark/Resend) |
| `07-gdpr-audit-consent.md` | REQUIRED | Audit log + consent (`health_data_sync` type) + export + hard-delete |
| `08-therapist-mobile-companion.md` | OPTIONAL | Today/Alerts/Notes on mobile |
| `09-hardening-and-deploy.md` | REQUIRED | CI/CD, Caddy, `/metrics` endpoint, Sentry hooks (DSN-gated), `MAIL_PROVIDER=console` on VPS, backups |
| `10-health-integration.md` | REQUIRED | HealthKit + Health Connect read-only ingest. See ADR 0006. Not a pilot gate. |

## Chunk file format

| Section | Purpose |
|---------|---------|
| **Status** | `⬜ not started` / `🟡 in progress` / `✅ done — date — sha` |
| **Plan mode** | REQUIRED / OPTIONAL / SKIP — drives AI auto-behavior |
| **Goal** | One-line outcome |
| **Prerequisites** | Other chunks that must be merged first |
| **Context for fresh session** | Self-contained background |
| **Locked decisions** | Pre-made choices the AI must respect |
| **Scope (in / out)** | Anti-scope-creep guardrails |
| **Files to create / modify** | Concrete paths |
| **Implementation notes** | Gotchas, library choices, patterns |
| **Acceptance criteria** | Verifiable end-state checklist |
| **Suggested first prompt** | Paste this after bootstrap into new session |

## Master references

- `docs/PLAN.md` — full architecture, data model, compliance, deployment
- `docs/SESSION_BOOTSTRAP.md` — paste at start of every new session
- `docs/decisions/` — ADRs (numbered, immutable)
- `docs/chunks/*.md` — work packages

## Status tracking

Mark chunk done by editing the chunk file's `Status:` top line: `Status: ✅ done — YYYY-MM-DD — <commit-sha>`. Or use GitHub Projects / Linear if preferred.
