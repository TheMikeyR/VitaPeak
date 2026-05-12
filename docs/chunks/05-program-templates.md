# Chunk 05 — Program templates + config resolution + module gating

Status: ⬜ not started
Plan mode: **REQUIRED** — deep-merge rules + gating guard pattern need ADR before code.

## Goal
Implement program templates (e.g. "Injury Recovery", "Strength Program") that bundle which modules are enabled and the check-in cadence. Resolve effective config per client (system → clinic → therapist → template → per-client override) and enforce module gating on backend + mobile.

## Prerequisites
- Chunk 01 (auth + tenancy)
- Chunk 02 (check-ins exist — needed to gate)
- Chunk 04 (plans exist — needed to gate)

## Context for fresh session
Modules (`painCheckIn`, `bodyMap`, `exercisePlan`, `calendar`, `journal`, `mood`, `sleep`, `videoDemos`, `chat`, `homeMetrics`) all hard-coded ON for now. This chunk introduces program templates so therapists can turn modules on/off per client, change check-in cadence, and define re-usable program archetypes.

## Locked decisions (see PLAN.md § "Program template + config resolution")
- Resolution chain: System → Clinic → Therapist → Template → Per-client override (deep-merge JSON).
- Stored as JSONB. Validated by shared Zod schema.
- Effective config exposed at `GET /me/program`.
- Backend enforces module gating in guards (403 if module disabled).
- Mobile reads effective config on login → conditionally renders tabs/routes.
- Seeded system templates: Injury Recovery, Strength Program, Post-Op, Chronic Pain.

## Scope (in)
- Prisma: `ProgramTemplate`, `ClientProgram`.
- Seed: 4 system templates with `is_system_seed = true`.
- Shared Zod schema `ProgramConfig` in `packages/validation`.
- Resolution service `apps/api/src/modules/programs/resolution.service.ts` — deep-merge layers.
- ts-rest contracts:
  - `GET /me/program` — returns effective config (called by mobile on login)
  - `GET /program-templates` (own clinic + system seeds)
  - `POST /program-templates` (clone or create new)
  - `PATCH /program-templates/:id`
  - `POST /clients/:id/program` — assign template + override
  - `PATCH /clients/:id/program` — update override
- NestJS `ModuleGuard` decorator: `@RequireModule('painCheckIn')` on controllers — rejects if disabled in client's effective config.
- Web (therapist):
  - `/programs` — list + manage templates.
  - `/programs/[id]/edit` — module toggles, check-in schedule editor.
  - `/clients/[id]` — "Program" section: assign template, override toggles.
- Mobile (client):
  - On login, fetch `/me/program` → store in context.
  - Tab bar conditionally renders based on enabled modules.
  - Check-in screen reads `checkIn.requiredFields` to render only required inputs.
  - Reminder local-notification schedule uses `checkIn.reminderTimes`.

## Scope (out)
- Push notifications for reminders (chunk 06 wires the actual delivery; this chunk only stores the schedule).
- Therapist mobile companion (chunk 08).
- Audit log of config changes (chunk 07 — but emit hook so chunk 07 can pick up easily).

## Files to create / modify
- `packages/db/prisma/schema.prisma` — `ProgramTemplate`, `ClientProgram`
- `packages/db/prisma/seed.ts` — extend with 4 templates
- `packages/db/data/program-templates.ts` — seed source
- `packages/validation/src/program-config.ts` — Zod schema for full config shape
- `packages/contracts/src/programs.ts`
- `apps/api/src/modules/programs/programs.controller.ts` + service
- `apps/api/src/modules/programs/resolution.service.ts`
- `apps/api/src/modules/programs/module.guard.ts` + `@RequireModule` decorator
- `apps/api/src/modules/check-ins/check-ins.controller.ts` — add `@RequireModule('painCheckIn')`
- `apps/api/src/modules/plans/plans.controller.ts` — add `@RequireModule('exercisePlan')`
- `apps/web/app/(app)/programs/page.tsx`
- `apps/web/app/(app)/programs/[id]/edit/page.tsx`
- `apps/web/app/(app)/clients/[id]/program/page.tsx`
- `apps/web/components/ProgramConfigEditor.tsx` — module toggles + schedule fields
- `apps/mobile/src/program/use-effective-program.ts` — React Query hook + context
- `apps/mobile/app/(client)/_layout.tsx` — gate tabs

## Implementation notes
- Deep-merge using `lodash.mergewith` (don't replace arrays — concat or take override, decide per field). Keep merge rules explicit in `resolution.service.ts`.
- Config Zod shape (matches PLAN.md):
  ```ts
  z.object({
    modules: z.object({
      painCheckIn: z.boolean(),
      bodyMap: z.boolean(),
      exercisePlan: z.boolean(),
      calendar: z.boolean(),
      journal: z.boolean(),
      mood: z.boolean(),
      sleep: z.boolean(),
      videoDemos: z.boolean(),
      chat: z.boolean(),
      homeMetrics: z.boolean(),
    }).partial(),
    checkIn: z.object({
      frequency: z.enum(['daily','weekly','onDemand','beforeWorkout','custom']),
      customCron: z.string().nullable().optional(),
      requiredFields: z.array(z.enum(['painLevel','bodyRegion','mood','notes'])),
      skipAllowed: z.boolean(),
      reminderTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
    }).partial(),
  }).partial()
  ```
- Default (system) full config: every module true, daily check-in 08:00.
- Cache: `GET /me/program` cacheable per-session (invalidate on assignment change).
- Mobile module gating: avoid mounting screens for disabled modules. Use Expo Router redirects.

## Acceptance criteria
- [ ] Seed creates 4 system templates visible to all clinics.
- [ ] Therapist clones "Injury Recovery" → edits → saves under own clinic.
- [ ] Therapist assigns template + flips off `journal` on per-client override → `/me/program` reflects.
- [ ] Mobile app for that client hides journal tab; hits to `POST /journal` (if existed) return 403.
- [ ] Backend: `POST /check-ins` returns 403 if client's effective config has `painCheckIn: false`.
- [ ] Resolution test: vitest case asserts override beats template beats clinic beats system.
- [ ] No regression on prior chunks.

## Suggested first prompt (after bootstrap)
```
Execute docs/chunks/05-program-templates.md. Start by writing the Zod config
schema + resolution unit tests before any controller code.
```
