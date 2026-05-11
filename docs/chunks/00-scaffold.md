# Chunk 00 — Repo scaffold & local Docker stack

Status: ⬜ not started
Plan mode: **SKIP** — mechanical scaffold, no design decisions.

## Goal
Stand up the Turborepo monorepo skeleton, Docker Compose local stack (Postgres, Keycloak, MinIO, Mailhog), Prisma schema, and a working `pnpm dev` that boots empty NestJS API + Next.js web + Expo app.

## Prerequisites
None. This is the first chunk.

## Context for fresh session
Empty git repo. Stack locked per `docs/PLAN.md`. Outcome of this chunk: contributor can clone the repo, run `docker compose up -d && pnpm install && pnpm dev`, hit a `/health` endpoint on the API, see Next.js homepage, and launch the Expo app on a simulator. No business logic yet.

## Locked decisions (see PLAN.md)
- Turborepo + pnpm
- NestJS + ts-rest + Prisma + Postgres 16
- Next.js App Router + Tailwind + shadcn/ui
- Expo (React Native) — Expo Router
- Keycloak in Docker for local dev
- MinIO + Mailhog locally

## Scope (in)
- `pnpm-workspace.yaml`, `turbo.json`, root `package.json`
- `infra/docker-compose.yml` for: `postgres`, `keycloak`, `minio`, `mailhog`, `redis`
- `packages/db` — Prisma schema (initial: `Clinic`, `Therapist`, `Client`, plus enums)
- `packages/contracts` — empty ts-rest router skeleton
- `packages/types`, `packages/validation`, `packages/config` (eslint + tsconfig presets)
- `apps/api` — NestJS bootstrap with `/health` endpoint
- `apps/web` — Next.js App Router, Tailwind, shadcn/ui init, blank homepage
- `apps/mobile` — Expo Router, blank index screen
- `.editorconfig`, `.gitignore`, `.env.example` files
- Pre-commit hook (lint-staged + prettier)

## Scope (out)
- Auth (chunk 01)
- Body map (chunk 02)
- Domain features
- CI/CD pipeline (chunk 09)
- Caddy reverse proxy (chunk 09)

## Files to create
See PLAN.md § "Critical files to create" for the full list. For THIS chunk, create only the scaffolding listed in "Scope (in)" above. Defer feature-specific files to later chunks.

## Implementation notes
- Use `pnpm` 9.x, Node 20 LTS.
- Postgres image: `postgres:16-alpine`. Volume mount for data.
- Keycloak image: `quay.io/keycloak/keycloak:25` in dev mode (`start-dev`). Pre-seed an empty `vitapeak` realm via `realm.json` import (can be empty for now; chunk 01 fills it).
- MinIO: standard image, default creds in `.env.example` only.
- Mailhog: `mailhog/mailhog`, port 8025 (UI), 1025 (SMTP).
- Redis: `redis:7-alpine`, port 6379. Included now so BullMQ is ready in chunk 06 without infra churn.
- Use `concurrently` or Turborepo pipeline for `pnpm dev`.
- shadcn/ui: install via CLI, configure Tailwind preset in `packages/config`.
- Expo: use Expo SDK 52+. App config TS-based (`app.config.ts`).
- Prisma client should be re-exported from `packages/db` so apps import via `@vitapeak/db`.

## Acceptance criteria
- [ ] `docker compose -f infra/docker-compose.yml up -d` brings up all five services healthy (postgres, keycloak, minio, mailhog, redis).
- [ ] `pnpm install` succeeds at repo root.
- [ ] `pnpm db:migrate` runs Prisma migrations on local Postgres.
- [ ] `pnpm dev` boots API on `:3001`, web on `:3000`, Expo Metro on `:8081`.
- [ ] `curl http://localhost:3001/health` returns `{ "status": "ok" }`.
- [ ] `http://localhost:3000` renders Next.js homepage.
- [ ] `npx expo start` opens Expo app in iOS sim (Mac) or Android emulator showing blank index.
- [ ] `pnpm lint` and `pnpm typecheck` pass across all packages.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/00-scaffold.md. Start by running `git status` and `ls`,
then propose the exact commands you will run to scaffold the monorepo. Wait
for my OK before running any command that creates files.
```
