import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * One-time repair of drizzle's migration ledger.
 *
 * WHAT WENT WRONG (2026-08-12): migration 0005 was regenerated from scratch
 * after a column was dropped from the schema hours later the same day. We
 * believed it had never run on a phone. It had. The regenerated file carries a
 * NEWER timestamp than the one the phone recorded, and drizzle decides what to
 * apply purely by timestamp:
 *
 *     if (!lastDbMigration || Number(lastDbMigration[2]) < migration.folderMillis)
 *
 * (drizzle-orm/sqlite-core/dialect — it reads the single newest row of
 * `__drizzle_migrations` and re-runs everything dated after it.)
 *
 * So the phone re-ran `ALTER TABLE inspections ADD other_insects_seen`, SQLite
 * refused with "duplicate column name", the whole migration transaction rolled
 * back, and the app could not open at all.
 *
 * THE REPAIR: if the column is already there, the migration is already done in
 * substance — so record it as applied and let drizzle skip it. This preserves
 * every hive, inspection and task on the device; the alternative was deleting
 * the app.
 *
 * Runs at import time in client.ts, before React mounts, so it always lands
 * before `useMigrations`. It is a no-op on a fresh install (no ledger), on a
 * device that never got the column, and on a device already repaired — so it
 * is safe to leave in place, and safe to delete once every test device has
 * opened the app once.
 *
 * THE LESSON, for next time: a migration is frozen the moment it runs ANYWHERE,
 * including on the dev phone. After that, correct it with a new migration.
 */

/**
 * The `when` value of `0005_friendly_ultimatum` in drizzle/meta/_journal.json.
 * If that journal entry is ever regenerated this constant must follow it, or
 * the repair stops matching the migration it is repairing.
 */
const MIGRATION_0005_WHEN = 1786537994252;

const LEDGER = '__drizzle_migrations';

export function repairMigrationLedger(database: SQLiteDatabase): void {
  try {
    // No ledger means no migration has ever run here: a fresh install, which
    // will build the whole schema from 0000 correctly. Nothing to repair.
    const ledger = database.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      LEDGER
    );
    if (!ledger) return;

    // Is the column 0005 wants to add already there? (pragma_table_info as a
    // table-valued function, so this stays an ordinary query; it returns no
    // rows if the table itself is missing.)
    const column = database.getFirstSync<{ name: string }>(
      "SELECT name FROM pragma_table_info('inspections') WHERE name = ?",
      'other_insects_seen'
    );
    if (!column) return;

    // Would drizzle re-run 0005? Only if the newest ledger row predates it.
    const last = database.getFirstSync<{ created_at: number | string }>(
      `SELECT created_at FROM \`${LEDGER}\` ORDER BY created_at DESC LIMIT 1`
    );
    if (last && Number(last.created_at) >= MIGRATION_0005_WHEN) return;

    database.runSync(
      `INSERT INTO \`${LEDGER}\` ("hash", "created_at") VALUES (?, ?)`,
      'repair_0005_other_insects_seen',
      MIGRATION_0005_WHEN
    );
  } catch {
    // A failed repair must never be the thing that stops the app opening.
    // If it could not run, drizzle simply reports the original error as before.
  }
}
