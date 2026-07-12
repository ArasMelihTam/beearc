# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Session workflow (always)

1. At the START of every session, read `docs/MASTER_PROMPT.md` (project spec + working rules; local-only, gitignored) and `docs/STATE.md` (current progress). Follow both.
2. One milestone at a time. Ask before adding any dependency not pre-approved in the master prompt §4.
3. All strings through i18n (TR + EN, key parity). Never hard-code colors/sizes — use `src/theme/tokens.ts`. All DB access through `src/db/repos/`.
4. After schema changes: `npm run db:generate`, bump `SCHEMA_VERSION` in `src/db/DbProvider.tsx`.
5. Verify before finishing: `npx tsc --noEmit` clean and `npm test` green.
6. At the END of every session: update `docs/STATE.md` + `docs/CHANGELOG.md`, suggest a conventional-commits message.
