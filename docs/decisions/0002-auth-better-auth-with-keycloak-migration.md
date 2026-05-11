# 0002 — Auth: Better-Auth for MVP, Keycloak migration path preserved

- **Status**: Proposed
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/01-auth-and-tenancy.md

## Context

PLAN.md originally locked Keycloak as the auth provider. Subsequent constraints surfaced:

- Target deployment is an **8 GB RAM VPS**. Keycloak (JVM, even tuned with `-Xmx768m`) consumes ~1 GB resident — ~12% of the budget for a service that, in MVP, provides only password auth + JWT issuance. No SSO, SAML, or federation requirement exists for the pilot.
- Solo developer. Keycloak ops surface (realm versioning, upgrade cycle, theme customization for invite emails, admin-CLI scripting) is non-trivial and competes with feature work.
- We still want a clean upgrade path to Keycloak once SSO/SAML/clinic-federation becomes a paid-feature requirement.

The auth library must support:
- OIDC-shaped tokens (so NestJS guards stay generic).
- Email + password, magic link, password reset.
- Mobile (Expo) bearer-token flow with refresh.
- Web (Next.js App Router) session cookies.
- Multi-session, MFA-ready, passkeys-ready (post-MVP toggles).
- TypeScript-native, no JVM, low RAM.

## Options considered

1. **Keycloak (original lock)** — Mature, OIDC-complete, SSO/SAML, future-proof. Cost: ~1 GB RAM, ops overhead, JVM upgrade cycles, Java realm.json drift risk. Overkill for solo MVP.
2. **Auth.js v5 (formerly NextAuth)** — Tight Next.js integration, mature, many providers. Cost: mobile (Expo) flow clunky — Auth.js is web-centric; we'd add a parallel JWT issuer for mobile bearer tokens. Splits the auth surface in two.
3. **Better-Auth** — TypeScript-native, framework-agnostic, runs inside NestJS or as standalone. Bearer-token + cookie-session flows first-class. Plugins for magic link, passkeys, MFA, multi-session, organization (multi-tenant). Active maintenance 2025–2026.
4. **Clerk / Supabase Auth / Auth0 (SaaS)** — Lowest ops cost, but $$$ at scale, vendor lock, data residency concerns for EU patient-adjacent data, special-category GDPR scrutiny.

## Decision

**We will use Better-Auth for MVP.** Auth runs inside the NestJS API process (no extra container, no extra RAM). Web and mobile both consume the same JWT-shaped tokens.

To preserve a clean Keycloak migration:

- The DB column is named **`externalAuthId`** (not `keycloakId`). Generic to whatever issuer is active.
- JWTs are issued with **Keycloak-compatible claim shape**: `sub`, `email`, `email_verified`, `preferred_username`, `realm_access.roles: ["therapist" | "client"]`.
- NestJS `AuthGuard` validates JWT via JWKS or shared HMAC. It reads claims; it does not depend on the issuer being Better-Auth.
- Tenancy resolution (`TenantGuard`) looks up `clinicId` from the **DB row** keyed by `externalAuthId`, not from the JWT claim. Same code works post-migration.
- A user-migration script (`scripts/migrate-auth-to-keycloak.ts`) exports Better-Auth users → Keycloak admin-API user-import JSON. Drafted at migration time, not now.

**Migration trigger criteria** (any one triggers a re-evaluation, not an automatic switch):

- First clinic contractually requires SSO (SAML/OIDC federation).
- Active user count exceeds 500.
- A second auth-related compliance audit (SOC 2 / HIPAA-equivalent) requests a hardened, audited IdP.
- Two or more enterprise features (LDAP sync, fine-grained admin console, theme customization for branded portals) are requested.

## Consequences

- **Positive**:
  - ~1 GB RAM saved on VPS (Keycloak removed entirely from compose).
  - Single-language stack (TS top to bottom). Faster iteration.
  - Mailhog handles invite emails through the same nodemailer path as the rest of the app — no Keycloak theme customization needed.
  - No JVM upgrade cycle.
- **Negative**:
  - Better-Auth is younger than Keycloak. Risk of breaking changes between releases; pin minor version.
  - SAML / federation is not native. If a pilot clinic asks for SSO before MVP ships, this decision must be revisited.
  - We own user-migration responsibility when Keycloak is adopted later.
- **Follow-up actions**:
  - Chunk 01 updated: replace `KeycloakGuard` with generic `AuthGuard`. Remove `infra/keycloak/realm-vitapeak.json`. Add Better-Auth setup module under `apps/api/src/auth/`.
  - PLAN.md stack table swaps "Keycloak" → "Better-Auth (Keycloak-compatible JWT shape, migration path documented in ADR 0002)".
  - PLAN.md data model: rename `keycloakId` → `externalAuthId` across `Therapist`, `Client`.
  - Sub-processors list: remove Keycloak entry while running Better-Auth in-process.

## References

- Better-Auth: https://www.better-auth.com/
- Auth.js v5: https://authjs.dev/
- Keycloak (future migration target): https://www.keycloak.org/
