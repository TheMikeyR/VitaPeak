# Chunk 07 — GDPR: audit log, consent records, data export, hard delete

Status: ⬜ not started
Plan mode: **REQUIRED** — audit filter list + hard-delete cascade order must be reviewed before code.

## Goal
Persist audit log of every mutation, capture consent records on signup and policy bumps, expose data export + account deletion endpoints, and run a delayed hard-delete worker.

## Prerequisites
- Chunk 01 (auth + tenancy)
- Domain modules from chunks 02/04/05 so audit covers real entities
- Chunk 06 useful (queue for delayed hard delete)

## Context for fresh session
PLAN.md compliance level: "GDPR + audit + consent + export/delete". Prior chunks stubbed an audit interceptor that logs to console. This chunk turns it real, adds consent flow, and the export/delete user rights.

## Locked decisions
- Soft-delete + 30-day grace, then hard-delete by cron.
- Audit log retains entries after user hard-delete (anonymized: `actorId` set to `"deleted:<hash>"`).
- Consent versioned by SHA of policy document. Bump version → re-prompt user.
- Export format: ZIP containing `profile.json`, `check-ins.csv`, `pain-points.csv`, `plans.csv`, `consent.json`, `audit.csv`.
- Endpoints under `/me/...` for self-service; therapists can request clinic-wide exports via `/clinic/...`.

## Scope (in)
- Prisma: `AuditLog`, `ConsentRecord`, `DeletionRequest` (id, userId, requestedAt, hardDeleteAt, status).
- NestJS `AuditInterceptor` (global) — captures method, route, actor, target entity, diff (before/after for updates, full record for creates/deletes), IP, UA.
- ts-rest contracts:
  - `GET /me/consents` / `POST /me/consents` — list + grant/revoke
  - `GET /me/export` — returns signed URL to ZIP (generated async via queue, emailed when ready)
  - `DELETE /me` — opens 30-day deletion request
  - `POST /me/cancel-deletion` — within grace
  - Therapist endpoints: `GET /clinic/export`, `GET /clinic/audit?filter=...`
- Web: account settings page with consent toggles, "Download my data", "Delete account".
- Mobile: same in profile screen.
- Cron: nightly hard-delete worker — cascades user data, anonymizes audit.
- Policy version constants in `packages/config/policy.ts`. CI fails if version not bumped when policy doc changes (optional).

## Scope (out)
- Two-person approval for therapist data export (defer)
- Full DPA template document (lives outside code repo)
- BAA equivalents (out of scope — not HIPAA)
- Encryption key rotation tooling (defer)

## Files to create / modify
- `packages/db/prisma/schema.prisma` — `AuditLog`, `ConsentRecord`, `DeletionRequest`
- `packages/contracts/src/me.ts` — extend
- `packages/contracts/src/clinic-admin.ts` — exports + audit reads
- `apps/api/src/audit/audit.interceptor.ts` (replace stub)
- `apps/api/src/audit/audit.service.ts`
- `apps/api/src/modules/me/consents.controller.ts`
- `apps/api/src/modules/me/export.controller.ts` + queue worker
- `apps/api/src/modules/me/deletion.controller.ts`
- `apps/api/src/cron/hard-delete.cron.ts`
- `apps/api/src/lib/export-zip.ts` — assemble JSON+CSV ZIP
- `apps/web/app/(app)/account/page.tsx` — consent toggles + download + delete
- `apps/web/app/(app)/clinic/audit/page.tsx` — therapist clinic audit viewer
- `apps/mobile/app/(client)/account/index.tsx`
- `apps/api/test/e2e/gdpr.e2e-spec.ts`

## Implementation notes
- AuditInterceptor: only audit mutations (POST/PATCH/PUT/DELETE). Diff via `deep-diff` or hand-rolled patch. Avoid logging secrets (filter `password`, `token`, headers).
- Audit volume control: index `@@index([clinicId, createdAt(desc)])`, `@@index([entity, entityId])`. Partition or archive only if pain hits.
- Export ZIP generation: enqueue → worker assembles → uploads to MinIO → sends email with signed link (10 min expiry).
- Hard delete order: PainPoint → CheckIn → PlanItem → ClientProgram → Invite → Client → PushToken → ConsentRecord (kept, anonymized). Audit log entries: `actorId` rewritten to `deleted:<sha256(originalId+salt)>`.
- DeletionRequest cron: runs daily, processes requests with `hardDeleteAt <= now`.

## Acceptance criteria
- [ ] Every mutation creates an `AuditLog` row with diff.
- [ ] Signup blocks until consent accepted; row stored with policy version.
- [ ] Bumping `policy.ts` version → next login prompts re-consent.
- [ ] `GET /me/export` → returns 202; email arrives with signed download; ZIP contains expected files.
- [ ] `DELETE /me` → user data marked soft-deleted; user can still cancel within grace.
- [ ] After hard-delete cron: rows gone, audit entries anonymized, foreign keys consistent.
- [ ] Therapist cannot read another clinic's audit log.
- [ ] E2E gdpr suite passes.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/07-gdpr-audit-consent.md. Start by listing the audit
field filters (which keys to never log) and the cascade order for hard-delete
before writing code.
```
