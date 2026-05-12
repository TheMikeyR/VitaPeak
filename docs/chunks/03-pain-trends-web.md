# Chunk 03 — Therapist web: client list + pain trends + body-map heatmap

Status: ⬜ not started
Plan mode: **OPTIONAL** — confirm aggregation SQL + SVG-reuse strategy if unclear.

## Goal
Therapist can view their clients, drill into a client, see pain trend charts over time per region, and a body-map heatmap aggregating recent pain.

## Prerequisites
- Chunk 00, 01, 02 merged.

## Context for fresh session
Clients submit pain check-ins (chunk 02). Therapists log in (chunk 01) but see empty placeholder dashboards. This chunk delivers the core therapist value: insight into client state between sessions.

## Locked decisions
- Charts: **Recharts** (mature, MIT, SSR-friendly).
- Body-map heatmap: reuse `react-native-svg` SVG via `react-native-web`, OR render same SVG paths directly in plain React DOM. Pick whichever is simpler — favor plain React for web.
- Aggregation done server-side (avoid shipping all rows to client).
- Time windows: last 7d, 30d, 90d, all-time.

## Scope (in)
- ts-rest contracts:
  - `GET /clients` — paginated, own clinic
  - `GET /clients/:id` — detail
  - `GET /clients/:id/check-ins?from=...&to=...`
  - `GET /clients/:id/pain-trend?regionId=...&window=30d` — server-aggregated (avg, max, count per day)
  - `GET /clients/:id/pain-heatmap?window=30d` — `{ regionId: avgLevel | maxLevel | count }`
- NestJS endpoints with tenant + ownership guards.
- Postgres query: GROUP BY date_trunc('day', occurredAt), regionId.
- Next.js pages:
  - `/clients` — table with name, last check-in, recent trend sparkline (mini chart), flag icon if recent level ≥7.
  - `/clients/[id]` — header (name, program), tabs:
    - **Overview**: heatmap (front+back SVG colored by avg pain) + small trend line for top 3 regions.
    - **Pain history**: full per-region line charts, time-window toggle.
    - **Check-ins (raw)**: list of submissions, expand to see all pain points + notes.
- Web SVG body component: same region slug ↔ path id as mobile; receives `{ regionId: color }` map.
- Search + filter on client list.

## Scope (out)
- Plans / calendar (chunk 04)
- Program template editor (chunk 05)
- Notifications (chunk 06)
- Therapist mobile companion (chunk 08)
- Exports (chunk 07)

## Files to create / modify
- `packages/contracts/src/clients.ts` (extend)
- `apps/api/src/modules/clients/clients.controller.ts` (list, detail)
- `apps/api/src/modules/check-ins/check-ins.controller.ts` — add therapist-facing read endpoints
- `apps/api/src/modules/check-ins/aggregate.service.ts` — raw SQL or Prisma `$queryRaw` for time-bucket aggregation
- `apps/web/app/(app)/clients/page.tsx`
- `apps/web/app/(app)/clients/[id]/page.tsx`
- `apps/web/app/(app)/clients/[id]/(tabs)/overview.tsx`
- `apps/web/app/(app)/clients/[id]/(tabs)/history.tsx`
- `apps/web/app/(app)/clients/[id]/(tabs)/check-ins.tsx`
- `apps/web/components/BodyMapSvg.tsx` — web version, region-id → fill
- `apps/web/components/PainTrendChart.tsx` — Recharts line/area
- `apps/web/components/PainHeatmap.tsx` — wraps BodyMapSvg with color scale
- `apps/web/components/Sparkline.tsx` — tiny inline Recharts
- `apps/web/lib/api.ts` — ts-rest client wired with Auth.js session token
- `apps/web/e2e/clients.spec.ts` — Playwright

## Implementation notes
- Aggregate query (example):
  ```sql
  SELECT date_trunc('day', "occurredAt") AS day,
         pp."bodyRegionId" AS region,
         AVG(pp.level)::float AS avg_level,
         MAX(pp.level) AS max_level,
         COUNT(*) AS n
  FROM "CheckIn" ci
  JOIN "PainPoint" pp ON pp."checkInId" = ci.id
  WHERE ci."clientId" = $1 AND ci."occurredAt" >= $2 AND ci."occurredAt" < $3
  GROUP BY day, region
  ORDER BY day;
  ```
- Heatmap color scale: 0=neutral, 1-3=yellow, 4-6=orange, 7-10=red. Use `d3-scale` or a small custom interpolator.
- Server-side rendering for `/clients/[id]` initial paint. Hydrate React Query cache from server props.
- Flag rule for client list: any check-in in last 7d with level ≥7 OR average level rising > 2 vs prior 7d.

## Acceptance criteria
- [ ] `/clients` lists own-clinic clients. Cross-clinic clients invisible.
- [ ] Client detail loads in < 500ms with 30 days of seeded data.
- [ ] Heatmap shows colored regions matching latest 30-day average.
- [ ] Trend chart line shows daily aggregate; toggling 7d/30d/90d works.
- [ ] Submitting a new check-in on the mobile app, then refreshing web, updates charts.
- [ ] Playwright e2e passes: login as therapist → open client → see chart.
- [ ] No regression on prior chunks.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/03-pain-trends-web.md. Propose the aggregation SQL and the
SVG-reuse strategy (RN-web bridge vs plain React copy) before writing code.
```
