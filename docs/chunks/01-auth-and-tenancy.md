# Chunk 01 — Better-Auth + multi-tenant invite flow + Prisma tenancy enforcement

Status: ✅ done — 2026-05-16 — see PR (Better-Auth + multi-tenant invites + Prisma tenancy)
Plan mode: **REQUIRED** — Better-Auth replaces Keycloak (ADR 0002), Prisma tenancy middleware is new locked design, and invite-link UX changes when `MAIL_PROVIDER=console` (ADR 0004). Surface these decisions before code.

## Goal

Wire Better-Auth (in-process inside NestJS) across the API, Next.js web (Auth.js v5 client adapter), and Expo mobile (OIDC-shaped flow). Implement the clinic/therapist/client model with an invite flow that works both with outbound mail and with the `console` fallback. Enforce tenant isolation in two layers: a NestJS `TenantGuard` **and** a Prisma client extension that injects `clinicId` into every domain query.

## Prerequisites

- Chunk 00 merged.

## Context for fresh session

Repo scaffold is in place. Postgres + MinIO + Mailhog + Redis run in Docker. **There is no Keycloak container — ADR 0002 replaced it with Better-Auth in-process.** No auth wired yet. After this chunk, a therapist can sign up, create a clinic, invite a client (link comes back inline because `MAIL_PROVIDER=console` for now), and the client can register through the magic link.

Read ADR 0002 + ADR 0004 first. Both shape this chunk's design.

## Locked decisions

- **Auth**: Better-Auth running in-process inside the NestJS API. Keycloak is rejected for MVP per ADR 0002. JWT shape stays Keycloak-compatible (`sub`, `email`, `email_verified`, `preferred_username`, `realm_access.roles: ["therapist" | "client"]`) so guards never change when Keycloak is adopted later.
- **External user identifier column**: `externalAuthId` (not `keycloakId`). Generic to whichever issuer is active.
- **Multi-tenant from day one**. Every domain row carries `clinicId`.
- **Tenant isolation enforced in two layers**:
  1. NestJS `TenantGuard` (controller-level, derives `clinicId` from the authenticated user's DB row keyed by `externalAuthId`).
  2. **Prisma client extension `tenancy.extension.ts`** (model-level): a `$extends` that intercepts every `findMany`, `findFirst`, `findUnique`, `update`, `delete` on every domain model containing a `clinicId` column and injects `{ clinicId: ctx.clinicId }` into the where clause. Tests fail if a query is issued without a tenant context.
- **Roles**: Better-Auth issues role claim `therapist` or `client`. Therapist subroles via `TherapistRole` enum on app side (`OWNER` / `ADMIN` / `THERAPIST`).
- **Therapist signup creates a new `Clinic`**. Client signup is invite-only.
- **Mobile token storage**: access + refresh in `expo-secure-store`. Refresh on 401.
- **Web session storage**: HTTP-only cookies issued by Better-Auth, validated by Next.js middleware.
- **Invite delivery**: through `MailProvider` (ADR 0004). When `MAIL_PROVIDER=console` and `MAIL_FALLBACK_RETURN_LINK=true`, the `POST /invites` response body includes `{ inviteUrl }` so the therapist UI can show a "copy invite link" affordance. In prod with a real provider, the link is delivered by email only.
- **Audit hooks**: stub interceptor logs `{ kind: "audit", action, actor, entity, entityId }` to stdout. Real `AuditLog` table comes in chunk 07.

## Open decisions (surface in plan mode)

- **Better-Auth deployment shape**: standalone Better-Auth handler mounted under `/auth/*` in NestJS, or fully library-style with no HTTP routes (custom NestJS controllers calling Better-Auth's TS API)? Plan-mode recommendation: mount the handler under `/auth/*` so password resets, email verification, and magic links work out of the box.
- **Web client library**: Better-Auth's React client vs Auth.js v5 with a custom Better-Auth provider. Recommend: Better-Auth's React client to avoid two auth libraries in the web app.
- **Mobile auth flow**: Better-Auth supports bearer-token mode well, so `expo-auth-session` is not strictly required — a custom login screen calling `/auth/sign-in/email` returns tokens directly. Confirm: skip OIDC redirect flow for MVP.
- **Magic-link vs email/password**: enable both? Recommend yes — invite flow uses magic links, regular login uses email/password.
- **Prisma extension scope**: which models are "tenant-bound" exactly? Recommend: every model with a `clinicId` field (Therapist, Client, Invite, CheckIn, PainPoint, PlanItem, ClientProgram, ProgramTemplate when clinicId is non-null, Exercise when clinicId is non-null, AuditLog, HealthMetric, HealthSyncState). Exclude: BodyRegion, system-seeded ProgramTemplate/Exercise rows where `clinicId IS NULL`.

## Scope (in)

- **Better-Auth setup** (`apps/api/src/auth/better-auth.module.ts`): configure with Prisma adapter, enable email/password, magic link, optional passkey for later. Issue JWTs with Keycloak-compatible claim shape.
- **Generic `AuthGuard`** (`apps/api/src/auth/auth.guard.ts`): validates JWT, attaches `{ userId, externalAuthId, role }` to request. Issuer-agnostic.
- **`TenantGuard`** (`apps/api/src/auth/tenant.guard.ts`): looks up the user in DB by `externalAuthId`, attaches `{ clinicId, dbUserId }` to request. 403 on missing record.
- **`@CurrentUser()` decorator**: returns `{ externalAuthId, dbUserId, clinicId, role }`.
- **Prisma tenancy extension** (`apps/api/src/db/tenancy.extension.ts`): `$extends` that requires an `AsyncLocalStorage` context with `clinicId` before any domain-model read/write. Throws if context missing. Models with `clinicId IS NULL` rows (system seeds) are accessed via an explicit "system context" escape hatch.
- **NestJS `RequestContextMiddleware`**: populates `AsyncLocalStorage` with `clinicId` from the resolved tenant guard so the Prisma extension can see it without prop-drilling.
- **Prisma models**: finalize `Clinic`, `Therapist` (with `externalAuthId`), `Client` (with optional `externalAuthId`), add `Invite` (id, clinicId, email, token hash, expiresAt, acceptedAt, invitedRole, invitedByTherapistId).
- **ts-rest contracts**: `auth/me`, `clinics/signup`, `invites/create`, `invites/accept`.
- **NestJS modules**: `auth`, `clinics`, `therapists`, `clients`, `invites`. Each controller wired with `@UseGuards(AuthGuard, TenantGuard)` except sign-up endpoints.
- **Mail integration**: import `MailModule` (created in this chunk as a minimal version — full provider abstraction lives in chunk 06; here we only need `console` and `smtp` providers). Invite uses `mailService.sendInvite({ to, inviteUrl })`.
- **Next.js web**: login page using Better-Auth React client, session middleware, protected `(app)` layout, therapist signup wizard (create clinic), invite-client form, invite-link landing page that accepts the token.
- **Expo mobile**: login screen calling `/auth/sign-in/email` directly, secure token storage, refresh-on-401 interceptor, post-login role gate routing to `(client)` or `(therapist)`.
- **Stub audit interceptor**: `apps/api/src/audit/audit.interceptor.ts` logs to stdout, no DB writes yet.

## Scope (out)

- Body map / check-ins (chunk 02)
- Plans (chunk 04)
- Program templates (chunk 05)
- Persistent audit log table (chunk 07)
- Consent records (chunk 07)
- Full mail provider abstraction with Postmark + Resend implementations (chunk 06; here we ship only `console` + `smtp`)
- Password reset UX polish beyond Better-Auth defaults
- Passkeys / MFA (Better-Auth supports them; defer enabling)
- Postgres RLS (deferred; see PLAN.md "Deferred services")

## Files to create / modify

- `infra/docker-compose.yml` — remove any Keycloak service from chunk 00 (or never add it). Confirm no Keycloak references remain.
- `packages/db/prisma/schema.prisma` — `Invite` model; `externalAuthId` on Therapist + Client; relevant indexes.
- `packages/db/prisma/seed.ts` — seed one clinic, one therapist (with matching Better-Auth user via the admin API at seed time).
- `packages/contracts/src/auth.ts`, `clinics.ts`, `invites.ts`
- `apps/api/src/auth/better-auth.module.ts` — Better-Auth setup mounted at `/auth/*`.
- `apps/api/src/auth/auth.guard.ts`
- `apps/api/src/auth/tenant.guard.ts`
- `apps/api/src/auth/current-user.decorator.ts`
- `apps/api/src/db/tenancy.extension.ts` — Prisma `$extends` that enforces `clinicId` via `AsyncLocalStorage`.
- `apps/api/src/db/request-context.middleware.ts`
- `apps/api/src/db/prisma.module.ts` — exports the extended client.
- `apps/api/src/audit/audit.interceptor.ts` — stdout stub.
- `apps/api/src/mail/mail.module.ts` + `providers/console.provider.ts` + `providers/smtp.provider.ts` (minimum viable; chunk 06 extends).
- `apps/api/src/modules/clinics/clinics.controller.ts` + service
- `apps/api/src/modules/invites/invites.controller.ts` + service
- `apps/api/src/modules/auth/me.controller.ts`
- `apps/api/test/e2e/auth.e2e-spec.ts` — covers therapist signup, invite create + accept, cross-tenant 403, Prisma extension blocks query without context.
- `apps/web/app/(auth)/login/page.tsx` + Better-Auth React client config
- `apps/web/middleware.ts` — protect `(app)` routes
- `apps/web/app/(app)/onboarding/clinic/page.tsx`
- `apps/web/app/(app)/clients/invite/page.tsx` — "copy invite link" affordance when `MAIL_FALLBACK_RETURN_LINK` is on
- `apps/web/app/invite/[token]/page.tsx` — public invite landing
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/src/auth/use-auth.ts` — token storage + refresh on 401
- `apps/mobile/app/_layout.tsx` — role-aware redirect

## Implementation notes

- **Better-Auth Prisma adapter**: install `better-auth/prisma`. Auth tables (`User`, `Account`, `Session`, `Verification`) coexist with domain tables in the same Postgres DB. `externalAuthId` in `Therapist`/`Client` references `User.id`.
- **JWT issuer claim**: set `iss = "vitapeak-better-auth"`. Migration to Keycloak rewrites `iss` to the Keycloak realm URL; guard does not care about `iss`, only signature + claim shape.
- **JWT signing**: HMAC (`HS256`) with secret in `.env` for MVP. Public-key (`RS256`) with JWKS endpoint is a chunk 09 hardening upgrade.
- **AsyncLocalStorage** is Node 14+; available in NestJS without issues. Use `cls-hooked` or built-in `node:async_hooks` — prefer built-in.
- **Invite token**: 32-byte cryptographically random, stored hashed (SHA-256) in `Invite.token`. URL contains the raw token. Single-use; mark `acceptedAt` on accept.
- **Better-Auth's invite handling** has its own primitive; do not use it. Our `Invite` model carries `clinicId` + `invitedRole` which Better-Auth's invite primitive does not model. Roll our own.
- **Mobile + Better-Auth bearer**: configure `useSecureCookies: false` and enable bearer mode. Tokens come back in the sign-in response.
- **Cross-tenant test**: e2e test must assert that a therapist from Clinic A calling `GET /clients/<id-from-clinic-B>` returns 403 **and** that the Prisma extension would have thrown if the guard missed it (regression test for the belt-and-braces layer).

## Acceptance criteria

- [ ] `docker compose up -d` — Postgres + MinIO + Mailhog + Redis healthy. **No Keycloak service.**
- [ ] `pnpm db:migrate && pnpm db:seed` — DB has the auth tables, 1 Clinic, 1 Therapist with `externalAuthId` matching a Better-Auth `User.id`.
- [ ] Visit `/login` on web → email/password sign-up as a new therapist → lands on clinic onboarding wizard → creates clinic → redirected to dashboard placeholder.
- [ ] Therapist invites `fake-client@example.com` → with `MAIL_PROVIDER=smtp` (local dev), Mailhog shows the email; with `MAIL_PROVIDER=console`, the API response includes `inviteUrl` and the web UI shows a "copy link" button.
- [ ] Open invite link → register through Better-Auth → land in client mobile/web app.
- [ ] `GET /api/me` returns `{ user, clinic, role }` for both therapist and client. The `iss` claim is `vitapeak-better-auth`; the rest of the claim shape matches what a Keycloak token would carry.
- [ ] Cross-tenant access: therapist from Clinic A calling `/clients/<id-from-clinic-B>` returns 403. **Removing the guard temporarily** still returns an error because the Prisma tenancy extension throws.
- [ ] Prisma extension test: any domain-model query executed without the `AsyncLocalStorage` context throws `MissingTenantContextError`.
- [ ] `pnpm test:e2e:api` passes the auth happy-path test + cross-tenant test + Prisma-extension test.
- [ ] Expo: login screen accepts email/password → token stored in secure store → role-based route lands correctly. 401 from API triggers refresh; subsequent retry succeeds.
- [ ] `auth_failure_total{reason}` metric increments on invalid login attempts (placeholder counter; emitter wired even though full `/metrics` endpoint comes in chunk 09).

## Suggested first prompt (after bootstrap)

```
Execute docs/chunks/01-auth-and-tenancy.md. Read ADR 0002 and ADR 0004 first, then enter plan mode. Surface the open decisions (Better-Auth deployment shape, web client library, mobile bearer vs OIDC, magic-link toggle, Prisma extension scope) and wait for my answers before writing the realm config, schema migration, or any guard code.
```
