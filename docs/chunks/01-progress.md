# Chunk 01 — In-Progress Tracker

Live progress log for `docs/chunks/01-auth-and-tenancy.md`. **Updated after every commit / milestone.** A fresh Claude session can pick up by reading this file + the chunk file + ADRs 0002, 0004, 0007.

- **Branch**: `claude/chunk-01-auth-and-tenancy`
- **Static plan**: `/home/agent/.claude/plans/sequential-wandering-sloth.md`
- **Last update**: 2026-05-16
- **Current phase**: 11 (next — PR + acceptance)

---

## Resumption instructions for a fresh session

```
Read in this order:
1. docs/PLAN.md  (skim the locked decisions table)
2. docs/chunks/01-auth-and-tenancy.md  (the chunk spec)
3. docs/chunks/01-progress.md  (THIS FILE — what's done, what's next)
4. docs/decisions/0002 (Better-Auth), 0004 (mail), 0007 (i18n)

DO NOT re-enter plan mode — plan is already approved at
/home/agent/.claude/plans/sequential-wandering-sloth.md.

Resume at the "Next concrete step" section below.
```

---

## Locked decisions resolved in plan mode

| Decision                     | Pick                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Better-Auth deployment shape | **Mount handler at `/auth/*`** via `toNodeHandler` (Express middleware in `main.ts`)                                 |
| Web auth client              | **Better-Auth React client** (`createAuthClient` from `better-auth/client`)                                          |
| Mobile auth flow             | **Bearer mode, custom RN login screen** (token in `expo-secure-store`)                                               |
| Auth methods                 | **Email/password + magic link** (`magicLink` plugin enabled)                                                         |
| Prisma extension scope       | **Therapist, Client, Invite** (any model with a `clinicId` column; system seeds go through `runWithSystemContext()`) |
| i18n scaffolding             | **Scaffold `packages/i18n` + wire web + mobile in chunk 01**                                                         |
| Web i18n routing             | **`next-intl` cookie-only** (no `[locale]` URL prefix) — single market, no SEO need                                  |

## Implementation deviations from chunk spec

- **JWT signing algorithm**: chunk spec said HS256 with shared secret. Better-Auth's `jwt` plugin **does not support HS256** — only asymmetric (EdDSA default, ES256, RS256, PS256, ECDH-ES variants). Using EdDSA with auto-generated keys stored in the `jwks` table. RS256 + public JWKS endpoint is the chunk 09 hardening upgrade either way; the algorithm choice doesn't affect Keycloak-shape claim compatibility. Document in `apps/api/src/auth/better-auth.config.ts` and consider an ADR follow-up.
- **`packages/db/.env`** is a symlink to root `.env`; the `--env-file` flag was unsupported on `prisma generate`/`migrate dev` in Prisma 6.19 and broke `pnpm db:generate`. Fix landed in commit `4aefd29` — scripts no longer pass `--env-file`; Prisma auto-discovers via the symlink.
- **Seed timing**: original Phase 1 plan included `seed.ts`, but it requires Better-Auth's runtime (`auth.api.signUpEmail`) to create matching `user`/`account` rows. **Deferred to after Phase 4** (after Better-Auth instance exists). `db:seed` script is already added.
- **Phase 4/5 swap**: Phase 5 (MailModule) being completed **before** Phase 4 (Better-Auth) so the `magicLink` plugin's `sendMagicLink` callback can use `MailService` directly. The static plan listed them as 4 → 5; actual order is 5 → 4.
- **API converted to ESM** (chunk 00 was CommonJS). Reason: `better-auth` is ESM-only and TypeScript's `moduleResolution: NodeNext` is required to resolve its subpath exports like `better-auth/plugins/jwt`. All relative imports in `apps/api/src` now carry `.js` suffixes.

---

## Phase progress

### ✅ Phase 1 — Schema + Better-Auth tables + Invite (commit `c0df861`)

- Better-Auth core tables (user, session, account, verification) + jwt plugin's jwks table added to `packages/db/prisma/schema.prisma`.
- `Invite` model with `clinicId`, `tokenHash` (SHA-256), `invitedRole` enum (THERAPIST | CLIENT), `invitedByTherapistId`, `expiresAt`, `acceptedAt`.
- Migration applied: `packages/db/prisma/migrations/20260515185538_auth_and_invites`.
- `better-auth@1.6.11` installed in `apps/api`. `tsx` installed in `packages/db`.
- `db:seed` script added to `packages/db/package.json`. **Seed file not yet written — deferred.**

### ✅ Phase 2 — `packages/i18n` (commit `4aefd29`)

- New `packages/i18n` with locale config (`da` primary, `en` fallback), `localeNames`, `isLocale()` guard.
- Initial keys for chunk 01: `auth.login.*`, `auth.signup.*`, `clinic.onboarding.*`, `invite.send.*`, `invite.accept.*`, `error.*`, `common.*`. **Same key set mirrored in both `da.json` and `en.json`.**
- Locale JSON exposed via package `exports` field so consumers can `import da from '@vitapeak/i18n/locales/da.json'`.
- Workspace `pnpm install` succeeds; `pnpm --filter @vitapeak/i18n build` succeeds.

### ✅ Phase 3 — Prisma tenancy extension (commit `a8b07d0`)

- `apps/api/src/db/tenant-context.ts` — `AsyncLocalStorage<TenantContext | SystemContext>`. Exports `runWithSystemContext()`, `runWithTenantContext()`, `getTenantContext()`, `isSystemContext()`, and the `MissingTenantContextError` class.
- `apps/api/src/db/tenancy.extension.ts` — `Prisma.defineExtension({ query: { $allModels: { $allOperations } } })`. For Therapist/Client/Invite: throws `MissingTenantContextError` if no ALS context; bypasses on system context; injects `clinicId` into `where` (list/aggregate/updateMany/deleteMany) or `data` (create/createMany); post-fetch verifies `clinicId` match for unique-key ops, raising `CrossTenantAccessError` on mismatch.
- `apps/api/src/db/prisma.service.ts` — `PrismaService` with `client: ExtendedPrismaClient`; `OnModuleInit` connects, `OnModuleDestroy` disconnects.
- `apps/api/src/db/prisma.module.ts` — `@Global()` module exporting `PrismaService`. Wired into `AppModule`.

### ✅ Phase 5 — MailModule + audit interceptor (commit `eedde42`)

- **Mail** (`apps/api/src/modules/mail/`):
  - `mail.types.ts` — `MailMessage`, `MailProvider`, `MAIL_PROVIDER` injection symbol.
  - `providers/console.provider.ts` — pino-logs structured JSON.
  - `providers/smtp.provider.ts` — nodemailer (Mailhog at `localhost:1025` by default); `onModuleDestroy` closes transporter.
  - `templates/{invite,magic-link}.ts` — Danish text + escaped HTML.
  - `mail.service.ts` — `sendInvite()`, `sendMagicLink()` typed wrappers.
  - `mail.module.ts` — `@Global()`, factory switches on `MAIL_PROVIDER` env.
- **Audit** (`apps/api/src/audit/`):
  - `audit.decorator.ts` — `@Audit('action.name')` via `SetMetadata(AUDIT_ACTION, ...)`.
  - `audit.interceptor.ts` — reads `AUDIT_ACTION` from handler metadata; logs `{ kind: 'audit', action, actor, entity, entityId }` via `PinoLogger` on success (`tap`). Pulls `actor` from `req.user.dbUserId ?? externalAuthId`. Persistent table is chunk 07.
  - `audit.module.ts` — registers `APP_INTERCEPTOR` globally.
- **ESM conversion** of `apps/api`:
  - `package.json` → `"type": "module"`.
  - `tsconfig.json` → `module: NodeNext`, `moduleResolution: NodeNext`.
  - All relative imports in `apps/api/src/` carry `.js` suffix (NodeNext requirement).
  - Reason: Better-Auth is ESM-only and needs NodeNext to resolve subpath exports like `better-auth/plugins/jwt`.
- `nodemailer` + `@types/nodemailer` installed in `apps/api`.
- `AppModule` imports `PrismaModule`, `MailModule`, `AuditModule`, `HealthModule`.
- `pnpm typecheck` passes across all 11 workspace tasks.

### ✅ Phase 4 — Better-Auth wiring + guards + decorators (commit `3bbf8ea`)

- `apps/api/src/auth/auth.tokens.ts` — `AUTH_TOKEN` symbol extracted to break the ESM circular import between `better-auth.module.ts` (which imports `AuthGuard`) and `auth.guard.ts` (which previously imported `AUTH_TOKEN` from the module).
- `apps/api/src/auth/better-auth.config.ts` — `basePath: '/auth'` set explicitly. `definePayload` Therapist/Client lookups wrapped in `runWithSystemContext` (JWT mint runs outside any HTTP request → no ALS frame).
- `apps/api/src/auth/current-user.decorator.ts` — `@CurrentUser()` + `@TenantPrincipal()` param decorators.
- `apps/api/src/main.ts` — `NestFactory.create(..., { bodyParser: false })`, `app.use('/auth/*', toNodeHandler(auth))` (Express 4 wildcard), then `express.json()` + `express.urlencoded()`.
- `apps/api/src/app.module.ts` — `BetterAuthModule` registered.
- `packages/db/prisma/seed.ts` — instantiates a local minimal Better-Auth, calls `auth.api.signUpEmail` for `demo@vitapeak.local`, then `prisma.clinic.create` + `prisma.therapist.create` (role OWNER) linked by `externalAuthId`. Idempotent.
- Root scripts added: `db:migrate:deploy`, `db:seed`.
- Smoke verified: `pnpm db:seed` succeeded; `POST /auth/sign-up/email` returned 200 with a session token; `GET /health` returned ok.

**Files to write:**

- `apps/api/src/auth/better-auth.config.ts` — factory `createAuth(prisma, mailService)`:
  ```
  betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    emailAndPassword: { enabled: true, autoSignIn: true },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => { await mailService.sendMagicLink({ to: email, url }); },
        expiresIn: 60 * 15,
      }),
      jwt({
        jwt: {
          expirationTime: '1h',
          issuer: 'vitapeak-better-auth',
          definePayload: async ({ user, session }) => {
            // Look up Therapist or Client row by externalAuthId = user.id to derive role + clinicId
            // Return claims:
            // { sub: user.id, email, email_verified, preferred_username, realm_access: { roles: [role] } }
          },
        },
      }),
      bearer(),
    ],
  })
  ```
- `apps/api/src/auth/better-auth.module.ts` — provider `AUTH_TOKEN` (Symbol) using `useFactory: (prisma, mail) => createAuth(prisma.client as unknown as PrismaClient, mail)`. Inject `PrismaService` + `MailService`. Export `AUTH_TOKEN`.
- `apps/api/src/auth/auth.guard.ts` — generic `AuthGuard implements CanActivate`. Reads `Authorization: Bearer <jwt>`. Verifies signature via Better-Auth's JWKS (call `auth.api.getJwks()` once at startup, or use `jose` with the public JWK). Decodes claims, attaches `{ externalAuthId: sub, email, role: realm_access.roles[0] }` to `req.user`. On failure: throw `UnauthorizedException`, increment `auth_failure_total{reason}` counter.
- `apps/api/src/auth/tenant.guard.ts` — `TenantGuard implements CanActivate`. Depends on `req.user` set by `AuthGuard`. Looks up `Therapist` (then `Client` if first miss) by `externalAuthId`. 403 if no row. Calls `tenantContext.enterWith({ clinicId, dbUserId, role })` so the Prisma extension and downstream code see it.
- `apps/api/src/auth/current-user.decorator.ts` — `@CurrentUser()` param decorator returning `req.user` (typed).
- `apps/api/src/auth/metrics.ts` — `prom-client` Counter `auth_failure_total{reason}`. Singleton registry export (no `/metrics` HTTP endpoint yet — chunk 09).
- `apps/api/src/main.ts` — `NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true })`; `app.use('/auth/{*splat}', toNodeHandler(app.get(AUTH_TOKEN)))`; then `app.use(express.json())` + `app.use(express.urlencoded({ extended: true }))`.
- `apps/api/src/app.module.ts` — register `AuthModule`.

**Deferred to here from Phase 1:**

- `packages/db/prisma/seed.ts` — create 1 Clinic + 1 Therapist (call `auth.api.signUpEmail({ body: { email, password, name } })` then create Therapist row with `externalAuthId = user.id` + role `OWNER`). Wrap in `runWithSystemContext()` since no tenant context exists during seed.

**Install dependencies (run once):**

```
pnpm --filter @vitapeak/api add prom-client jose
```

**Acceptance for this phase:**

- `pnpm --filter @vitapeak/api typecheck` passes.
- `pnpm --filter @vitapeak/api dev` boots without errors, `GET /health` still returns OK.
- `curl -X POST http://localhost:3001/auth/sign-up/email -H 'Content-Type: application/json' -d '{"email":"t@example.com","password":"password123","name":"Test Therapist"}'` returns 200 with a session token.

### ✅ Phase 6 — Domain modules (clinics, invites, me) (commit `5b68f31`)

- `apps/api/src/modules/clinics/` — `POST /api/clinics/signup` creates Clinic + OWNER Therapist for an authenticated user (no tenant context yet → wrapped in `runWithSystemContext`).
- `apps/api/src/modules/invites/` — `POST /api/invites/create` (therapist only) generates a 32-byte token, persists SHA-256 hash, sends invite mail; when `MAIL_FALLBACK_RETURN_LINK=true` the raw URL comes back in the response body. `POST /api/invites/accept` (public) validates the hashed token + expiry, signs up the invitee via Better-Auth, creates a Client row, marks invite accepted. Re-accepting returns 410.
- `apps/api/src/modules/me/` — `GET /api/me` returns `{ user, clinic, role }` from req.tenant + JWT claims.
- `apps/api/src/auth/tenant-context.interceptor.ts` — wraps the downstream handler chain in `runWithTenantContext` so the Prisma tenancy extension sees ALS context across the rxjs/interceptor boundary. `TenantGuard.enterWith` removed; the guard now only attaches `req.tenant` and the interceptor opens the ALS frame for the handler.
- `.env.example` (+ `.env`) gained `MAIL_FALLBACK_RETURN_LINK=true` and `WEB_BASE_URL=http://localhost:3000` so invite URLs land on the web app.
- Smoke verified: end-to-end therapist signup → clinic signup → invite create (returns inviteUrl) → invite accept → client `/api/me` returns role=client + correct clinic.

`POST /api/clinics/signup`, `POST /api/invites/create`, `POST /api/invites/accept`, `GET /api/me`. See plan file for details. Invite token: 32-byte random → SHA-256 hashed in DB → raw in URL. `MAIL_FALLBACK_RETURN_LINK=true` → response includes `inviteUrl`.

### ✅ Phase 7 — Contracts + ts-rest/nest binding (commit `bc9b4ce`)

- `packages/contracts/src/{auth,clinics,invites}.ts` — zod 4 schemas + per-route exports via `c.query` / `c.mutation` (needed because `c.router({route: {...}})` widens to `{[x: string]: any}` and breaks `T extends AppRoute` narrowing in `tsRestHandler`).
- `packages/contracts/src/index.ts` re-exports each route + sub-contract + the combined `contract` router.
- Controllers refactored to `@TsRestHandler(route)` + `tsRestHandler(route, async ({ body }) => ...)`. Guards / `@CurrentUser` / `@TenantPrincipal` / `@Audit` still composed on the same method.
- `@vitapeak/api` gains `@ts-rest/nest` + `@ts-rest/core`.
- Root `package.json` overrides `zod: ^4.0.0` to match better-auth's bundled zod (avoids two zod copies causing structural type mismatches with ts-rest 3.52).
- Smoke verified: `POST /api/clinics/signup` with missing `name` returns 400 with a ZodError body (validation goes through ts-rest); happy path still returns 201.

### ⬜ Phase 7b — Reserved.

`packages/contracts/src/{auth,clinics,invites}.ts`. Install `@ts-rest/nest`. Bind to controllers.

### ✅ Phase 8 — Web (Next.js) (commit `bf54226`)

- `apps/web/middleware.ts` — gates non-public paths on the `better-auth.session_token` cookie; bounces to `/login?next=<path>` when absent.
- `apps/web/next.config.mjs` — rewrites `/auth/*` and `/api/*` to the API origin (same-origin so Better-Auth cookies land on the web host) + `transpilePackages` includes `@vitapeak/i18n` and `@vitapeak/contracts` + `createNextIntlPlugin('./i18n/request.ts')` wrapper.
- `apps/web/i18n/request.ts` — next-intl server config reading the `NEXT_LOCALE` cookie (cookie-only, no URL prefix per the plan) and loading messages from `@vitapeak/i18n/locales/<locale>.json`. Defaults to `da`.
- `apps/web/app/layout.tsx` — wraps the tree in `NextIntlClientProvider` using `getLocale()` + `getMessages()`.
- `apps/web/src/lib/auth-client.ts` — `createAuthClient({ baseURL: window.origin, basePath: '/auth' })`. Typed as `any` to dodge a Better-Auth `Type 'X' cannot be named without a reference to ...` portability error from deep transitive types.
- `apps/web/src/lib/api-client.ts` — `apiFetch` + `getJwt()` helpers using same-origin `/auth/token`.
- Routes: `(auth)/login` (Better-Auth email/password sign-in + sign-up toggle), `(app)/layout.tsx` (server-side cookie guard), `(app)/onboarding/clinic`, `(app)/clients/invite` (shows the copy-link affordance when the API returns `inviteUrl`), public `invite/[token]` for invitees.
- All UI strings flow through `useTranslations` against the existing `@vitapeak/i18n` keyset (`auth.login.*`, `clinic.onboarding.*`, `invite.send.*`, `invite.accept.*`, `error.*`).

`apps/web/middleware.ts` (next-intl cookie + Better-Auth session), `(auth)/login`, `(app)/onboarding/clinic`, `(app)/clients/invite`, public `invite/[token]`. All UI strings via `next-intl` reading from `@vitapeak/i18n`. Install: `next-intl`, `better-auth`, `@vitapeak/i18n`.

### ✅ Phase 9 — Mobile (Expo) (commit `8d421f9`)

- `apps/mobile/src/i18n/index.ts` — `i18next` + `react-i18next`, device locale via `expo-localization`, resources imported as `da` / `en` re-exports from `@vitapeak/i18n` (mobile's tsconfig uses `moduleResolution: node` which ignores the `exports` field — re-exporting the JSON through the package's main entry sidesteps that).
- `packages/i18n/src/index.ts` now re-exports `da` / `en` / `messages` from the JSON files (using `import ... with { type: 'json' }` since the package builds under NodeNext).
- `apps/mobile/src/auth/use-auth.ts` — session + JWT stored in `expo-secure-store`, refresh on demand via `/auth/token`; derives role from the JWT's `realm_access.roles[0]`.
- `apps/mobile/src/api/client.ts` — `ofetch` wrapper with bearer header + 401-triggered JWT refresh using the persisted session token.
- `apps/mobile/app/_layout.tsx` — role-aware redirect: no session → `/(auth)/login`; therapist → `/(therapist)`; client → `/(client)`; authenticated-with-no-role bounces back to login.
- `apps/mobile/app/(auth)/login.tsx`, `(therapist)/index.tsx`, `(client)/index.tsx` — minimal screens wired to translations.
- Mobile `tsconfig.json` enables `resolveJsonModule` + `esModuleInterop`.

`src/auth/use-auth.ts` + `src/api/client.ts` (ofetch + bearer + 401 refresh) + `src/i18n/index.ts` (i18next + expo-localization). Routes: `(auth)/login`, `(client)/index`, `(therapist)/index`. `_layout.tsx` does role-aware redirect. Install: `expo-secure-store`, `expo-localization`, `i18next`, `react-i18next`, `ofetch`, `@vitapeak/i18n`.

### ✅ Phase 10 — API e2e tests (commit `aec09eb`)

- vitest 4 + `@nestjs/testing@10` + supertest installed in `apps/api`.
- `apps/api/test/unit/tenancy.extension.spec.ts` — confirms missing tenant context throws, `runWithSystemContext` allows reads, and tenant context injects the clinic filter.
- `apps/api/test/e2e/auth.e2e-spec.ts` — boots the full `AppModule`, mounts the Better-Auth handler the same way `main.ts` does, then walks the happy path: therapist signup → JWT exchange → clinic signup → invite create (asserts `inviteUrl` present when `MAIL_FALLBACK_RETURN_LINK=true`) → invite accept (201) + double-accept (410) → second therapist signup/clinic + `/api/me` returning the _new_ clinic id (cross-tenant guard active). One additional case corrupts the JWT signature and asserts `auth_failure_total{reason="invalid_signature"}` increments.
- `AuthGuard` migrated from `createRemoteJWKSet` to `createLocalJWKSet` fed by `auth.api.getJwks()` — the remote variant required a real bound port; the in-process variant works in both dev and supertest.
- `vitest.config.ts` uses `pool: 'forks'` + `maxWorkers/minWorkers: 1` (sequential, so DB writes do not race against each other).

`apps/api/test/e2e/auth.e2e-spec.ts` — happy path, invite create/accept, cross-tenant 403, belt-and-braces extension throw, metric increment, Prisma extension missing-context throw. Need to install `@nestjs/testing`, `supertest` (likely not present).

### 🟡 Phase 11 — Acceptance + PR (NEXT)

Run all chunk acceptance criteria. Update `docs/chunks/01-auth-and-tenancy.md` Status line. `git push origin claude/chunk-01-auth-and-tenancy && gh pr create`.

---

## Next concrete step

**Start Phase 6 — Domain modules (clinics / invites / me).**

1. Create `apps/api/src/modules/clinics/` — controller + service. `POST /api/clinics/signup` (AuthGuard only, no TenantGuard). Body `{ name, firstName, lastName }`. Under `runWithSystemContext()` create `Clinic` then `Therapist` (role OWNER) linking `req.user.externalAuthId`. Return `{ clinicId, therapistId }`.
2. Create `apps/api/src/modules/invites/` — controller + service:
   - `POST /api/invites/create` (AuthGuard + TenantGuard, therapist-only): generate 32-byte token via `crypto.randomBytes(32)`, hash with `crypto.createHash('sha256')`, persist `Invite` row with `tokenHash`, `expiresAt = now + 7d`, `invitedRole: 'CLIENT'`, `invitedByTherapistId = req.tenant.dbUserId`. Call `mailService.sendInvite({...})` with the raw URL `${BETTER_AUTH_URL}/invite/${rawToken}`. When `process.env.MAIL_FALLBACK_RETURN_LINK === 'true'`, include `inviteUrl` in the response body.
   - `POST /api/invites/accept` (public): body `{ token, email, password, firstName, lastName }`. Hash token, look up Invite where `tokenHash === hash AND acceptedAt IS NULL AND expiresAt > now`. If not found OR expired → 404. If `acceptedAt` already set → 410 Gone. Otherwise call `auth.api.signUpEmail` for the new user, create `Client` row (under `runWithSystemContext`) with `externalAuthId = user.id`, `clinicId = invite.clinicId`, `therapistId = invite.invitedByTherapistId`, mark invite `acceptedAt = now`. Return `{ token: signupToken, clientId }`.
3. Create `apps/api/src/modules/me/` — `GET /api/me` (AuthGuard + TenantGuard). Return `{ user: { id: dbUserId, externalAuthId, email, role }, clinic: { id, name }, role }`.
4. Add `MAIL_FALLBACK_RETURN_LINK=true` to `.env.example` (and `.env`).
5. Wire `ClinicsModule`, `InvitesModule`, `MeModule` into `AppModule`.
6. Commit: `feat(api): clinics + invites + me endpoints` (include progress update).
7. Update this progress file: Phase 6 → ✅ + SHA, Phase 7 → 🟡.

---

## How to update this file

After every commit:

1. Move the just-completed phase to ✅ with commit SHA.
2. Move the next phase to 🟡 (in progress) and list the first 1–3 sub-steps.
3. Update the **Next concrete step** section with one paragraph the resuming agent can execute immediately.
4. Update the `Last update` date at the top.
5. Commit the progress file change as part of the work commit (no separate `docs: update progress` commits — keep history clean).
