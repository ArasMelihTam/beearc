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

- M5a: Queen tracker per hive — age computed from the introduction date (never stored), origin, 1–5 star productivity, notes, and the full replacement history; introducing a queen retires the previous one automatically
- M5a: International 5-color marking cycle — the color for the chosen year is suggested automatically (white/yellow/red/green/blue), any color or "unmarked" can still be picked; color is always shown with its name
- M5a: Treatment log per hive — 8 products (organic acids, thymol, and the synthetic strips), free-text dose, start/end dates, notes; one-tap "end treatment"
- M5a: "Check the last treatment first" warning shown whenever a new treatment is added (§6 — prevents overdosing and honey residue)
- M5a: Rule R2 wired up — starting a treatment schedules the "end / remove treatment" reminder for that product's duration; ending it closes that reminder and books the post-treatment varroa recount
- M5a: Checking off "Plan varroa treatment" (R4) now asks what you decided — record the treatment (pre-filled for that hive) or just mark it done; recording it is what completes the task
- M5a: Hive detail shows the queen's age and the last treatment at a glance, each opening its own history
- M5a: Month/year picker for past dates and a "days ago" picker for treatment dates — still no calendar grid (too small for gloves)
- M5a: 12 more Jest tests covering mark colors and queen age math

- M5c: Prior inspections can now be opened in full, edited, and deleted — same swipe gestures as tasks, tap to view (soft delete via inspections.deleted_at, migration 0003)
- M5c: Correcting an inspection retracts the alerts it no longer justifies — fixing a mistyped "no queen seen" removes the recheck task and the hive's warning
- M5c: Inspection cards and detail show how long ago the hive was looked at ("12 days ago", "3 months 12 days ago")
- M5d: Hive list shows when each hive was last inspected, without opening it
- M5d: Inspection age is shaded as well as written — sage when you were just there, fading to terracotta once a hive passes your neglect threshold, on the hive list and the timeline
- M5c/M5d: 21 more Jest tests (50 total) covering mark colors, queen age and elapsed-time math

- M5b: Equipment log per hive — what is on the box now, what has come off, and when; quantity stepper instead of a keyboard, one-tap "Take off"
- M5b: Rule R1 wired up — putting a super on the hive schedules the "check super fill progress" reminder ten days out
- M5b: Hive-to-hive transfer log (new `transfers` table, migration 0004) — ONE stored row is one move, read from both ends: the donor's history says "gave", the receiver's says "received", and the two can never disagree
- M5b: 9 transfer items — frames of brood / honey / pollen, empty comb, super, feeder, queen cell, shaken bees, other
- M5b: Transfers are recorded from where you are standing ("K-07 gave" / "K-07 received"), other hive picked apiary-first and defaulting to this hive's own apiary
- M5b: Equipment and transfer entries can be corrected or deleted (soft delete on both); deleting a transfer removes it from both hives at once
- M5b: Hive detail gained equipment ("2 × Deep super · 1 × Feeder") and last-transfer summary rows
- M5b: 12 more Jest tests (62 total) covering transfer direction, both-ends round-trip, and the two coumaphos durations

- M5e: Summary lines on the hive detail slide sideways with a finger — a long equipment list is read in place instead of being cut off with "…"; tapping the row still opens its history
- M5e: New inspection finding "Other harmful insects seen" (ants, earwigs — none of them beetles or wax moths), with the same honest tri-state as the other pests: not checked / checked and clear / found (migration 0005)

- M6: Attach photos to an inspection from the camera or the photo library, on both the entry and edit screens
- M6: Photos are resized to 1280 px on the longest side and compressed to roughly 200 KB, so a full season costs megabytes rather than gigabytes
- M6: Inspection detail shows the photos; tapping one opens it full screen. The hive timeline card shows a camera icon and count
- M6: Photos are stored on the device and never leave it — the whole feature works in airplane mode
- M6: Unreferenced photo files are cleaned up at startup, so an abandoned inspection leaves nothing behind
- M6b: Apiaries and hives can be deleted — swipe left on any row in the Hives tab, the same gesture as tasks and inspections. Deleting an apiary deletes the hives standing in it, and the confirmation says how many
- M6b: A hive's open tasks and their reminders are deleted with the hive, so Today never nags about a colony that is gone
- M6b: `danger` / `onDanger` theme tokens — one red reserved for destructive actions, in both themes
- M6c: "Other" treatments take a typed-in product name, remembered for next time with its own day counts; tap a name to reuse it, × to forget it (past treatments keep their own copy)
- M6c: Every treatment carries "leave on for ___ days" — prefilled from the product, editable, and the only way a custom product ever gets a removal reminder
- M6c: R7 — honey withdrawal period. When a treatment ends, the app books the day the honey is clear again and shows "Do not harvest before ___" on the hive until then. Silent when the period is unknown, because implying a harvest is safe on a guess is worse than saying nothing
- M6c: `DayCountStepper` — quick chips plus ±1, with "Not set" as a real answer distinct from zero

### Changed

- M5c: Queen mark colors are no longer suggested from the year — the picker offers the five colors with nothing preselected
- M5b: Coumaphos split into strips (CheckMite+, 42 days) and trickle (Perizin, 7 days) — one product could not carry two treatment lengths five weeks apart, and the "take it off" reminder is only useful if it lands on the right day
- M5b: Equipment items extended past §6 with brood box, drone trap frame, pollen trap and winter insulation — all things you add and must remember to remove
- M5b: `equipment` gained a notes column, so an "Other" entry is no longer an unlabelled row
- M5c: Hive status chips ("Healthy / Check soon / Urgent") removed; the underlying derived status still drives the assistant's tasks and reminders
- M6b: Delete panels are red (`danger`) instead of slate — red is what "this removes something" looks like. Both themes clear WCAG AA: white on #B3261E is 6.5:1, Dark Umber on #E8776E is 5.2:1
- M6b: Swipe gestures moved into one `SwipeableRow` component shared by tasks, inspections, apiaries and hives, so the gesture cannot mean different things on different screens
- M6b: Swipe panels say "Edit" / "Delete" rather than "Edit task" / "Arılığı düzenle" — 96 dp is not enough for a sentence
- M6b: An apiary with hives in it can now be deleted (M2 refused until every hive was archived first). The hive count is named in the confirmation instead
- M6c: Queen seen and eggs seen now start on YES in a new inspection — on a healthy colony you nearly always see them, so a routine inspection needs no taps there. R3 still only fires when BOTH are set to no, so this cannot raise a false alarm

### Fixed

- M4b: Swipe directions were mirrored (edit/delete swapped, edit fired from the wrong gesture) — device-found; the library reports the physical swipe direction, not the panel side. Editing is now swipe-only (tap-to-edit removed)
- M4b: iOS crash "Cannot cast 'nil' for field 'body'" when scheduling a notification without a hive label — optional fields must be omitted, not passed as undefined; notification failures no longer break task saving
- M5: App could not open — "Failed to run the query 'ALTER TABLE `inspections` ADD `other_insects_seen` integer'". Migration 0005 had been regenerated after already running on the device, and drizzle re-applies any migration dated later than the newest ledger row. `repairMigrationLedger()` now records the migration as applied when its column is already present, so the chain completes without losing any data
- M5: The database error screen showed which query failed but not why (drizzle hides the SQLite reason in `error.cause`) — the underlying message is now shown too
- M6b: The swipe hint on Today told the opposite of what the app does ("swipe left to edit, right to delete") — it sent you to the *edit* gesture when you wanted to delete. The code was right; the hint is now corrected in both languages
- M6c: The Turkish last-treatment warning read "{{product}}, {{date}} ({{ago}}) başladı", splitting the date from its verb, and said "Çok erken" where the beekeeper's meaning is "olması gerekenden erken" — earlier than it should be. Reworded. ("zehirleme" was correct and stays: over-treating poisons the colony, and that is the beekeeper's own word for the risk)
- M6c: Custom product names are matched with Turkish i-folding — without it "APIVAR" lowercases to "apıvar" with a dotless ı on a Turkish phone, and the same product would have been remembered twice

### Fixed

- M4: Removed leftover app-example/ starter folder (was breaking `tsc --noEmit`)
