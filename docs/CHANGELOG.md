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
- M2: docs/MASTER_PROMPT.md kept local-only (gitignored — contains personal details; repo is public)
- M2: Hive type picker — 6 types (Langstroth/Dadant/top-bar/Warré/traditional/other) as cards with plain-language descriptions and original schematic illustrations (light + dark variants, GPLv3)
- M3: Rapid-entry inspection screen — queen/eggs toggles, 0–5 ratings with word anchors (tap again to clear = "not recorded"), varroa count + method chips, temperament, note; field order mirrors a real inspection
- M3: Hive detail screen with inspection timeline (localized dates via date-fns); hive tap now opens detail, edit moved to header pencil
- M3: inspectionsRepo (repository pattern, nullable ratings — no fake zeros)
- M3: Factor picker — tick what you checked, form shows only that; selection remembered between inspections; plain-language description under each factor
- M3: New inspection factors — bee density, hive moisture (0–5), beetles / wax moth / disease-signs toggles (migration 0001; null = not checked, never a fake "no")
- M4: Rules engine (src/logic/rules.ts) — R1–R6 as pure, data-driven functions; hemisphere-aware season windows derived from apiary latitude; 29 Jest tests (first tests in the project)
- M4: Derived hive status — recomputed after every inspection and task change, plus a time-based sweep (R6 neglect warning) on Today-screen focus; only the rules engine may write it
- M4: Today screen — overdue / today / upcoming / done-today sections, glove-sized check-off with undo, empty state
- M4: Manual task creation — quick due-date chips + ±1 day stepper (no calendar picker), optional apiary→hive link
- M4: tasksRepo with duplicate guard (same rule can't stack identical open tasks per hive)
- M4: Local notifications for due tasks (expo-notifications) — scheduled at due time, canceled on check-off, lazy permission ask; 100% on-device
- M4: Assistant rules settings screen (More → Assistant) — varroa % thresholds (season / pre-winter), sticky-board mites/day, neglect-reminder days; comma decimals accepted
- M4: Rule tasks stored with canonical English titles, translated at display time (language switch re-translates them)

- M4b: Multi-hive task creation — select several hives, get one check-off-able task per hive (equalizing, feeding rounds)
- M4b: Task editing (tap a task) — rule tasks lock title + hive, due date and details stay editable
- M4b: Swipe right on a task opens the editor directly (no button); swipe left reveals Delete (soft delete via tasks.deleted_at, migration 0002)
- M4b: Task history screen — done tasks show on Today until midnight, then move to history; uncheck works from both places
- M4b: One-time swipe-gesture hint card on Today (dismiss with "Got it")

### Fixed

- M4b: Swipe directions were mirrored (edit/delete swapped, edit fired from the wrong gesture) — device-found; the library reports the physical swipe direction, not the panel side. Editing is now swipe-only (tap-to-edit removed)
- M4b: iOS crash "Cannot cast 'nil' for field 'body'" when scheduling a notification without a hive label — optional fields must be omitted, not passed as undefined; notification failures no longer break task saving

### Fixed

- M4: Removed leftover app-example/ starter folder (was breaking `tsc --noEmit`)
