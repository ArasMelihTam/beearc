import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
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

export const db = drizzle(expoDb, { schema });
