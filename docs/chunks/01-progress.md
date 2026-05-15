# Chunk 01 — In-Progress Tracker

Live progress log for `docs/chunks/01-auth-and-tenancy.md`. **Updated after every commit / milestone.** A fresh Claude session can pick up by reading this file + the chunk file + ADRs 0002, 0004, 0007.

- **Branch**: `claude/chunk-01-auth-and-tenancy`
- **Static plan**: `/home/agent/.claude/plans/sequential-wandering-sloth.md`
- **Last update**: 2026-05-15
- **Current phase**: 4 (next — Better-Auth wiring)

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

### 🟡 Phase 4 — Better-Auth wiring + guards + decorators (NEXT)

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

### ⬜ Phase 6 — Domain modules (clinics, invites, me)

`POST /api/clinics/signup`, `POST /api/invites/create`, `POST /api/invites/accept`, `GET /api/me`. See plan file for details. Invite token: 32-byte random → SHA-256 hashed in DB → raw in URL. `MAIL_FALLBACK_RETURN_LINK=true` → response includes `inviteUrl`.

### ⬜ Phase 7 — Contracts + ts-rest/nest binding

`packages/contracts/src/{auth,clinics,invites}.ts`. Install `@ts-rest/nest`. Bind to controllers.

### ⬜ Phase 8 — Web (Next.js)

`apps/web/middleware.ts` (next-intl cookie + Better-Auth session), `(auth)/login`, `(app)/onboarding/clinic`, `(app)/clients/invite`, public `invite/[token]`. All UI strings via `next-intl` reading from `@vitapeak/i18n`. Install: `next-intl`, `better-auth`, `@vitapeak/i18n`.

### ⬜ Phase 9 — Mobile (Expo)

`src/auth/use-auth.ts` + `src/api/client.ts` (ofetch + bearer + 401 refresh) + `src/i18n/index.ts` (i18next + expo-localization). Routes: `(auth)/login`, `(client)/index`, `(therapist)/index`. `_layout.tsx` does role-aware redirect. Install: `expo-secure-store`, `expo-localization`, `i18next`, `react-i18next`, `ofetch`, `@vitapeak/i18n`.

### ⬜ Phase 10 — API e2e tests

`apps/api/test/e2e/auth.e2e-spec.ts` — happy path, invite create/accept, cross-tenant 403, belt-and-braces extension throw, metric increment, Prisma extension missing-context throw. Need to install `@nestjs/testing`, `supertest` (likely not present).

### ⬜ Phase 11 — Acceptance + PR

Run all chunk acceptance criteria. Update `docs/chunks/01-auth-and-tenancy.md` Status line. `git push origin claude/chunk-01-auth-and-tenancy && gh pr create`.

---

## Next concrete step

**Start Phase 4 — Better-Auth wiring.**

1. Install runtime deps:
   ```
   pnpm --filter @vitapeak/api add prom-client jose
   ```
2. Write `apps/api/src/auth/metrics.ts` — `prom-client` Counter `auth_failure_total{reason}`. Singleton registry export.
3. Write `apps/api/src/auth/better-auth.config.ts` — factory `createAuth(prisma, mailService)`:
   - `prismaAdapter(prisma, { provider: 'postgresql' })`
   - `emailAndPassword: { enabled: true, autoSignIn: true }`
   - `secret: process.env.BETTER_AUTH_SECRET`, `baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'`
   - Plugins: `magicLink({ sendMagicLink: ({email,url}) => mailService.sendMagicLink({to:email,url}), expiresIn: 60*15 })`, `jwt({ jwt: { expirationTime: '1h', issuer: 'vitapeak-better-auth', definePayload: ... } })`, `bearer()`
   - JWT `definePayload`: look up Therapist or Client by `externalAuthId = user.id`, return `{ sub: user.id, email, email_verified, preferred_username: name, realm_access: { roles: [role] } }`.
4. Write `apps/api/src/auth/better-auth.module.ts` — `@Module` with provider:
   ```
   { provide: AUTH_TOKEN, inject: [PrismaService, MailService], useFactory: (p, m) => createAuth(p.client as unknown as PrismaClient, m) }
   ```
   Export `AUTH_TOKEN` symbol.
5. Write `apps/api/src/auth/auth.guard.ts` — verifies `Authorization: Bearer <jwt>` via Better-Auth's JWKS (use `jose.createRemoteJWKSet` against `/auth/jwks`, OR `jose.jwtVerify` with the key from `auth.api.getJwks()`). Attaches `{ externalAuthId, email, role }` to `req.user`. On failure: throw `UnauthorizedException` + increment `auth_failure_total`.
6. Write `apps/api/src/auth/tenant.guard.ts` — DB lookup `Therapist.findFirst({where:{externalAuthId}}) ?? Client.findFirst({where:{externalAuthId}})`. **Run under `runWithSystemContext()`** for the lookup itself (the extension would block a query on Therapist with no tenant context). 403 if no row. Then `tenantContext.enterWith({clinicId, dbUserId, role})`.
7. Write `apps/api/src/auth/current-user.decorator.ts` — `@CurrentUser()` returning `req.user`.
8. Modify `apps/api/src/main.ts`:
   ```
   const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
   const auth = app.get(AUTH_TOKEN);
   app.use('/auth/{*splat}', toNodeHandler(auth));  // Express 5 wildcard syntax
   const express = await import('express');
   app.use(express.json({ limit: '1mb' }));
   app.use(express.urlencoded({ extended: true }));
   ```
9. Register `BetterAuthModule` in `AppModule`.
10. Write `packages/db/prisma/seed.ts` — uses `createAuth(plainPrisma, consoleMailProvider)` to `auth.api.signUpEmail({body:{email:'demo@vitapeak.local', password:'demo-password-123', name:'Demo Therapist'}})`. Then create `Clinic` (under `runWithSystemContext`) and `Therapist` row with `externalAuthId = user.id`, role `OWNER`.
11. Test:
    ```
    pnpm --filter @vitapeak/api typecheck
    pnpm db:seed
    tmux new-session -d -s vitapeak-api 'cd apps/api && pnpm dev'
    sleep 5
    curl -X POST http://localhost:3001/auth/sign-up/email \
      -H 'Content-Type: application/json' \
      -d '{"email":"new-t@example.com","password":"password123","name":"New Therapist"}'
    # should return 200 with session token
    curl http://localhost:3001/health  # should still return ok
    tmux kill-session -t vitapeak-api
    ```
12. Commit: `feat(api): Better-Auth + AuthGuard + TenantGuard + seed`.
13. Update this progress file: Phase 4 → ✅, Phase 6 → 🟡, rewrite "Next concrete step".

---

## How to update this file

After every commit:

1. Move the just-completed phase to ✅ with commit SHA.
2. Move the next phase to 🟡 (in progress) and list the first 1–3 sub-steps.
3. Update the **Next concrete step** section with one paragraph the resuming agent can execute immediately.
4. Update the `Last update` date at the top.
5. Commit the progress file change as part of the work commit (no separate `docs: update progress` commits — keep history clean).
