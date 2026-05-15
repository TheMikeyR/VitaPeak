# Body SVG Provenance

## Decision

ADR `docs/decisions/0001-body-svg-source.md` — AI-assisted, owned in-repo.

## How the SVG was produced

`front.svg` and `back.svg` were authored directly as SVG source by an AI coding
assistant (Claude Sonnet 4.6, Anthropic) acting as the "tracing" step described in
ADR 0001. No external image generation tool (Midjourney, DALL-E) was used at this
stage because the MVP posture prioritises functional tappability over visual polish.
The shapes are geometric primitives (`rect`, `ellipse`, `path`) composing a
recognisable gender-neutral human outline.

## License

The SVG files are wholly created works owned by VitaPeak (no CC-BY-SA, no
third-party licensed assets). No share-alike obligations apply.

## Region IDs

Region slugs follow the `<area>.<subregion>[.<side>]` convention defined in
ADR 0001 and match the `BodyRegion.id` seed values in `regions.json`.

## Upgrade path

Replace `front.svg` and `back.svg` with commissioned or refined artwork at any
time. Region `id` attributes must be preserved — the UI code references these IDs
exclusively. Visual style is decoupled from functional structure.
