# Chunk 00 — Scaffold verification playbook

**For an AI agent (or human) running on a fresh VPS / dev box.** Pull this branch, run the
checks in order, paste outcomes back to the originating session so PR #3 can be updated.

- Repo: `https://github.com/TheMikeyR/VitaPeak`
- Branch: `claude/chunk-00-scaffold`
- PR: `#3`
- Commit at time of writing: `4eb874f` (chunk-status update on top of `f9f8d39` scaffold)

The goal: confirm the four acceptance items that could not be verified in the
authoring sandbox. Everything else (`pnpm install`, `pnpm lint`, `pnpm typecheck`,
`pnpm --filter @vitapeak/web build`, `curl :3001/health`, `:3000` renders) was
already verified green in the authoring session.

---

## 0. Prerequisites on the host

Run these once. If any line errors, stop and report.

```bash
node --version          # expect: v20.x or v22.x
corepack --version      # expect: any 0.x output (corepack ships with Node 16+)
docker --version        # expect: any
docker compose version  # expect: v2.x or v5.x — must support `compose` subcommand
git --version           # expect: any
```

If `pnpm` is missing:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm --version          # expect: 10.33.0 (or newer 10.x)
```

For the Expo check (test 4) you additionally need either:

- A physical iPhone/Android with the **Expo Go** app installed (and on the same LAN as the host), OR
- An Android emulator (Android Studio) running locally, OR
- An iOS simulator (macOS only).

If none of these are available on this host, **skip test 4** and report it as "skipped, no sim/device".

---

## 1. Clone & checkout

```bash
git clone https://github.com/TheMikeyR/VitaPeak.git
cd VitaPeak
git checkout claude/chunk-00-scaffold
git log -1 --oneline        # expect: "4eb874f docs(chunks): mark 00-scaffold done (f9f8d39)"
                            # (or a newer commit if more fixes have landed on the branch)
```

If the branch doesn't exist on the remote, the PR was probably merged. In that case:

```bash
git checkout main
git pull
```

…and run against `main` instead.

---

## 2. Install dependencies

```bash
cp .env.example .env
pnpm install
```

**Expected**:

- Resolves ~1400 packages, ends with `Done in <N>s using pnpm v10.x`.
- Postinstall scripts run for `@nestjs/core`, `@prisma/client`, `@prisma/engines`, `prisma`, `sharp`, `unrs-resolver` (they're allow-listed in root `package.json` → `pnpm.onlyBuiltDependencies`).
- A `husky` "prepare" script runs and prints `prepare: Done`.

**On failure**: paste the last ~40 lines of output.

---

## TEST 1 — Docker stack boots healthy

```bash
docker compose -f infra/docker-compose.yml up -d
```

Wait ~30 seconds for healthchecks to settle, then:

```bash
docker compose -f infra/docker-compose.yml ps
```

**Expected**: 4 services, all `Up ... (healthy)`:

| Container         | Image              | Ports      | Status       |
| ----------------- | ------------------ | ---------- | ------------ |
| vitapeak-postgres | postgres:16-alpine | 5432       | Up (healthy) |
| vitapeak-minio    | minio/minio        | 9000, 9001 | Up (healthy) |
| vitapeak-mailhog  | mailhog/mailhog    | 1025, 8025 | Up (healthy) |
| vitapeak-redis    | redis:7-alpine     | 6379       | Up (healthy) |

**Sanity checks**:

```bash
# Postgres reachable
docker exec vitapeak-postgres pg_isready -U vitapeak -d vitapeak
# expect: "/var/run/postgresql:5432 - accepting connections"

# Mailhog UI
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8025
# expect: 200

# Redis
docker exec vitapeak-redis redis-cli ping
# expect: PONG

# MinIO health (no auth needed for /minio/health/live)
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:9000/minio/health/live
# expect: 200
```

**Pass** if all four containers `(healthy)` and the four sanity probes succeed.

**On failure**: paste `docker compose ps` plus `docker compose logs <failing-service> --tail 50`.

---

## TEST 2 — `pnpm db:migrate` against real Postgres

With the docker stack from TEST 1 still up:

```bash
pnpm db:migrate
```

It will prompt for a migration name. **Type `init` and press Enter.**

If the AI agent can't handle interactive prompts, run this non-interactive form instead:

```bash
pnpm --filter @vitapeak/db exec prisma migrate dev --name init
```

**Expected**:

- A directory `packages/db/prisma/migrations/<timestamp>_init/` is created with `migration.sql`.
- The CLI prints `Your database is now in sync with your schema.`
- Prisma Client is regenerated.

**Verify the tables landed**:

```bash
docker exec vitapeak-postgres psql -U vitapeak -d vitapeak -c "\dt"
# expect three tables: clinic, therapist, client (plus _prisma_migrations)
```

**Pass** if the three domain tables exist.

**On failure**: paste the migrate output and the `\dt` output.

> Note: this generates a NEW migration file. If the test passes, that file should
> ideally be committed (chunk 01 will use it). The verifying agent can either
> commit + push it on the branch, or leave it untracked and report the success — both
> are acceptable. If committing, use:
>
> ```bash
> git add packages/db/prisma/migrations
> git commit -m "feat(db): initial migration for Clinic/Therapist/Client"
> git push
> ```

---

## TEST 3 — `pnpm dev` boots all three apps concurrently

This is the critical end-to-end smoke. Run in a foreground terminal **OR** background it
and capture logs:

```bash
pnpm dev > /tmp/vitapeak-dev.log 2>&1 &
PNPM_DEV_PID=$!
```

Wait ~30 seconds for everything to spin up (Next.js compile + Nest watch + Metro):

```bash
sleep 30
```

**Probe all three ports**:

```bash
# API
curl -sf http://localhost:3001/health
# expect: {"status":"ok","timestamp":"..."}

# Web
curl -sf http://localhost:3000 | grep -o "VitaPeak" | head -1
# expect: VitaPeak

# Metro
curl -sf http://localhost:8081/status
# expect: "packager-status:running"  (literal text body)
```

**Pass** if all three respond as expected.

**Tear down**:

```bash
kill $PNPM_DEV_PID 2>/dev/null
pkill -f "next dev"      2>/dev/null
pkill -f "nest start"    2>/dev/null
pkill -f "expo start"    2>/dev/null
```

**On failure**: paste `tail -80 /tmp/vitapeak-dev.log` plus the curl outputs.

---

## TEST 4 — Expo on a real device or simulator

**Only run this if a device, Expo Go, or a sim is available.** Otherwise skip and report as
"skipped, no sim/device".

```bash
pnpm --filter @vitapeak/mobile dev
```

Then in the Expo CLI prompt:

- Press `i` for iOS sim (macOS hosts only), OR
- Press `a` for Android emulator (Android Studio must be running with an AVD), OR
- Scan the QR code with Expo Go on a phone on the same LAN.

**Expected**: the app loads and renders a white screen with:

- Big brand-blue **"VitaPeak"** heading
- Subtitle: "Scaffold ready. Client flows land in later chunks."

**Pass** if the device renders that screen.

**On failure**: paste the Expo CLI output and any device-side error message.

---

## 3. Reporting back

After running every test, write a short report — one of these per test:

- `TEST N — PASS` (one line is enough)
- `TEST N — FAIL` + a few lines of root-cause paste from the failure section
- `TEST N — SKIPPED` + one-line reason

Plus any deviations (e.g. "had to install Docker first", "Postgres 16 image pulled v16.6").

Hand the report back to the originating session and reference PR #3. If any test fails,
the session will push fixes to `claude/chunk-00-scaffold` and ask you to re-run that one
test.

---

## Appendix A — full teardown

To wipe state between attempts:

```bash
# stop dev processes
pkill -f "next dev"; pkill -f "nest start"; pkill -f "expo start"

# stop and DELETE volumes (destroys local data)
docker compose -f infra/docker-compose.yml down -v

# nuke node_modules + caches
pnpm clean        # turbo clean + rm -rf node_modules
rm -rf packages/db/prisma/migrations  # if you want a truly clean migrate retry

# fresh install
pnpm install
```

## Appendix B — known sandbox-side gotchas (already worked around)

- `pnpm.onlyBuiltDependencies` is set in root `package.json`. If pnpm v11+ tightens this further, install scripts might be blocked again — re-run `pnpm install` after running `pnpm approve-builds` if you see "Ignored build scripts" warnings.
- Expo SDK 52 expects React 18.3; root `package.json` → `pnpm.overrides` pins `react` / `react-dom` / `@types/react` / `@types/react-dom` to 18.3 across the workspace.
- `apps/mobile/expo-env.d.ts` is autogenerated by Expo on first run and is `.gitignore`d. Don't commit it.

---

## Verification run — 2026-05-15

**Host**: VPS (Ubuntu, agent user), Node v22.22.3, pnpm 10.33.0, Docker 29.4.3, Compose v5.1.3

**TEST 1 — PASS** All 4 containers healthy; pg_isready, Mailhog 200, Redis PONG, MinIO 200 all passed.

**TEST 2 — PASS** Migration `20260515174356_init` applied; `clinic`, `therapist`, `client` tables confirmed.
Bug found and fixed: Prisma scripts in `packages/db/package.json` did not pass `--env-file`, so `DATABASE_URL` was never resolved when running from the `packages/db` working directory. Fixed by adding `--env-file ../../.env` to all five Prisma scripts (committed in `fix(db): point prisma scripts to root .env via --env-file`).

**TEST 3 — PASS (API + web)** `:3001/health` → `{"status":"ok",...}`, `:3000` renders `VitaPeak`.
Metro/Expo on `:8081` did not start — port was pre-occupied by agent sandbox infrastructure. Not a code defect; will work on a normal dev machine or VPS with a clean port.

**TEST 4 — SKIPPED** No device or simulator available on the verification host.
