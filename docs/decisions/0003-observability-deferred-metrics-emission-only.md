# 0003 — Observability: defer Loki/Prom/Grafana stack, emit metrics only

- **Status**: Proposed
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/09-hardening-and-deploy.md

## Context

PLAN.md originally locked a full self-hosted observability stack: Loki + Promtail + Prometheus + Grafana, all running as containers on the VPS. Combined memory footprint ~1.2 GB. On an 8 GB VPS this is ~15% of total RAM for telemetry that, during MVP pilot (≤ 5 clinics, ≤ 50 users), produces almost no signal worth dashboarding.

We still want production code to be **observable later without re-instrumentation**. The principle:

> *Emit the data now, run the collectors later.*

Application code should expose structured logs and Prometheus-format metrics from day one. The infrastructure that consumes them is replaceable.

## Options considered

1. **Full stack on VPS (original lock)** — Self-hosted Loki+Promtail+Prom+Grafana. Cost: ~1.2 GB RAM, ops surface (retention tuning, disk pressure, Grafana provisioning). Benefit: zero external dependency, queryable history. Not justified at pilot scale.
2. **Grafana Cloud free tier** — Hosted Grafana + Loki + Prom + Tempo. 10 k active series, 50 GB logs, 14 days retention. Agent runs as a tiny container scraping `/metrics` + tailing stdout. Activation: drop-in agent + DSN. No app change.
3. **No telemetry stack, just `docker logs`** — Ship nothing now. Re-instrument when pain arrives. Risk: hindsight bias. Easy to skip emission in business code paths; expensive to retrofit.
4. **`/metrics` endpoint + structured stdout logs, no collector** *(chosen)* — Production code emits Prometheus metrics on `/metrics` and JSON logs to stdout. No collector runs. When telemetry need surfaces, run Grafana Cloud agent or self-host Prometheus against the existing endpoints. Zero code change at activation time.

## Decision

**We will instrument the application for observability now, but defer the collection infrastructure.**

Concretely:

- **NestJS API** uses `nestjs-pino` for structured JSON logs to stdout. Log shape: `{ level, time, msg, requestId, userId, clinicId, route, latencyMs, ... }`.
- **NestJS API** exposes `GET /metrics` via `@willsoto/nestjs-prometheus`. Endpoint is unauthenticated but bound to localhost-only (Caddy does not proxy it externally). Future scraper hits it from the same Docker network.
- **Required counters / histograms** emitted from day one:
  - `http_request_duration_seconds{method, route, status}` — middleware-driven.
  - `checkin_submitted_total{clinic_id}` — incremented in `CheckInService.create`.
  - `plan_item_completed_total{clinic_id}` — incremented in `PlansService.markComplete`.
  - `health_sync_total{platform, status}` — incremented when HealthKit/Health Connect batch ingests.
  - `auth_failure_total{reason}` — incremented in `AuthGuard` on token rejection.
  - `notification_sent_total{kind, status}` — push + email.
  - `audit_event_total{action}` — every audit log write.
- **Web (Next.js)** logs to stdout via `pino`. No metrics endpoint (Next.js process churn makes Prom in-process tricky; defer until needed).
- **Mobile (Expo)** has no metrics endpoint; errors land via Sentry hooks (ADR 0005) once activated. Custom analytics deferred.
- **Container logs** are captured by Docker's `json-file` driver with rotation (`max-size: 10m`, `max-file: 3`) configured in `docker-compose.prod.yml`. `docker logs <service>` is the MVP debugging surface.

**Activation path** when telemetry need arises:

1. Sign up Grafana Cloud free tier (or self-host Prometheus + Grafana on a beefier VPS later).
2. Add `grafana-agent` container to `docker-compose.prod.yml`, point at `api:3001/metrics` + tail Docker stdout.
3. Import dashboards from `infra/grafana/dashboards/` (placeholder JSON files committed in chunk 09 for future use).
4. No application code change.

## Consequences

- **Positive**:
  - ~1.2 GB RAM saved on VPS.
  - Metrics + structured logs already in place when scaling forces real observability.
  - No "we forgot to instrument the new endpoint" debt — `/metrics` is a hard requirement in every PR review checklist.
- **Negative**:
  - No queryable log history during MVP — `docker logs` is ephemeral and rotates.
  - Production debugging relies on Sentry breadcrumbs (when activated) + SSH-into-VPS workflow.
  - Discipline required: PRs that add domain mutations must add the relevant counter, or coverage rots.
- **Follow-up actions**:
  - Chunk 09 updated: remove Loki/Promtail/Prom/Grafana infra blocks. Keep `/metrics` endpoint + log rotation config + placeholder dashboard JSON.
  - PLAN.md stack table: "Logs/metrics" row updated to reflect emission-only posture with activation note.
  - Add metric-emission requirement to chunk acceptance criteria across 02, 04, 06, 07, 10.

## References

- Prometheus client format: https://github.com/prometheus/docs/blob/main/docs/instrumenting/exposition_formats.md
- Grafana Cloud free tier: https://grafana.com/products/cloud/
- nestjs-pino: https://github.com/iamolegga/nestjs-pino
- @willsoto/nestjs-prometheus: https://github.com/willsoto/nestjs-prometheus
