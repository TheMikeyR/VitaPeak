# Chunk 01 — Keycloak auth + multi-tenant invite flow

Status: ⬜ not started
Plan mode: **OPTIONAL** — surface only if realm.json structure or invite flow ambiguous.

## Goal
Wire Keycloak OIDC into NestJS API, Next.js web, and Expo mobile. Implement clinic/therapist/client model with invite-by-email flow. Enforce tenant isolation via guard.

## Prerequisites
- Chunk 00 merged.

## Context for fresh session
Repo scaffold is in place. Postgres + Keycloak run in Docker. No auth yet — `/health` is public, no users exist. This chunk lands the auth backbone for everything that follows. After this chunk, a therapist can sign up, create a clinic, invite a client by email, and the client can register through a magic link.

## Locked decisions (see PLAN.md)
- Auth: Keycloak (OIDC). `vitapeak` realm.
- Multi-tenant from day one. Every domain row has `clinicId`.
- Tenant isolation enforced in NestJS guards (not Postgres RLS — yet).
- Roles in Keycloak: `therapist`, `client`. Therapist subroles via `TherapistRole` enum on app side (OWNER/ADMIN/THERAPIST).
- Therapist signup creates a new `Clinic`. Client signup goes through invite only.
- Token: access token in Authorization header (mobile + web). Web uses HTTP-only cookie session via Auth.js or @keycloak/keycloak-js with token storage in secure cookie — pick **Auth.js v5 with Keycloak provider** for web; mobile uses **`expo-auth-session`** OIDC flow with refresh tokens in `expo-secure-store`.

## Scope (in)
- `infra/keycloak/realm-vitapeak.json` — realm export with `vitapeak-api` (bearer) + `vitapeak-web` (confidential, code flow) + `vitapeak-mobile` (public, PKCE) clients, `therapist` + `client` roles.
- NestJS `KeycloakGuard` (validates JWT via JWKS), `RolesGuard`, `CurrentUser` decorator.
- NestJS `TenantGuard` — derives `clinicId` from authenticated user, attaches to request, rejects cross-tenant access.
- Prisma models extended: `Clinic`, `Therapist`, `Client`, `Invite` (id, clinicId, email, token, expiresAt, role).
- ts-rest contracts: `auth/me`, `clinics/signup`, `invites/create`, `invites/accept`.
- NestJS modules: `auth`, `clinics`, `therapists`, `clients`, `invites`.
- Next.js web: login page (redirect to Keycloak), session middleware, protected `(app)` layout, signup wizard (create clinic), invite-client form, invite-link landing.
- Expo: login screen (OIDC via `expo-auth-session`), secure token storage, auto-refresh, post-login role gate routing to `(client)` or `(therapist)` group.
- Invite email: send via Mailhog locally. Tokenized URL.
- Audit hooks: stub interceptor that logs to console (real `AuditLog` table comes in chunk 07).

## Scope (out)
- Body map / check-ins (chunk 02)
- Plans (chunk 04)
- Program templates (chunk 05)
- Persistent audit log table (chunk 07)
- Consent records (chunk 07)
- Email provider beyond Mailhog (chunk 06)
- Password reset UI customization beyond Keycloak defaults

## Files to create / modify
- `infra/keycloak/realm-vitapeak.json`
- `infra/docker-compose.yml` — mount realm.json + auto-import
- `packages/db/prisma/schema.prisma` — add `Invite`, finalize `Clinic`/`Therapist`/`Client` per PLAN
- `packages/db/prisma/seed.ts` — seed one clinic, one therapist (with matching Keycloak user)
- `packages/contracts/src/auth.ts`, `clinics.ts`, `invites.ts`
- `apps/api/src/auth/keycloak.guard.ts`
- `apps/api/src/auth/tenant.guard.ts`
- `apps/api/src/auth/current-user.decorator.ts`
- `apps/api/src/modules/clinics/clinics.controller.ts` + service
- `apps/api/src/modules/invites/invites.controller.ts` + service (email send via nodemailer → Mailhog)
- `apps/api/src/modules/auth/me.controller.ts`
- `apps/web/app/(auth)/login/page.tsx` + `auth.ts` (Auth.js v5 config)
- `apps/web/middleware.ts` — protect `(app)`
- `apps/web/app/(app)/onboarding/clinic/page.tsx`
- `apps/web/app/(app)/clients/invite/page.tsx`
- `apps/web/app/invite/[token]/page.tsx` — public invite landing
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/src/auth/use-auth.ts` — token storage, refresh
- `apps/mobile/app/_layout.tsx` — role-aware redirect

## Implementation notes
- Use **Auth.js v5** in Next.js (replaces NextAuth). Has stable Keycloak provider.
- Mobile: `expo-auth-session/providers/oidc` with PKCE. Store tokens in `expo-secure-store`.
- API never calls Keycloak admin API in request path — only on user provisioning (when a therapist signs up). For that, mint admin-cli token, create Keycloak user, store `keycloakId` in DB.
- TenantGuard reads `clinicId` from the user's DB row (looked up by `keycloakId`), not from the JWT. Avoids stale token claims.
- Invite flow: therapist POSTs `/invites` → API creates `Invite` row + sends magic link `https://app.../invite/<token>` → user clicks → web page calls `/invites/accept` which creates Keycloak user (or links if exists), then redirects to login. Client logs in and lands in `(client)` group.

## Acceptance criteria
- [ ] `docker compose up -d` — Keycloak boots with `vitapeak` realm pre-loaded.
- [ ] Visit `/login` on web → redirected to Keycloak → can sign up as therapist → lands on clinic onboarding → creates clinic → redirected to dashboard placeholder.
- [ ] DB has: 1 Clinic, 1 Therapist row with correct `keycloakId`.
- [ ] Therapist invites a fake client email → Mailhog shows email with invite link.
- [ ] Open invite link → register through Keycloak → land in client mobile/web app.
- [ ] `GET /api/me` returns `{ user, clinic, role }` for both therapist and client.
- [ ] Attempting cross-tenant access (manual): therapist from clinic A calling `/clients/<id-from-clinic-B>` returns 403.
- [ ] `pnpm test:e2e:api` passes for auth happy-path test.
- [ ] Expo: login screen opens Keycloak in browser → redirects back to app → token stored → role-based route lands correctly.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/01-auth-and-tenancy.md. Start by reading PLAN.md §
"Data model" and § "Compliance" so you respect access-control patterns, then
propose the realm.json structure before writing any code.
```
