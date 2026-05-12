# Architecture Decision Records (ADRs)

One ADR per significant decision. Numbered + dated + immutable once accepted.

## Format

Filename: `NNNN-kebab-title.md` (e.g. `0001-body-svg-source.md`).

## Workflow

1. Spike or chunk surfaces a non-obvious choice.
2. Draft ADR in `Proposed` status.
3. Review with team / future-you.
4. Mark `Accepted` (or `Rejected`) + date.
5. Never edit accepted ADRs. Supersede via a new ADR that links back.

## Template

Copy `_template.md` for new ADRs.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| 0001 | Body SVG source: AI-assisted, owned in-repo | Accepted | 2026-05-12 |
| 0002 | Auth: Better-Auth for MVP, Keycloak migration path preserved | Accepted | 2026-05-12 |
| 0003 | Observability: defer Loki/Prom/Grafana stack, emit metrics only | Accepted | 2026-05-12 |
| 0004 | Mail: provider abstraction, no outbound delivery on VPS for MVP | Accepted | 2026-05-12 |
| 0005 | Sentry: deferred for MVP, SDK hooks ship now gated by env DSN | Accepted | 2026-05-12 |
| 0006 | Health data integration: read-only HealthKit + Health Connect ingest | Accepted | 2026-05-12 |
