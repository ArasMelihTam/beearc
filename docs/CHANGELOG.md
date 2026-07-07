# Changelog

All notable changes to Beearc. Format loosely follows [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added

- M0: Project scaffolded with Expo SDK 54, TypeScript (strict), expo-router
- M0: README with design language, GPLv3 license decision, docs/STATE.md
- M1: Bottom tab navigation (Today / Hives / Map placeholder / More)
- M1: Design tokens with light/dark themes, system-follow + manual override
- M1: TR/EN internationalization (i18next), language switcher, device-language default
- M1: Glove-friendly theme and language switchers on the More screen
- M2: SQLite data layer — expo-sqlite + Drizzle ORM, all 9 tables from §6, generated migrations, schema_version table
- M2: Repository layer (src/db/repos/) — all DB access goes through it
- M2: Apiary CRUD — list with hive counts, create/edit/archive (archive blocked while active hives remain)
- M2: Hive CRUD — per-apiary list with status chips (color + icon + label), create/edit/archive
- M2: Theme + language persisted to the settings table — survive app restart and reboot
- M2: Dev-only sample-data seed (More screen, dev builds only)
- M2: docs/MASTER_PROMPT.md checked into the repo
- M2: Hive type picker — 6 types (Langstroth/Dadant/top-bar/Warré/traditional/other) as cards with plain-language descriptions and original schematic illustrations (light + dark variants, GPLv3)
- M3: Rapid-entry inspection screen — queen/eggs toggles, 0–5 ratings with word anchors (tap again to clear = "not recorded"), varroa count + method chips, temperament, note; field order mirrors a real inspection
- M3: Hive detail screen with inspection timeline (localized dates via date-fns); hive tap now opens detail, edit moved to header pencil
- M3: inspectionsRepo (repository pattern, nullable ratings — no fake zeros)
- M3: Factor picker — tick what you checked, form shows only that; selection remembered between inspections; plain-language description under each factor
- M3: New inspection factors — bee density, hive moisture (0–5), beetles / wax moth / disease-signs toggles (migration 0001; null = not checked, never a fake "no")
