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
- Email: SMTP via **Mailhog** locally; production swappable to Postmark/Mailgun via env. NestJS uses `nodemailer`.
- Scheduling: backend cron worker (BullMQ + Redis) — runs every 5 min, evaluates upcoming reminders + missed-check-in alerts.
- Therapist alert rules (MVP):
  - High pain: any `PainPoint.level >= 8` in last check-in.
  - Missed: client's effective schedule says daily but no check-in for > 48h.
- Quiet hours: respect `reminderTimes` for push; emails any time.

## Scope (in)
- Redis is already in compose (chunk 00). Add **BullMQ** wiring in API.
- Push token registration:
  - ts-rest: `POST /me/push-token` (Expo token, platform).
  - Prisma: `PushToken` (userId, token, platform, lastSeenAt).
- NestJS `notifications` module:
  - `notifications.service.ts` — send push (Expo SDK) + send email (nodemailer).
  - `reminders.cron.ts` — BullMQ scheduler.
  - `alerts.service.ts` — high-pain + missed-check-in evaluators (called from CheckIn create + by cron).
- Email templates (React Email or plain HTML): high-pain alert, missed check-in alert, invite (already exists in chunk 01, refactor in).
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
- `infra/docker-compose.yml` — swap mailer reference (Redis already present)
- `packages/db/prisma/schema.prisma` — `PushToken`
- `packages/contracts/src/notifications.ts` — push token register
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/expo-push.service.ts`
- `apps/api/src/modules/notifications/email.service.ts` + templates dir
- `apps/api/src/modules/notifications/reminders.cron.ts`
- `apps/api/src/modules/notifications/alerts.service.ts`
- `apps/api/src/modules/check-ins/check-ins.service.ts` — fire `alerts.service.evaluate(checkIn)` after create
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
- Test mode: env `EMAIL_DRY_RUN=true` logs instead of sends.

## Acceptance criteria
- [ ] `docker compose up -d` — Redis healthy.
- [ ] Mobile asks for notification permission on first login; token POSTed to API.
- [ ] Set client schedule to `daily 08:00`. Manually trigger cron → Expo push lands on physical device (verified via Expo dashboard or device).
- [ ] Submitting a check-in with level 9 → therapist gets email in Mailhog.
- [ ] Skip a day with daily frequency → after 48h cron → therapist gets "missed check-in" email.
- [ ] Idempotency: rerunning cron in same window does not duplicate sends (`Reminder` table prevents).
- [ ] Unit tests cover alert rules.
- [ ] No regression.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/06-notifications.md. Start by sketching the BullMQ queue
shape and the Reminder idempotency model before adding services.
```
