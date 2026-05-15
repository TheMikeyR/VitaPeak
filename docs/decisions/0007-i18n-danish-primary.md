# 0007 — Internationalisation: Danish primary, English secondary

- **Status**: Accepted
- **Date**: 2026-05-15
- **Deciders**: Mike Rontved
- **Context chunk**: applies across all chunks; first concrete locale wiring lands in chunk 01 (auth screens) and is carried through every subsequent chunk.

## Context

VitaPeak targets Danish physiotherapy clinics as the launch market. All end-users (therapists and clients) will be Danish speakers by default. The system must present a Danish UI out of the box without requiring users to switch language. At the same time:

- A language switcher is needed for multilingual clinics and for English-speaking users.
- Future expansion to other Nordic markets (Swedish, Norwegian) or beyond must be achievable without structural rework.
- The codebase (variable names, comments, commit messages, API field names) must stay in English — this is a developer ergonomics constraint.
- Both the Next.js web app and the Expo mobile app need i18n. Sharing locale files across both reduces duplication and drift.

## Options considered

1. **Hardcode Danish everywhere, refactor to i18n later** — simple now, but large rework when the second language is needed. Rejected.

2. **English-first, Danish via i18n** — aligns with most open-source tooling defaults, but forces Danish users to see English flash during hydration and makes Danish a second-class citizen. Rejected.

3. **Danish primary (`da`), English fallback (`en`), from day one; shared locale package** — zero deferred cost, Danish users never see English UI, English fallback prevents missing-key gaps during development. Chosen.

## Decision

We will structure i18n from the first chunk:

- **Primary locale**: `da` (Danish). All UI strings must have a `da` translation before a chunk is considered done.
- **Fallback locale**: `en` (English). Every key present in `da.json` must also exist in `en.json`. The i18next `fallbackLng` is set to `en`.
- **Future locales**: add a JSON file + list the locale in `packages/i18n/src/config.ts`. No structural changes needed.
- **Code language**: always English. Translation keys, variable names, API fields, comments — all English.
- **Shared locale files**: `packages/i18n/src/locales/{da,en}.json` are the source of truth. Both web and mobile import from this package.
- **Web runtime**: `next-intl` — integrates with Next.js App Router middleware; reads locale files from `packages/i18n`.
- **Mobile runtime**: `i18next` + `react-i18next` + `expo-localization` — detects device locale at startup, defaults to `da` if unsupported.
- **Language switcher**: present in both apps. Persisted to a cookie (web) or `AsyncStorage` (mobile).
- **System-seeded DB content** (`BodyRegion.label`, `Exercise.name`, `ProgramTemplate.name/description`): the DB column holds an English fallback string. The UI resolves via translation key (e.g. `bodyRegion.<slug>`, `exercise.<id>.name`). Therapist-created content is stored as-is — it is not translated.
- **Push notification copy**: Danish by default; use the recipient's stored locale preference when sending.

## Consequences

- **Positive**: Danish users get a native-language experience from day one. Adding a third locale costs only a JSON file. No late refactor of UI strings.
- **Negative**: Every chunk must include locale file entries alongside code changes — small overhead per chunk.
- **Negative**: `packages/i18n` is a new shared package that both web and mobile depend on; its import path must be kept stable.
- **Follow-up actions**:
  - Add `packages/i18n` to Turborepo pipeline and `pnpm-workspace.yaml`.
  - Establish a key naming convention (`namespace.path`) before chunk 01.
  - Lint rule (or CI check) to enforce no hardcoded UI strings (post-MVP, not a pilot gate).
  - Document locale contribution guide when a third language is added.

## References

- [`next-intl` docs](https://next-intl-docs.vercel.app)
- [`i18next` docs](https://www.i18next.com)
- [`expo-localization` docs](https://docs.expo.dev/versions/latest/sdk/localization/)
