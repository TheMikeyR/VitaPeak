# Chunk NN — In-Progress Tracker

Live progress log for `docs/chunks/NN-<slug>.md`. **Updated after every commit / phase boundary.** A fresh Claude session can pick up by reading this file + the chunk file + referenced ADRs.

- **Branch**: `claude/chunk-NN-<slug>`
- **Static plan** (if plan-mode chunk): `/home/agent/.claude/plans/<plan-file>.md`
- **Last update**: YYYY-MM-DD
- **Current phase**: N (`<short label>`)
- **Token-budget hint**: <small | medium | large> — rough size of the remaining phase. Use to decide whether to start it in the current session or end the session.

---

## Resumption instructions for a fresh session

```
Read in this order:
1. docs/PLAN.md  (skim the locked decisions table)
2. docs/chunks/NN-<slug>.md  (the chunk spec)
3. docs/chunks/NN-progress.md  (THIS FILE — what is done, what is next)
4. docs/decisions/<ADRs referenced in the chunk>

DO NOT re-enter plan mode if the plan is already approved at the static-plan
path listed above. Resume at the "Next concrete step" section below.
```

---

## Locked decisions resolved in plan mode

| Decision | Pick |
| -------- | ---- |
|          |      |

## Implementation deviations from chunk spec

- (Record any deviation from the chunk's stated approach — why + commit SHA.)

---

## Phase progress

> Phase list comes from the approved plan. Each phase has a status emoji, optional commit SHA, and a 1–3 line summary of what landed. **Do not delete a finished phase's summary** — future sessions need it to understand state.

### ⬜ / 🟡 / ✅ Phase 1 — <name> [(commit `<sha>`)]

- Bullet of what landed.
- Bullet of what landed.

### ⬜ Phase 2 — <name>

- (placeholder)

### ⬜ Phase N — Acceptance + PR

Run all chunk acceptance criteria. Update `docs/chunks/NN-<slug>.md` Status line. Push branch + open PR.

---

## Next concrete step

> One paragraph the resuming agent can execute immediately. Include file paths, commands, and the commit message to use.

**Start Phase X — <name>.**

1. …
2. …
3. Commit: `<type>(<scope>): <subject>` (include this progress file update).
4. Update this file: Phase X → ✅ + SHA; Phase X+1 → 🟡 with first 1–3 sub-steps.

---

## How to update this file

After every commit (or every phase boundary if commits are mid-phase):

1. Move the just-completed phase to ✅ with commit SHA + 1–3 line summary.
2. Move the next phase to 🟡 (in progress) and list the first 1–3 sub-steps.
3. Update the **Next concrete step** section with one paragraph the resuming agent can execute immediately.
4. Update the `Last update` date + `Current phase` + `Token-budget hint` at the top.
5. Commit the progress file change **as part of the work commit** (no separate `docs: update progress` commits — keep history clean).

## Token-budget discipline

This file exists because a single Claude session may exhaust its context budget mid-chunk. Treat each phase as a session-resumable unit:

- **Before starting a phase**: if the phase looks larger than the remaining budget (rough rule: <30% context left for a "medium" phase, <50% for "large"), stop and update this file first — do **not** start a phase you cannot finish + commit + log.
- **At every commit**: update this file in the same commit so resumption is atomic.
- **At session end / handoff**: leave the `Current phase` line, `Token-budget hint`, and **Next concrete step** section accurate enough that a cold session can resume without asking questions.
