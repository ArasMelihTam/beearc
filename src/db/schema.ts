import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Beearc database schema — master prompt §6 is the source of truth.
 *
 * Conventions (locked):
 * - UUID (text) primary keys — sync-proof for a future sync engine.
 * - ISO-8601 UTC strings for all timestamps (SQLite has no date type;
 *   ISO strings sort correctly and survive export/import unchanged).
 * - Soft delete via nullable `archived_at` — we never lose beekeeping history.
 * - ALL access goes through src/db/repos/, never import this in screens.
 *
 * New concept — Drizzle schema: each `sqliteTable()` call below describes one
 * SQL table in TypeScript. drizzle-kit reads this file and generates the real
 * SQL migration files in /drizzle, and the app gets full type-safety for free:
 * a typo in a column name is a compile error, not a runtime crash in the field.
 */

// ---------------------------------------------------------------------------
// apiaries — a physical location where hives stand (e.g. "Köy arılığı")
// ---------------------------------------------------------------------------
export const apiaries = sqliteTable('apiaries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  archivedAt: text('archived_at'),
});

// ---------------------------------------------------------------------------
// hives — one colony box, always inside an apiary
// ---------------------------------------------------------------------------
// All major hive styles (user decision), each explained in the picker UI.
// Values are stable identifiers — only the i18n labels are user-facing.
// 'traditional' covers fixed-comb hives like Turkey's kara kovan.
export const HIVE_TYPES = [
  'langstroth',
  'dadant',
  'top_bar',
  'warre',
  'traditional',
  'other',
] as const;
export type HiveType = (typeof HIVE_TYPES)[number];

export const HIVE_STATUSES = ['healthy', 'warning', 'urgent'] as const;
export type HiveStatus = (typeof HIVE_STATUSES)[number];

export const hives = sqliteTable('hives', {
  id: text('id').primaryKey(),
  apiaryId: text('apiary_id')
    .notNull()
    .references(() => apiaries.id),
  label: text('label').notNull(), // e.g. "K-07"
  hiveType: text('hive_type', { enum: HIVE_TYPES }).notNull(),
  /**
   * DERIVED field (§7): recomputed by the rules engine after every
   * inspection/task change — never set by hand in the UI.
   * Stored (not computed on the fly) so lists and map pins render instantly.
   */
  status: text('status', { enum: HIVE_STATUSES }).notNull().default('healthy'),
  mapLat: real('map_lat'),
  mapLng: real('map_lng'),
  colorTag: text('color_tag'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  archivedAt: text('archived_at'),
});

// ---------------------------------------------------------------------------
// queens — queen history per hive; age is computed from introduced_at, never stored
// ---------------------------------------------------------------------------
export const QUEEN_ORIGINS = ['bred', 'bought', 'swarm', 'supersedure'] as const;
export type QueenOrigin = (typeof QUEEN_ORIGINS)[number];

export const queens = sqliteTable('queens', {
  id: text('id').primaryKey(),
  hiveId: text('hive_id')
    .notNull()
    .references(() => hives.id),
  introducedAt: text('introduced_at').notNull(), // ISO date
  origin: text('origin', { enum: QUEEN_ORIGINS }).notNull(),
  markColor: text('mark_color'),
  productivityScore: integer('productivity_score'), // 1–5
  replacedAt: text('replaced_at'),
  notes: text('notes'),
});

// ---------------------------------------------------------------------------
// inspections — the heart of the app (rapid entry arrives in M3)
// ---------------------------------------------------------------------------
export const VARROA_METHODS = ['visual', 'sticky_board', 'alcohol_wash', 'sugar_roll'] as const;
export type VarroaMethod = (typeof VARROA_METHODS)[number];

export const inspections = sqliteTable('inspections', {
  id: text('id').primaryKey(),
  hiveId: text('hive_id')
    .notNull()
    .references(() => hives.id),
  inspectedAt: text('inspected_at').notNull(),
  // `mode: 'boolean'` stores 0/1 in SQLite but gives us true/false in TS
  queenSeen: integer('queen_seen', { mode: 'boolean' }).notNull(),
  eggsSeen: integer('eggs_seen', { mode: 'boolean' }).notNull(),
  larvaeCondition: integer('larvae_condition'), // 0–5
  broodPattern: integer('brood_pattern'), // 0–5
  honeyStores: integer('honey_stores'), // 0–5
  pollenStores: integer('pollen_stores'), // 0–5
  varroaCount: integer('varroa_count'),
  varroaMethod: text('varroa_method', { enum: VARROA_METHODS }),
  temperament: integer('temperament'), // 0–5
  // Colony & hive condition (user addition, M3): both 0–5, null = not checked
  beeDensity: integer('bee_density'),
  moisture: integer('moisture'),
  // Pests & disease (user addition, M3): nullable booleans —
  // null = not checked, false = checked and clear, true = found. Never
  // default these to false: "didn't look" must not read as "no pests".
  beetlesSeen: integer('beetles_seen', { mode: 'boolean' }),
  waxMothSeen: integer('wax_moth_seen', { mode: 'boolean' }),
  /**
   * Other HARMFUL insects — ants, earwigs and the like (user request
   * 2026-08-12). Same tri-state as the others. The column keeps the shorter
   * name it was created with; "harmful" lives in the label, where it matters.
   */
  otherInsectsSeen: integer('other_insects_seen', { mode: 'boolean' }),
  diseaseSignsSeen: integer('disease_signs_seen', { mode: 'boolean' }),
  weatherSnapshot: text('weather_snapshot'), // JSON string (M8)
  noteText: text('note_text'),
  voiceTranscript: text('voice_transcript'), // M6
  createdAt: text('created_at').notNull(),
  /** Soft delete (M5c) — same "never lose history" rule as §6 archives. */
  deletedAt: text('deleted_at'),
});

// ---------------------------------------------------------------------------
// inspection_photos — file paths into the app documents dir (M6)
// ---------------------------------------------------------------------------
export const inspectionPhotos = sqliteTable('inspection_photos', {
  id: text('id').primaryKey(),
  inspectionId: text('inspection_id')
    .notNull()
    .references(() => inspections.id),
  filePath: text('file_path').notNull(),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// treatments — varroa & co.; last treatment is surfaced to prevent overdose (M5)
// ---------------------------------------------------------------------------
/**
 * Organic acids first, then thymol, then the synthetic strips (user decision
 * 2026-08-08: the synthetics are what's actually sold locally, and they have
 * very different treatment lengths — see treatmentDurationDays in rules.ts).
 * `product` is a plain text column, so this list is TS-only: adding a product
 * needs NO migration, exactly like the hive types.
 */
export const TREATMENT_PRODUCTS = [
  'formic_acid',
  'oxalic_acid',
  'thymol',
  'amitraz',
  'flumethrin',
  'tau_fluvalinate',
  // Coumaphos is sold in two forms that stay on the hive for very different
  // lengths of time (user decision 2026-08-12), so they are two products —
  // one 6-week strip, one trickle given twice a week apart. Recording the
  // wrong one would date the "remove it" reminder five weeks out.
  'coumaphos_strip',
  'coumaphos_trickle',
  'other',
] as const;
export type TreatmentProduct = (typeof TREATMENT_PRODUCTS)[number];

export const treatments = sqliteTable('treatments', {
  id: text('id').primaryKey(),
  hiveId: text('hive_id')
    .notNull()
    .references(() => hives.id),
  product: text('product', { enum: TREATMENT_PRODUCTS }).notNull(),
  /**
   * The name typed in when `product` is 'other' (M6c). Stored on the row, not
   * only in the remembered-names list, so forgetting a name from the picker
   * can never rewrite what a past treatment says it was.
   */
  customProduct: text('custom_product'),
  dose: text('dose'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  /**
   * How many days it should stay on the hive — R2's "remove it" reminder.
   * Prefilled from the product but editable, because the bottle in your hand
   * outranks a table in the app. null = fall back to the product default.
   */
  durationDays: integer('duration_days'),
  /**
   * Days after removal before honey is safe to harvest (R7). Copied onto the
   * row at entry time rather than read from settings later, so changing a
   * setting next season cannot silently re-date a past harvest window.
   */
  withdrawalDays: integer('withdrawal_days'),
  /**
   * Whether the reminders this treatment books (R2 removal, R2 recount, R7
   * withdrawal) should ring. Stored on the treatment because R7 is created
   * later, when the treatment is ended — often from the one-tap button on
   * the list screen, which has no form to ask on.
   */
  notify: integer('notify', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
});

// ---------------------------------------------------------------------------
// tasks — manual or rule-generated (`source` = 'manual' | 'rule:<rule_id>')
// ---------------------------------------------------------------------------
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  hiveId: text('hive_id').references(() => hives.id),
  apiaryId: text('apiary_id').references(() => apiaries.id),
  title: text('title').notNull(),
  details: text('details'),
  dueAt: text('due_at').notNull(),
  doneAt: text('done_at'),
  /** Soft delete (swipe-to-delete, M4b) — same "never lose history" rule as §6. */
  deletedAt: text('deleted_at'),
  /**
   * Whether the phone should ring for this task on its due date (M6d).
   * The task itself is unaffected — it still sits on Today and still needs
   * checking off. This mutes ONLY the notification, for the chores you would
   * rather see when you look than be interrupted by. Default on.
   */
  notify: integer('notify', { mode: 'boolean' }).notNull().default(true),
  source: text('source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// equipment — supers, feeders, excluders… drives rule R1 (M4/M5)
// ---------------------------------------------------------------------------
/**
 * §6's list plus four items the beekeeper actually puts on a hive (user
 * decision 2026-08-12). Ordered by how often they are picked, because this
 * list is chosen with gloves on. Text column → TS-only enum, no migration.
 *
 * R1 keys off the `_super` suffix, so only deep_super and medium_super
 * schedule a fill check — a brood box is not something you check for fill.
 */
export const EQUIPMENT_ITEMS = [
  'deep_super',
  'medium_super',
  'brood_box',
  'frames',
  'queen_excluder',
  'feeder',
  'drone_frame',
  'pollen_trap',
  'winter_insulation',
  'other',
] as const;
export type EquipmentItem = (typeof EQUIPMENT_ITEMS)[number];

export const equipment = sqliteTable('equipment', {
  id: text('id').primaryKey(),
  hiveId: text('hive_id')
    .notNull()
    .references(() => hives.id),
  item: text('item', { enum: EQUIPMENT_ITEMS }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  addedAt: text('added_at').notNull(),
  /** null = still on the hive. */
  removedAt: text('removed_at'),
  /** Beyond §6: without it an "Other" row is an unlabelled mystery (M5b). */
  notes: text('notes'),
  /** Soft delete (M5b) — a mistyped row is hidden, never erased. */
  deletedAt: text('deleted_at'),
});

// ---------------------------------------------------------------------------
// transfers — what moved from one hive to another (user request 2026-07-07)
// ---------------------------------------------------------------------------
/**
 * Equalizing, boosting a nuc, swarm prevention: beekeeping is full of moving
 * a frame of brood from a strong colony into a weak one. One row records both
 * halves of that move, so it appears in the donor's history as "gave" and in
 * the receiver's as "received" — never entered twice.
 */
export const TRANSFER_ITEMS = [
  'brood_frame',
  'honey_frame',
  'pollen_frame',
  'empty_comb',
  'super',
  'feeder',
  'queen_cell',
  /** Shaken or scooped bees — no frame, just bees (user decision 2026-08-08). */
  'bees',
  'other',
] as const;
export type TransferItem = (typeof TRANSFER_ITEMS)[number];

export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  fromHiveId: text('from_hive_id')
    .notNull()
    .references(() => hives.id),
  toHiveId: text('to_hive_id')
    .notNull()
    .references(() => hives.id),
  item: text('item', { enum: TRANSFER_ITEMS }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  transferredAt: text('transferred_at').notNull(),
  notes: text('notes'),
  /** Soft delete (M5b) — same "never lose history" rule as §6. */
  deletedAt: text('deleted_at'),
});

// ---------------------------------------------------------------------------
// settings — key/value store (theme, language, varroa thresholds, backup flag)
// ---------------------------------------------------------------------------
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ---------------------------------------------------------------------------
// schema_version — our own explicit version marker (§6), independent of the
// bookkeeping table Drizzle keeps for itself. Exporters/backups (M7) read it.
// ---------------------------------------------------------------------------
export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});
