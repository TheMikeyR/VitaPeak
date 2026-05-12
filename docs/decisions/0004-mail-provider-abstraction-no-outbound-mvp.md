# 0004 — Mail: provider abstraction, no outbound delivery on VPS for MVP

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/06-notifications.md

## Context

PLAN.md locked email via `nodemailer` against Postal (self-host) or Mailgun/Postmark (SaaS), swappable by env. We need to ship invite emails (chunk 01) and alert emails (chunk 06) eventually, but:

- 8 GB VPS budget cannot host Postal cleanly (Postal itself ~500 MB + MariaDB + RabbitMQ ≈ 1 GB).
- Solo pilot likely runs with **manual invite distribution** (Mike copies the invite link from the API response and shares it via WhatsApp / DM to friendly pilot users).
- We still want the code path to exist so flipping a switch enables real delivery later.

The right shape is a provider interface with multiple implementations, gated by env.

## Options considered

1. **Self-host Postal** *(original)* — Full mail server, own IP reputation. Cost: RAM, ops, IP warm-up, deliverability tuning, SPF/DKIM/DMARC setup. Overkill.
2. **SaaS-only from day one (Postmark / Resend / Mailgun)** — Reliable, free tier covers MVP volume. Cost: one external dependency, GDPR sub-processor entry. Activate on demand.
3. **No mail at all for MVP, manual link distribution** — Cheapest. Code path missing → painful retrofit when pilot opens to non-friend users.
4. **Mail-provider abstraction, default `console` provider, real providers behind env** *(chosen)* — Code always calls `mailService.send(...)`. The configured provider decides what happens. Default writes to stdout with a structured log line. Switching to real delivery is a config change.

## Decision

**We will define a `MailProvider` interface with multiple implementations, selected by env. MVP runs with `MAIL_PROVIDER=console` on VPS (no outbound). Local dev runs `MAIL_PROVIDER=smtp` against Mailhog.**

Provider implementations (all under `apps/api/src/modules/mail/providers/`):

- `console.provider.ts` — logs structured JSON to stdout (`{ kind: "mail", to, subject, bodyText, bodyHtml, templateId }`). Returns success. Default on VPS for MVP.
- `smtp.provider.ts` — nodemailer over SMTP. Used in local dev pointing at Mailhog.
- `postmark.provider.ts` — `postmark` SDK. Activated by setting `MAIL_PROVIDER=postmark` + `POSTMARK_SERVER_TOKEN`.
- `resend.provider.ts` — `resend` SDK. Same shape.

Selection logic in `mail.module.ts`:

```ts
const provider = process.env.MAIL_PROVIDER ?? 'console';
// dynamic import + provider factory
```

**Invite-link fallback for `console` provider**:

When `MAIL_PROVIDER=console` and an invite email would have been sent, the API also returns the raw invite URL in the `POST /invites` response body (gated by `MAIL_FALLBACK_RETURN_LINK=true`). The therapist UI in the web app shows a "copy invite link" affordance instead of "email sent" toast. This keeps the pilot workflow functional without outbound delivery.

In production with a real provider, `MAIL_FALLBACK_RETURN_LINK` is unset/false and the response only confirms enqueue.

**Templates** live as plain HTML+text strings in `apps/api/src/modules/mail/templates/` for MVP. React Email is deferred (adds build step; not worth it before real provider is active).

## Consequences

- **Positive**:
  - Zero outbound mail infrastructure on MVP VPS. Zero deliverability risk during pilot.
  - Switching to real provider is a config change, not a code rewrite.
  - Local dev (`smtp` → Mailhog) verifies the full code path including templates.
  - Console provider's structured stdout makes "what would we have emailed?" trivially auditable.
- **Negative**:
  - Pilot users get invite links via manual channels (WhatsApp / DM) until a SaaS provider is wired. Friction.
  - `console` provider can mask template bugs (no rendered output reviewed). Mitigated by Mailhog in local dev.
  - One more env var to remember in deploy runbook.
- **Follow-up actions**:
  - Chunk 06 updated: replace nodemailer-only design with provider interface + default `console` on prod.
  - Chunk 01 updated: invite flow uses mailService; documents `MAIL_FALLBACK_RETURN_LINK` for pilot.
  - Sub-processors list: empty for mail until a real provider activated; document trigger.

## References

- Postmark: https://postmarkapp.com/
- Resend: https://resend.com/
- Mailhog: https://github.com/mailhog/MailHog
- React Email (deferred): https://react.email/
