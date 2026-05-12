# 0001 — Body SVG source: AI-assisted, owned in-repo

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: Mike Røntved
- **Context chunk**: docs/chunks/spike-svg-source.md

## Context

VitaPeak's pain check-in (chunk 02) needs front + back 2D human-body SVG
with ~40 named, tappable regions. Source must be license-clean for a
commercial clinical app, region-segmented at our chosen granularity,
and produced with minimal manual effort.

Candidates surveyed: `react-body-highlighter` (MIT, muscle-axis),
generic `human-body-svg` outlines (MIT, unsegmented), BodyParts3D /
Anatomography (CC-BY-SA 2.1 JP), custom illustrator commission,
AI-assisted generation.

## Decision

**AI-assisted body SVG, owned in-repo.** Workflow:

1. Generate a front + back human-body reference image with an AI image
   model (Midjourney / DALL-E / equivalent), styled as a flat,
   front-facing, gender-neutral silhouette.
2. Trace in Figma or Inkscape — export as optimized SVG with one `<path>`
   per region.
3. Hand-assign `id` attributes to each `<path>` matching `regions.json`
   slugs.
4. Commit to `apps/mobile/assets/body/{front,back}.svg` + `regions.json`.

Region-ID convention: `<area>.<subregion>[.<side>]`, lowercase,
dot-separated, side suffix only when laterality is meaningful.
Matches `BodyRegion.id` in PLAN.md data model.

## Alternatives considered

- **`react-body-highlighter`** — pre-segmented but on muscle axis, not
  pain region axis. Would force our taxonomy onto a muscle vocabulary.
  Rejected.
- **`human-body-svg` (MIT outlines)** — license clean but unsegmented;
  segmentation effort comparable to the AI route without giving us full
  style control. Rejected.
- **BodyParts3D / Anatomography (CC-BY-SA 2.1 JP)** — high quality but
  share-alike clause risks contaminating derived assets in a
  proprietary clinical app. Rejected.
- **Commissioned illustrator** — clean rights but $200–800 + 1–2 week
  lead time, blocks chunk 02. Deferred to future upgrade.

## License posture

- AI-generated reference: per current model ToS (Midjourney, OpenAI,
  Anthropic) outputs are usable commercially by the user who generated
  them. Document which model produced the source image alongside the
  commit (`apps/mobile/assets/body/SOURCE.md`).
- Traced SVG is a derivative work owned by VitaPeak.
- No CC-BY-SA assets enter the repo.
- Sub-processor implication: none — image generation is a one-time
  asset-creation step, not a runtime dependency.

## File layout

```
apps/mobile/assets/body/
  ├── front.svg
  ├── back.svg
  ├── regions.json   # seed for BodyRegion table
  └── SOURCE.md      # model + prompt used, for provenance
```

## Consequences

- Chunk 02 unblocked with no external dependency or cost.
- Region IDs owned by `regions.json`, decoupled from artwork — future
  upgrade (commission, redesign) is a file replace, not a code change.
- Art quality will be "functional, not beautiful" for MVP. Acceptable
  posture for pilot; surface for revisit before public launch.
- Provenance documented in `SOURCE.md` to make any future legal
  review straightforward.

## Open follow-ups

- Pre-public-launch: consider commissioning illustrator upgrade with
  same region IDs (file swap, no code change).
- Decide final art style — anatomical vs. friendly — at generation
  time, no architectural impact.
