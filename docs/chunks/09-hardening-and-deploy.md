# Chunk 09 — Hardening, CI/CD, observability, VPS deploy

Status: ⬜ not started
Plan mode: **REQUIRED** — DNS, secrets, backup encryption, security headers all need explicit decisions.

## Goal
Make VitaPeak shippable: CI green, Docker images built and pushed via GitHub Actions, Caddy reverse-proxy fronts services on VPS, backups verified, Sentry + Loki/Prometheus/Grafana wired, secrets in `.env` files, smoke-test runbook.

## Prerequisites
- All prior chunks (00–08) merged.

## Context for fresh session
Local dev works end-to-end. No remote deploy. No CI. No backups. No monitoring. This chunk takes VitaPeak from "works on my laptop" to "running on personal VPS, deployable from git push".

## Locked decisions
- Hosting: personal VPS, Docker Compose.
- Reverse proxy: Caddy with auto-HTTPS via Let's Encrypt.
- CI/CD: GitHub Actions → GHCR images → SSH deploy script.
- Logs: Loki + Promtail + Grafana (Docker).
- Metrics: Prometheus + Grafana.
- Errors: Sentry (self-host or SaaS — pick SaaS for MVP).
- Backups: nightly `pg_dump` encrypted → MinIO + offsite S3-compat target.
- Secrets: `.env` per service on VPS, never committed.

## Scope (in)
- `infra/docker-compose.prod.yml` — production overrides (Caddy, Sentry envs, log shipping, prod Postgres password, MinIO creds).
- `infra/caddy/Caddyfile` — TLS for `api.vitapeak.app`, `app.vitapeak.app`, `auth.vitapeak.app`, `s3.vitapeak.app`, `grafana.vitapeak.app`.
- `infra/loki/`, `infra/promtail/`, `infra/prometheus/`, `infra/grafana/` — config + dashboards.
- `infra/backup/pg-dump.sh` — pg_dump | gpg-encrypt | mc cp to MinIO + remote S3.
- `infra/backup/restore.sh` — reverse, idempotent.
- `.github/workflows/ci.yml` — lint + typecheck + unit + e2e API (Dockerized Postgres + Keycloak) + Playwright + Maestro (where possible) + Prisma migration check.
- `.github/workflows/build.yml` — on tag, build & push API + web Docker images to GHCR.
- `.github/workflows/deploy.yml` — manual trigger, SSH to VPS, `docker compose pull && up -d`.
- `apps/*/Dockerfile` — multi-stage, distroless or `node:20-alpine` final.
- `apps/api/src/health.controller.ts` — `/health` (always), `/ready` (Postgres + Redis + Keycloak ping).
- Sentry SDK init in API, web, mobile.
- README at repo root: dev quickstart + deploy runbook.
- Smoke-test script `scripts/smoke.sh` — curl health endpoints + login flow.
- Rate limiting: NestJS `@nestjs/throttler` on auth endpoints + check-in submit.
- Security headers: Caddy `header` directives (HSTS, CSP, X-Frame-Options, Referrer-Policy).

## Scope (out)
- Kubernetes / cloud migration (defer)
- Auto-scaling (defer)
- Penetration test (manual external task)
- DPA/legal documents (out of code repo)

## Files to create / modify
- `infra/docker-compose.prod.yml`
- `infra/caddy/Caddyfile`
- `infra/loki/loki-config.yaml`
- `infra/promtail/promtail-config.yaml`
- `infra/prometheus/prometheus.yml`
- `infra/grafana/dashboards/*.json`
- `infra/backup/pg-dump.sh`, `infra/backup/restore.sh`
- `.github/workflows/ci.yml`
- `.github/workflows/build.yml`
- `.github/workflows/deploy.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/api/src/health.controller.ts`
- `scripts/smoke.sh`
- `README.md`

## Implementation notes
- Caddy auto-HTTPS requires DNS A records pointing to VPS first. Document in README.
- GHCR image tags: `ghcr.io/<owner>/vitapeak-api:<sha>` and `:<git-tag>`.
- Migrations: API container runs `prisma migrate deploy` on start (guarded by env flag to allow disabling).
- Sentry DSNs differ per env. Mobile uses `expo-sentry`.
- Postgres backup encryption: GPG with passphrase from VPS secret (`/etc/vitapeak/backup.gpg.pass` mode 600). Document rotation.
- Smoke test runs against deployed env: signup flow, check-in flow, healthchecks.
- Throttler defaults: 10 reqs/min for `/auth/*` and `/check-ins` per IP+user.
- CSP: allow `'self'`, `data:` for images, MinIO origin for media, Sentry ingest URL.

## Acceptance criteria
- [ ] `pnpm test` + `pnpm lint` + `pnpm typecheck` all pass in CI on a fresh branch.
- [ ] API + web Docker images build reproducibly under 5 min.
- [ ] Deploy workflow lands new images on VPS without downtime (rolling restart via compose).
- [ ] All four primary domains serve HTTPS via Caddy with valid Let's Encrypt cert.
- [ ] Healthchecks: `/health` 200, `/ready` 200 when deps up; 503 when Postgres stopped.
- [ ] Grafana dashboard shows API request rate, p95 latency, error rate.
- [ ] Loki captures stdout logs from all containers.
- [ ] Sentry receives a forced test error from API, web, mobile.
- [ ] Nightly backup cron writes encrypted dump to MinIO + offsite; manual restore.sh successfully restores in a scratch container.
- [ ] `scripts/smoke.sh` exits 0 against production URL.
- [ ] README quickstart instructions reproduce dev setup on a fresh machine in under 30 min.
- [ ] Rate limiter throttles abusive bursts (manual test).
- [ ] Security headers present (test via `securityheaders.com` or curl -I).

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/09-hardening-and-deploy.md. Begin by listing the DNS
records and VPS prerequisites I need before any deploy can happen. Then
propose the GitHub Actions matrix before writing workflow YAML.
```
