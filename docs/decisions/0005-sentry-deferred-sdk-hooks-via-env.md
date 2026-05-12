# 0005 — Sentry: deferred for MVP, SDK hooks ship now gated by env DSN

- **Status**: Proposed
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/09-hardening-and-deploy.md

## Context

PLAN.md listed Sentry in the stack table without committing to self-host vs SaaS. Decision-time analysis:

- **Self-host Sentry** requires ~8 GB RAM minimum on its own (Snuba, ClickHouse, Postgres, Redis, Kafka, web). Impossible on an 8 GB VPS without dedicated hardware.
- **SaaS Sentry free tier** is generous (5 k errors/month, 7-day retention) and adequate for MVP pilot, but adds an external sub-processor entry under GDPR.
- For a friends-and-family pilot, crash invisibility for the first weeks is tolerable because every user is one Slack/WhatsApp message away from reporting issues directly.

The desirable shape is: code is already instrumented with Sentry SDKs, but they are dormant until a DSN is configured. Same "emit now, collect later" pattern as ADR 0003 (observability).

## Options considered

1. **Self-host Sentry on VPS** — Rejected. 8 GB RAM requirement collides with the 8 GB VPS budget.
2. **Sentry SaaS active from day one** — Adds one sub-processor immediately; pilot privacy policy must list it. Free tier sufficient for volume. Forces sub-processor disclosure work before pilot. Marginally premature.
3. **No Sentry SDK, add later** — Retrofitting Sentry into already-deployed apps is straightforward but always slower in practice because release-tagging, source-map upload, and breadcrumb setup get deferred ("it works for now").
4. **SDK installed, env-gated init** *(chosen)* — `@sentry/node` (API), `@sentry/nextjs` (web), `@sentry/react-native` (mobile) all installed and bootstrapped at startup. Init is conditional on `SENTRY_DSN` being set. When unset (MVP default), SDKs are no-ops; bundle size cost is the only overhead.

## Decision

**We will install Sentry SDKs across API, web, and mobile in chunk 09 but only initialize them when `SENTRY_DSN` is set. Production VPS leaves the DSN unset for MVP. SaaS Sentry is the only supported activation path; self-hosting is permanently rejected for this codebase.**

Implementation specifics:

- **API** (`apps/api/src/main.ts`):

  ```ts
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.SENTRY_RELEASE,  // git sha injected at build
      tracesSampleRate: 0.1,
      integrations: [Sentry.httpIntegration(), Sentry.prismaIntegration()],
    });
  }
  ```

  Wrap NestJS exception filter so unhandled errors flow through `Sentry.captureException` only when init ran.

- **Web** (`apps/web/sentry.client.config.ts` + `sentry.server.config.ts`): standard `@sentry/nextjs` config with the same `if (DSN) init()` gate. `next.config.js` wraps with `withSentryConfig` so source maps are uploaded **only when** `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` are both set. Otherwise the wrapper is a no-op.

- **Mobile** (`apps/mobile/app/_layout.tsx`): `Sentry.init({ dsn: Constants.expoConfig?.extra?.sentryDsn })` only when `extra.sentryDsn` is set in `app.config.ts`. EAS build env decides. OTA updates via EAS Update can include source maps for symbolication later.

- **Release tagging**: when activated, builds inject git SHA as `SENTRY_RELEASE`. CI step uploads source maps to Sentry. Document the activation runbook in chunk 09 README section.

- **PII scrubbing**: when activated, configure `beforeSend` hook to strip `request.headers.authorization`, `request.cookies`, and any `body.email`/`body.notes` fields. Pain data is special-category GDPR; do not ship it to Sentry. Test scrubbing before flipping DSN in prod.

**Activation trigger**: any one of:

- Pilot opens to non-friend users (≥ 1 user without a direct support channel).
- A production crash is suspected but not reproducible locally for > 24 h.
- App Store / Play Store submission (Sentry mobile crash reports help debug review-team rejections).

## Consequences

- **Positive**:
  - Zero ops cost during MVP. Zero new sub-processor disclosure until activated.
  - Activation is a config change (set DSN env var, redeploy) plus PII-scrubbing verification — no code rewrite.
  - Bundle-size overhead from unused SDK is the only sunk cost (~few hundred KB API, ~30 KB web client, ~few hundred KB mobile).
- **Negative**:
  - Crash blindness during MVP. Reliant on user reports and `docker logs`.
  - Source map upload pipeline must be tested at activation time, not before; risk of surprise tooling friction.
  - One more env var in the deploy runbook.
- **Follow-up actions**:
  - Chunk 09 updated: replace "Sentry SDK init" line with env-gated init pattern + PII scrubbing requirement + source map upload behind same env gate.
  - PLAN.md sub-processors list: note Sentry is in code but inactive; mark "potential" not "active".
  - Add "Sentry activation runbook" placeholder section in deploy README (written when activated).

## References

- @sentry/node: https://docs.sentry.io/platforms/node/
- @sentry/nextjs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- @sentry/react-native: https://docs.sentry.io/platforms/react-native/
- Sentry pricing / free tier: https://sentry.io/pricing/
