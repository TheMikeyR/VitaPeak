# Chunk 09 — Hardening, CI/CD, observability hooks, VPS deploy

Status: ⬜ not started
Plan mode: **REQUIRED** — DNS, secrets, backup encryption, rate-limit thresholds, security headers, and the offsite-backup target all need explicit decisions.

## Goal
Make VitaPeak shippable: CI green, Docker images built and pushed via GitHub Actions, Caddy reverse-proxy fronts services on the 8 GB VPS, backups verified, observability hooks in place (Sentry SDKs DSN-gated, `/metrics` endpoint live, structured logs to stdout), `MailProvider` set to `console` in prod, smoke-test runbook.

## Prerequisites
- All prior chunks (00–08) merged. (Chunk 10 — health integration — can land before or after this chunk; it is not a deploy gate.)

## Context for fresh session
Local dev works end-to-end. No remote deploy. No CI. No backups. This chunk takes VitaPeak from "works on my laptop" to "running on personal VPS, deployable from git push". Read ADRs 0002–0005 first. They define the deployment posture: no Keycloak, no Loki/Prom/Grafana on VPS, no outbound mail by default, no active Sentry by default — but all hooks are pre-wired.

## Locked decisions (see PLAN.md + ADRs)
- Hosting: personal VPS, **8 GB RAM target**, Docker Compose.
- Reverse proxy: Caddy with auto-HTTPS via Let's Encrypt.
- CI/CD: GitHub Actions → GHCR images → SSH deploy script.
- **Logs**: `pino` JSON to stdout. Captured by Docker `json-file` driver with rotation. No Loki, no Promtail (ADR 0003).
- **Metrics**: `/metrics` endpoint exposed by API on localhost-only (Caddy does not proxy it externally). No Prometheus, no Grafana container on VPS (ADR 0003). Placeholder Grafana dashboard JSON committed under `infra/grafana/dashboards/` for future activation.
- **Errors (Sentry)**: SDKs installed and bootstrapped with `if (DSN) init()` gate (ADR 0005). VPS env leaves `SENTRY_DSN` unset for MVP. Source-map upload step exists in build but is a no-op when DSN unset.
- **Mail**: `MAIL_PROVIDER=console` in production env. Invite/alert sends produce stdout log lines only (ADR 0004). Flipping to a real provider is a single env-var change.
- **Backups**: nightly `pg_dump` encrypted with GPG → uploaded to MinIO → mirrored to an offsite S3-compatible bucket. Offsite target TBD in plan mode (Backblaze B2 recommended for cost).
- **Secrets**: `.env` per service on VPS, never committed. sops/age upgrade documented but not implemented.
- **Rate limiting**: `@nestjs/throttler` defaults `10 req/min` on `/auth/*`, `/check-ins`, `/invites`, `/health/sync`.
- **Security headers**: Caddy `header` directives (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).

## Open decisions (surface in plan mode)
- Offsite backup target: Backblaze B2 / Wasabi / Cloudflare R2. Pick by cost + EU region.
- DNS provider + final domain (`vitapeak.app` placeholder).
- CSP exact origins (Sentry ingest URL if activated, MinIO public-bucket URL for media).
- GPG passphrase rotation cadence.
- Whether to run `prisma migrate deploy` on container start (recommended) or as a one-shot CI job before deploy.

## Scope (in)
- `infra/docker-compose.prod.yml` — production overrides. Services on VPS: `caddy`, `api`, `web`, `postgres`, `minio`, `redis`. **Not on VPS**: keycloak, loki, promtail, prometheus, grafana, sentry, mailhog. Log driver: `json-file` with `max-size: 10m`, `max-file: 3`.
- `infra/caddy/Caddyfile` — TLS for `api.vitapeak.app`, `app.vitapeak.app`, `s3.vitapeak.app`. **Does not** expose `auth.*` (no Keycloak), `grafana.*` (no on-VPS Grafana), or `/metrics` (localhost-only).
- `infra/grafana/dashboards/*.json` — committed but unused; documented as the activation surface when Grafana Cloud agent is wired later.
- `infra/backup/pg-dump.sh` — `pg_dump | gpg -c | mc cp` to MinIO + offsite S3.
- `infra/backup/restore.sh` — reverse, idempotent.
- `.github/workflows/ci.yml` — lint + typecheck + unit + e2e API (Dockerized Postgres) + Playwright + Maestro (where possible) + Prisma migration check.
- `.github/workflows/build.yml` — on tag, build & push API + web Docker images to GHCR.
- `.github/workflows/deploy.yml` — manual trigger, SSH to VPS, `docker compose pull && up -d`.
- `apps/*/Dockerfile` — multi-stage, `node:20-alpine` final layer.
- `apps/api/src/main.ts` — bootstrap order: `pino` logger → Sentry init (DSN-gated) → Prometheus registry → NestJS.
- `apps/api/src/metrics/metrics.module.ts` — `@willsoto/nestjs-prometheus` registered. Default counters + histograms wired (ADR 0003). `/metrics` route bound to `127.0.0.1` (or guarded by header) so Caddy never proxies it.
- `apps/api/src/health.controller.ts` — `/health` (always 200) and `/ready` (Postgres + Redis ping).
- Sentry SDK init blocks in API, web, mobile. PII scrubbing `beforeSend` configured. Source-map upload step in `build.yml` gated by `SENTRY_DSN` + `SENTRY_AUTH_TOKEN`.
- README at repo root: dev quickstart + deploy runbook + Sentry activation runbook + mail activation runbook + Grafana Cloud activation runbook.
- Smoke-test script `scripts/smoke.sh` — curl health endpoints + signup flow + check-in submit.
- Rate limiting: `@nestjs/throttler` on auth, invites, check-ins, health/sync.
- Security headers in Caddy.

## Scope (out)
- Kubernetes / cloud migration (defer).
- Auto-scaling (defer).
- Penetration test (manual external task).
- DPA/legal documents (out of code repo).
- Activating Sentry / Grafana Cloud / real mail provider (this chunk only wires the hooks; flipping switches is a follow-up operational task).
- sops/age secrets management (deferred; documented).
- Postgres RLS (deferred; tenancy enforced via NestJS guard + Prisma extension from chunk 01).

## Files to create / modify
- `infra/docker-compose.prod.yml`
- `infra/caddy/Caddyfile`
- `infra/grafana/dashboards/api-overview.json` (placeholder, not wired)
- `infra/backup/pg-dump.sh`, `infra/backup/restore.sh`
- `.github/workflows/ci.yml`
- `.github/workflows/build.yml`
- `.github/workflows/deploy.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/api/src/main.ts` — extend to mount Sentry init (DSN-gated) + Prometheus metrics module
- `apps/api/src/metrics/metrics.module.ts`
- `apps/api/src/metrics/counters.ts` — declares every counter listed in ADR 0003
- `apps/api/src/health.controller.ts`
- `apps/web/sentry.client.config.ts`, `apps/web/sentry.server.config.ts` — DSN-gated init
- `apps/mobile/src/observability/sentry.ts` — DSN-gated init
- `scripts/smoke.sh`
- `README.md` — dev quickstart + deploy + activation runbooks

## Implementation notes
- Caddy auto-HTTPS requires DNS A records pointing to VPS first. Document in README.
- GHCR image tags: `ghcr.io/<owner>/vitapeak-api:<sha>` and `:<git-tag>`.
- Migrations: API container runs `prisma migrate deploy` on start (guarded by env flag `RUN_MIGRATIONS_ON_BOOT=true` to allow disabling).
- Sentry source map upload: when `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` both set in CI env, the `withSentryConfig` wrapper in Next.js uploads automatically. API and mobile use `@sentry/cli` invoked from the build workflow. Without those envs, the step is a no-op.
- PII scrubbing `beforeSend`: strip `request.headers.authorization`, `request.cookies`, `body.email`, `body.notes`, all `painPoint.notes`, all `HealthMetric.valueJson`. Test scrubbing with a unit test before flipping DSN in prod.
- `/metrics` security: bind to `127.0.0.1:3001` inside the container or check for `X-Real-IP === 127.0.0.1`. Caddy reverse proxy does not include `/metrics` in any vhost.
- Smoke test runs against deployed env: signup flow, check-in flow, healthchecks. Skips mail assertions when `MAIL_PROVIDER=console` (verifies stdout log line instead).
- Throttler defaults: 10 reqs/min per IP+user on listed routes. Plan mode confirms before code.
- CSP allowlist for MVP: `'self'`, `data:` for images, MinIO public-bucket origin for media. Sentry ingest URL added only when DSN env is set in the same deploy.
- Docker `json-file` log rotation: `--log-opt max-size=10m --log-opt max-file=3` per service in compose.
- Backup restore drill: `restore.sh` runs in a scratch container in CI on a schedule (weekly) to prove backups are loadable.

## Acceptance criteria
- [ ] `pnpm test` + `pnpm lint` + `pnpm typecheck` all pass in CI on a fresh branch.
- [ ] API + web Docker images build reproducibly under 5 min.
- [ ] Deploy workflow lands new images on VPS without downtime (rolling restart via compose).
- [ ] The three primary domains (`api.*`, `app.*`, `s3.*`) serve HTTPS via Caddy with valid Let's Encrypt certs. No `auth.*` or `grafana.*` provisioned.
- [ ] Healthchecks: `/health` returns 200; `/ready` returns 200 when deps up, 503 when Postgres stopped.
- [ ] `curl http://localhost:3001/metrics` from inside the VPS (via docker exec) returns Prometheus text exposition with `http_request_duration_seconds`, `checkin_submitted_total`, `auth_failure_total`, `notification_sent_total`, `audit_event_total`. From outside the VPS, `curl https://api.vitapeak.app/metrics` returns 404 (not exposed).
- [ ] `pino` JSON logs visible via `docker logs api` with request-correlation IDs.
- [ ] Sentry SDKs initialized only when `SENTRY_DSN` is set. With env unset (MVP default), an intentional `throw` in API/web/mobile is logged but NOT sent anywhere external. Setting DSN + redeploying → same `throw` arrives in Sentry within 60 s with stack frames and request context but **no PII** (scrubbing verified by inspecting the Sentry event payload).
- [ ] `MAIL_PROVIDER=console` produces structured stdout for every alert; switching env to `postmark` + token sends a real test email; switching back to `console` stops sends. No outbound mail with default VPS env.
- [ ] Nightly backup cron writes encrypted dump to MinIO + offsite; manual `restore.sh` successfully restores into a scratch container.
- [ ] Weekly CI backup-restore drill passes.
- [ ] `scripts/smoke.sh` exits 0 against the deployed URL.
- [ ] README quickstart instructions reproduce dev setup on a fresh machine in under 30 min.
- [ ] Rate limiter throttles abusive bursts (manual `wrk` test, returns 429).
- [ ] Security headers present (test via `securityheaders.com` or `curl -I` against `app.vitapeak.app`).
- [ ] `docker stats` on idle VPS shows total RSS < 4 GB across all containers. Headroom verified.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/09-hardening-and-deploy.md. Read ADRs 0003 and 0005 first, then enter plan mode. List the DNS records, secret env vars, and VPS prerequisites I need before any deploy can happen, decide the offsite backup target, and propose the GitHub Actions matrix. Wait for my decisions before writing any workflow YAML, Caddyfile, or Dockerfile.
```
