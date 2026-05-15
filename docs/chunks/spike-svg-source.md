# Spike — Body SVG source decision

Status: 🟡 in progress — ADR accepted; SVG files + regions.json + PoC screen committed; device tap test (iOS sim + Android emulator) pending — must run locally
Plan mode: **REQUIRED** — research + decision, no code at end.

## Goal

Pick the source of the front + back human-body SVG used by chunk 02. Output: one ADR in `docs/decisions/` recording the decision and licensing terms.

## Prerequisites

- Chunk 00 (scaffold) — needed for the Expo PoC step.
  Run before chunk 02.

## Context for fresh session

VitaPeak's body map needs front + back 2D human-body SVG with named, tappable regions (~40 in MVP). Source must:

- License-clean for commercial use.
- Anatomically labeled or at least region-segmented.
- Mobile-friendly file size (< 200KB combined preferred).

## Candidate sources

| Source                                         | License          | Notes                                                                |
| ---------------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| `human-body-svg` (GitHub)                      | MIT              | Basic outline, would need region overlay work                        |
| `react-body-highlighter`                       | MIT              | RN-ready, pre-segmented muscles, opinionated                         |
| BodyParts3D / Anatomography (DBCLS)            | CC-BY-SA 2.1 JP  | High quality anatomical SVG, share-alike attribution required        |
| Commission illustrator                         | Custom (paid)    | $200–800 typical, full control + clean rights                        |
| AI-generated placeholder (DALL-E / Midjourney) | Per provider ToS | Quick start, ethically muddy for clinical app, replace before launch |
| Buy stock (envato, freepik premium)            | Per license      | Often "no resale" — read carefully                                   |

## Decision drivers

1. **Licensing clarity** for clinical commercial app.
2. **Region granularity** — need ~40 named regions, hierarchical-friendly.
3. **Style consistency** with rest of UI.
4. **Effort** to add ID attributes per region.

## Output of this spike

1. ADR file `docs/decisions/0001-body-svg-source.md` documenting:
   - Choice + alternatives considered
   - License summary
   - Region-id naming convention
   - Path to source files in repo (e.g. `apps/mobile/assets/body/{front,back}.svg`)
2. Acceptance check: load chosen SVG in a throwaway Expo screen, tap a region, log its id.

## Acceptance criteria

- [x] ADR committed.
- [x] Source files committed under `apps/mobile/assets/body/`.
- [x] Each region path has a stable `id` attribute matching planned `BodyRegion.id` slug.
- [ ] Proof-of-concept tap test on iOS sim + Android emulator confirms tappability. **PENDING — must run locally; PoC screen is at `app/(poc)/body-tap-poc.tsx`.**
- [x] License obligations (attribution text, share-alike) noted in ADR + SOURCE.md.

## Suggested first prompt (after bootstrap)

```
Execute docs/chunks/spike-svg-source.md. Enter plan mode. Survey at least 3
candidate sources (one OSS, one commercial, one AI-assist). Output the ADR
content as the plan deliverable. No SVG editing yet — surface the decision.
```
