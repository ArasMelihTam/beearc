import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { repairMigrationLedger } from './repair';
import * as schema from './schema';

/**
 * The one and only database connection.
 *
 * New concept — this file is a "singleton": the module runs once on first
 * import and every part of the app shares the same `db` object. Only the
 * repository layer (src/db/repos/) should import it.
 */
const expoDb = openDatabaseSync('beearc.db');

// WAL = write-ahead logging: safer + faster writes on mobile.
// foreign_keys: SQLite doesn't enforce FK constraints unless asked.
expoDb.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

// Heals one specific broken-ledger case before migrations run. No-op on a
// healthy database — see src/db/repair.ts for the full story. Called here, at
// import time, because it MUST happen before useMigrations' effect fires.
repairMigrationLedger(expoDb);

export const db = drizzle(expoDb, { schema });
