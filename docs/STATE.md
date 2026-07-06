# Beearc — Project State

> Update this file at the end of every session so the next session resumes with zero context loss.

**Last updated:** 2026-07-06

## Current milestone

**M1 — Skeleton & theme: ✅ DONE** (accepted on device). Next up: **M2 — Data layer & hive CRUD**.

## Done

### M0 — Environment & repo ✅

- Node LTS, Git, VS Code on Mac (macOS, 8 GB RAM); Expo Go on iPhone 13 (iOS 27)
- Scaffolded with `create-expo-app`: Expo SDK 54, TypeScript strict, expo-router
- GitHub repo: github.com/ArasMelihTam/beearc, **GPLv3** (final), official LICENSE text
- README with design snippet, docs/STATE.md, docs/CHANGELOG.md

### M1 — Skeleton & theme ✅

- Starter template cleared (`app-example/`, gitignored — safe to delete)
- Bottom tabs via expo-router: Today / Hives / Map (placeholder) / More
- Design tokens in `src/theme/tokens.ts` (light + dark per master prompt §5); `useTheme` hook resolves system-follow + manual override
- Zustand settings store (`src/store/settings.ts`) — in-memory only for now
- i18n: i18next + react-i18next + expo-localization; all strings in `src/i18n/locales/{en,tr}.json`; device-language default, switcher in More
- More screen: theme + language switchers, 48dp glove-sized option buttons
- Accepted by user on phone: tabs, both themes, both languages, airplane mode ✅

## Next (M2 — Data layer & hive CRUD)

- [ ] New deps (ask first per rule 3, but pre-approved in §4): expo-sqlite, drizzle-orm, drizzle-kit
- [ ] Drizzle schema per master prompt §6 (all 9 tables), migrations, `schema_version`
- [ ] Repository layer in `src/db/repos/` — ALL DB access goes through it
- [ ] Seed script
- [ ] Screens: apiary list → apiary detail (hive list) → create/edit/archive apiary & hive
- [ ] **Persist theme + language to the settings table** (currently in-memory — resets on app restart)
- [ ] Acceptance: real apiary + hives created; data survives app restart and phone reboot; airplane mode

## Decisions log

- License: GPLv3 (locked at M0)
- i18n library: i18next + react-i18next + expo-localization (approved at M1)
- Android testing: occasional access to a borrowed Android device; develop on iPhone via Expo Go through M8
- Icons: MaterialCommunityIcons (calendar-check / beehive-outline / map-outline / dots-horizontal)
- Routes live in root `app/`; all non-route code in `src/` (theme, store, i18n, components, later db + logic)

## Known bugs

- None reported

## Notes for next session

- Theme/language persistence is the first thing to wire once the settings table exists (M2)
- User (beekeeper, TR domain expert) has verified Turkish strings so far; re-verify new terminology each milestone
- Everything must keep running in plain Expo Go until M9 (dev build)
- Working rules: one milestone at a time, complete files, ask before new deps, airplane-mode test, conventional commits, update this file every session
