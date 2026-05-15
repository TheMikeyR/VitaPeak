# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state

Chunk 00 (scaffold) landed. Turborepo + pnpm workspace with `apps/{api,web,mobile}` and `packages/{config,contracts,db,types,validation}`; `infra/docker-compose.yml` for local `postgres`, `minio`, `mailhog`, `redis`. Auth, body map, and all feature work happen through subsequent chunks under `docs/chunks/`.

## Workflow — chunk-driven sessions

Implementation is sliced into self-contained work packages under `docs/chunks/`. Each chunk is sized so a fresh AI session can execute it from cold context.

**Entry point for any session**: `docs/SESSION_BOOTSTRAP.md`. The bootstrap prompt forces the AI to:

1. Read `docs/PLAN.md` (locked architectural decisions — do not re-litigate).
2. Read `docs/chunks/README.md` (chunk index + dep graph).
3. Read the chunk being executed.
4. Auto-enter `/plan` mode when the chunk's `Plan mode:` field says `REQUIRED`.

**Where to start on a fresh clone**: `docs/chunks/00-scaffold.md`, then `docs/chunks/spike-svg-source.md`, then follow the dep graph in `docs/chunks/README.md`.

**Plan-mode policy** is declared per chunk (`REQUIRED` / `OPTIONAL` / `SKIP`) at the top of each chunk file. The bootstrap enforces it — Claude does not need to be told manually.

## Authoritative documents

| Document                    | Purpose                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `docs/PLAN.md`              | Full architecture, stack, data model, compliance, deployment. Locked decisions live here. |
| `docs/SESSION_BOOTSTRAP.md` | Paste verbatim at start of every new AI session.                                          |
| `docs/chunks/README.md`     | Chunk index, dependency graph, plan-mode table.                                           |
| `docs/chunks/*.md`          | Individual work packages — Goal, Scope (in/out), Files, Acceptance criteria.              |
| `docs/decisions/`           | ADRs (numbered, immutable). Add new ADR for non-obvious choices not covered by PLAN.md.   |

## Architecture (planned, not yet built)

Target shape per `docs/PLAN.md`:

- **Monorepo**: Turborepo + pnpm. `apps/{api,web,mobile}` + `packages/{db,contracts,types,validation,config,ui}` + `infra/`.
- **Backend**: NestJS + ts-rest + Prisma + Postgres 16. ts-rest contracts are the source of truth for API shape and are shared with web + mobile.
- **Web**: Next.js App Router (therapist primary). Better-Auth React client for session management.
- **Mobile**: Expo (single app, role-aware after login). Client gets full feature set; therapist gets companion features only.
- **Auth**: Better-Auth in-process inside NestJS API (ADR 0002 — Keycloak rejected for MVP). JWT shape is Keycloak-compatible (`sub`, `email`, `realm_access.roles`) so guards need no change when Keycloak is adopted later. Roles: `therapist`, `client`.
- **Multi-tenant from day one**: every domain row carries `clinicId`. Tenant isolation enforced in NestJS guards.
- **Program templates**: configuration JSON resolves through chain (system → clinic → therapist → template → per-client override) → effective config gates which modules render on mobile and which writes the backend accepts.
- **Local infra**: Docker Compose for `postgres`, `minio`, `mailhog`, `redis`. No Keycloak container (ADR 0002).
- **Deploy**: personal VPS via Docker Compose + Caddy auto-HTTPS. Portable to cloud later (12-factor, stateless containers, env-config).

## Hard rules for Claude in this repo

- **Locked vs open decisions**:
  - **Locked** = anything in PLAN.md "Stack" table, any "Locked decisions" block in a chunk, any ADR with `Status: Accepted`. Do NOT propose alternatives. Push back only if the locked choice makes the chunk's stated scope logically impossible.
  - **Open** = anything NOT locked: UX flows, taxonomy, merge rules, query shapes, file layouts inside `Scope (in)`, ambiguous acceptance details, AND any ADR still marked `Status: Proposed`. In plan-mode chunks (`REQUIRED`), these MUST be surfaced and confirmed before code. Plan mode exists specifically to resolve open decisions — it is not a debate forum for locked ones.
- **Always read referenced ADRs.** Before executing a chunk, read every ADR linked from PLAN.md or the chunk file (under `docs/decisions/`). An ADR's `Status:` line tells you how to treat it: `Accepted` = locked, do not re-litigate; `Proposed` = open, surface in plan mode and ask for acceptance (or revision) before relying on it; `Rejected` / `Superseded` = ignore the content, follow the link to the successor.
- **Stay inside the chunk's Scope (in).** Skip everything in Scope (out).
- **Respect prerequisites.** If a chunk's prereqs are not done (`Status:` line on prereq chunks not `✅ done`), stop and ask.
- **For non-obvious design choices** not covered by PLAN.md, draft an ADR under `docs/decisions/` using `docs/decisions/_template.md` with `Status: Proposed` and wait for acceptance before relying on it. Once accepted, never edit — supersede via a new ADR that links back.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.) — observed pattern in git log.
- **Line endings**: LF in repo (enforced by `.gitattributes`). Do not change.
- **`.npmrc` — do not remove `shamefully-hoist=true`**. Expo's Metro bundler requires hoisted `node_modules` to resolve transitive dependencies across the pnpm virtual store. Removing it breaks `expo start --web`.

## Commands

Landed in chunk 00:

- `pnpm install` — bootstrap workspace
- `pnpm dev` — runs API (`:3001`) + web (`:3000`) + Expo Metro (`:8081`) concurrently via Turborepo
- `pnpm build` — build all packages and apps
- `pnpm lint` — eslint across workspace
- `pnpm typecheck` — `tsc --noEmit` across workspace
- `pnpm db:generate` — prisma generate
- `pnpm db:migrate` — prisma migrate dev (requires Postgres up)
- `pnpm db:studio` — open Prisma Studio
- `pnpm format` / `pnpm format:check` — prettier
- `docker compose -f infra/docker-compose.yml up -d` — bring up `postgres`, `minio`, `mailhog`, `redis`

**Expo web on dev.rontved.com** (for browser-based PoC testing):

```bash
tmux new-session -d -s vitapeak-expo-web \
  "cd apps/mobile && npx expo start --web --port 3000"
```

- nginx at `dev.rontved.com` proxies `localhost:3000` — Expo web must use `--port 3000`.
- Navigate to `https://dev.rontved.com` (root) first, then use in-app links to reach sub-routes. Direct URL entry to sub-routes (e.g. `/body-tap-poc`) renders a blank page due to Expo Router's SPA routing on web.
- Stop server: `tmux kill-session -t vitapeak-expo-web`

Lands in later chunks (do not invent):

- `pnpm db:seed` (chunk 01)
- `pnpm test`, `pnpm test:e2e:api`, `pnpm test:e2e` (web), `maestro test apps/mobile/.maestro/<flow>.yaml` (chunks 02–09)

Read the relevant chunk's "Implementation notes" for any new canonical commands as they are introduced.
