# Session Bootstrap Prompt

Paste this as the **first message** in any new AI coding session for VitaPeak. Then in the second message tell the AI which chunk to execute.

---

## Bootstrap (paste verbatim)

```
You are working on VitaPeak, a multi-tenant physiotherapist ↔ client tracking platform.

Before doing anything, read these files in this exact order:
1. docs/PLAN.md            — full architecture and locked decisions
2. docs/chunks/README.md   — chunk system overview
3. docs/chunks/<the chunk I will name in my next message>

Rules:
- Respect every "Locked decision" in PLAN.md and in the chunk. Do not re-litigate stack choices.
- Before executing the chunk, read every ADR referenced in PLAN.md or in the chunk file (under docs/decisions/). Treat any ADR with `Status: Accepted` as a locked decision equal to PLAN.md locks — do not re-litigate.
- If a referenced ADR has `Status: Proposed`, surface it in plan mode and ask me to accept (or revise) it before relying on it. Never treat a `Proposed` ADR as locked.
- Stay strictly inside the chunk's "Scope (in)". Skip anything in "Scope (out)".
- Stop and ask if the chunk's prerequisites are not satisfied in the repo.
- Run `git status` and `git log -10 --oneline` first to understand current state.

Plan-mode policy (HARD RULE — read the `Plan mode:` field at the top of the chunk):
- `Plan mode: REQUIRED`  → invoke /plan IMMEDIATELY after reading the chunk, before any edit. Surface every open decision in the plan. Wait for my approval (ExitPlanMode) before coding.
- `Plan mode: OPTIONAL`  → if you encounter any ambiguity in scope, files, or design, enter plan mode and surface it. Otherwise proceed.
- `Plan mode: SKIP`      → proceed directly. No plan mode unless I explicitly ask.

Other rules:
- Commit at logical checkpoints with conventional commit messages (feat:, chore:, fix:, docs:).
- Do not run irreversible commands (force push, db drop, branch delete) without confirmation.
- Caveman tone optional; default to terse but technically precise responses.
- For non-obvious design choices not covered by PLAN.md, draft an ADR under docs/decisions/ using docs/decisions/_template.md and ask me to accept it before relying on it.

When you finish the chunk:
1. Run the acceptance criteria checks listed in the chunk.
2. Update the chunk file's top line to `Status: ✅ done — YYYY-MM-DD — <commit-sha>`.
3. Report which acceptance criteria passed and which (if any) did not.

If I do NOT name a chunk in my next message, do this:
1. Read docs/chunks/README.md "Chunk index" table.
2. Read the `Status:` top-line of each chunk file in dep-graph order.
3. Recommend the FIRST chunk whose status is `⬜ not started` AND whose prerequisites are all `✅ done`.
4. Ask me to confirm before executing it.

I will tell you the chunk name in my next message — or expect a recommendation.
```

---

## Then send (example second message)

```
Execute docs/chunks/00-scaffold.md
```

For a `Plan mode: REQUIRED` chunk, you don't need to say "enter plan mode" — the bootstrap above already forces it.

---

## Why this works

- The AI re-loads exactly the context it needs every session.
- No drift across sessions — locked decisions live in `PLAN.md` + ADRs, not chat memory.
- Each chunk's acceptance criteria gives a concrete "done" signal.
- Plan-mode policy is declarative per chunk — the AI auto-enters when the chunk demands it, instead of you remembering.
- Smaller context window per session → cheaper, faster, fewer hallucinations.
