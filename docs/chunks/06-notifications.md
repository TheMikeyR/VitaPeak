# Chunk 06 — Push reminders + email alerts

Status: ⬜ not started
Plan mode: **OPTIONAL** — standard BullMQ + Expo Push wiring.

## Goal
Schedule client push reminders for check-ins (per program config). Send email alerts to therapists on high-pain check-ins and missed check-ins.

## Prerequisites
- Chunk 02 (check-ins)
- Chunk 04 (plans, optional but used for "before-workout" reminders)
- Chunk 05 (program template provides schedule)

## Context for fresh session
Configurable check-in cadence exists in program config (chunk 05). Mobile app currently has no scheduled prompt. Therapists rely on manual web visits to spot issues. This chunk wires Expo Push + transactional email so VitaPeak nudges both sides.

## Locked decisions
- Push: **Expo Push** (free, iOS+Android via EAS).
- Email: **MailProvider abstraction** per ADR 0004. Implementations live under `apps/api/src/mail/providers/`: `console.provider.ts` (default on VPS for MVP), `smtp.provider.ts` (Mailhog local dev), `postmark.provider.ts`, `resend.provider.ts`. Provider selected via `MAIL_PROVIDER` env at boot. Chunk 01 created the abstraction with `console` + `smtp` providers; this chunk **extends it** with `postmark` and `resend` implementations and the full alert templates.
- Alert delivery on MVP VPS: with `MAIL_PROVIDER=console`, every alert produces a structured stdout log line `{ kind: "mail", to, subject, templateId, vars }`. No outbound email until the operator flips `MAIL_PROVIDER` to a real provider and supplies the token env.
- Scheduling: backend cron worker (BullMQ + Redis) — runs every 5 min, evaluates upcoming reminders + missed-check-in alerts.
- Therapist alert rules (MVP):
  - High pain: any `PainPoint.level >= 8` in last check-in.
  - Missed: client's effective schedule says daily but no check-in for > 48h.
- Quiet hours: respect `reminderTimes` for push; emails any time.
- Metric emission (ADR 0003): `notification_sent_total{kind, status}` counter incremented per send across all providers (`console` counts as `status="dry_run"`).

## Scope (in)
- Redis is already in compose (chunk 00). Add **BullMQ** wiring in API.
- Push token registration:
  - ts-rest: `POST /me/push-token` (Expo token, platform).
  - Prisma: `PushToken` (userId, token, platform, lastSeenAt).
- NestJS `notifications` module:
  - `notifications.service.ts` — send push (Expo SDK) + send email via the injected `MailProvider`.
  - `reminders.cron.ts` — BullMQ scheduler.
  - `alerts.service.ts` — high-pain + missed-check-in evaluators (called from CheckIn create + by cron).
- **MailProvider abstraction extended** (started in chunk 01):
  - `apps/api/src/mail/mail.service.ts` — typed `send({ to, templateId, vars })` API.
  - `apps/api/src/mail/providers/postmark.provider.ts` — uses `postmark` SDK, configured by `POSTMARK_SERVER_TOKEN`.
  - `apps/api/src/mail/providers/resend.provider.ts` — uses `resend` SDK, configured by `RESEND_API_KEY`.
  - `apps/api/src/mail/templates/` — plain HTML + text templates: `invite.tsx`, `high-pain-alert.tsx`, `missed-checkin.tsx`. (Plain string templates for MVP; React Email is deferred per ADR 0004.)
- Mobile:
  - `expo-notifications` permission flow.
  - On login, register device push token to backend.
  - Local notification fallback if no server-side schedule (optional).

## Scope (out)
- In-app inbox (defer)
- SMS (defer)
- Marketing email (defer)
- GDPR audit of notifications (handled in chunk 07 via global audit interceptor)

## Files to create / modify
- `infra/docker-compose.yml` — no mailer container added (provider abstraction handles outbound). Confirm Redis still healthy.
- `packages/db/prisma/schema.prisma` — `PushToken`
- `packages/contracts/src/notifications.ts` — push token register
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/expo-push.service.ts`
- `apps/api/src/modules/notifications/reminders.cron.ts`
- `apps/api/src/modules/notifications/alerts.service.ts`
- `apps/api/src/modules/check-ins/check-ins.service.ts` — fire `alerts.service.evaluate(checkIn)` after create
- `apps/api/src/mail/providers/postmark.provider.ts` (new in this chunk)
- `apps/api/src/mail/providers/resend.provider.ts` (new in this chunk)
- `apps/api/src/mail/templates/high-pain-alert.ts`
- `apps/api/src/mail/templates/missed-checkin.ts`
- `apps/api/src/mail/templates/invite.ts` (moved/refactored from chunk 01 if needed)
- `apps/api/src/lib/queue.ts` — BullMQ setup
- `apps/mobile/src/notifications/register.ts` + call on login
- `apps/mobile/app.config.ts` — add `expo-notifications` config plugin

## Implementation notes
- Expo Push: use `expo-server-sdk` in NestJS. Batch up to 100 tokens per request. Handle `DeviceNotRegistered` → mark token inactive.
- BullMQ scheduler vs cron table: keep simple — single cron expression `*/5 * * * *` runs evaluator. Evaluator queries:
  - Clients whose effective config has scheduled reminders in next 10 min → enqueue push.
  - Clients with daily frequency and last check-in > 48h → enqueue email to therapist.
- Idempotency: a `Reminder` table tracks sent reminders (`clientId`, `scheduledFor`, `kind`, `sentAt`). Cron checks before sending.
- Email templates use a shared layout. Subject lines clinical not alarmist.
- Test mode: `MAIL_PROVIDER=console` already behaves as a dry-run (structured stdout). No separate `EMAIL_DRY_RUN` flag.

## Acceptance criteria
- [ ] `docker compose up -d` — Redis healthy.
- [ ] Mobile asks for notification permission on first login; token POSTed to API.
- [ ] Set client schedule to `daily 08:00`. Manually trigger cron → Expo push lands on physical device (verified via Expo dashboard or device).
- [ ] Submitting a check-in with level 9 → with `MAIL_PROVIDER=smtp` therapist email lands in Mailhog; with `MAIL_PROVIDER=console` a structured stdout log line `{ kind: "mail", templateId: "high-pain-alert", ... }` is emitted; with `MAIL_PROVIDER=postmark` (test token) Postmark API receives the send.
- [ ] Skip a day with daily frequency → after 48h cron → therapist receives the "missed check-in" alert through the configured provider.
- [ ] `notification_sent_total{kind="email", status="success"}` and `{kind="push", status="success"}` counters increment per send.
- [ ] Idempotency: rerunning cron in same window does not duplicate sends (`Reminder` table prevents).
- [ ] Unit tests cover alert rules.
- [ ] No regression.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/06-notifications.md. Start by sketching the BullMQ queue
shape and the Reminder idempotency model before adding services.
```
