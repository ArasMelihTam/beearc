import * as Crypto from 'expo-crypto';

/** New UUID for primary keys (§6). Crypto-quality randomness, fully offline. */
export const newId = (): string => Crypto.randomUUID();

/** Current moment as ISO-8601 UTC — the only timestamp format we ever store. */
export const nowIso = (): string => new Date().toISOString();
