import { desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { inspections, type VarroaMethod } from '../schema';
import { newId, nowIso } from '../util';

export type Inspection = typeof inspections.$inferSelect;

/**
 * Everything the rapid-entry screen collects. All ratings are optional
 * (null = "not recorded") — in the field you skip what you didn't check.
 * Only queen/eggs are hard booleans: they drive rule R3 in M4.
 */
export interface InspectionInput {
  queenSeen: boolean;
  eggsSeen: boolean;
  larvaeCondition?: number | null; // 0–5
  broodPattern?: number | null; // 0–5
  honeyStores?: number | null; // 0–5
  pollenStores?: number | null; // 0–5
  varroaCount?: number | null;
  varroaMethod?: VarroaMethod | null;
  temperament?: number | null; // 0–5
  beeDensity?: number | null; // 0–5
  moisture?: number | null; // 0–5
  // Nullable on purpose: null = not checked, false = checked and clear.
  beetlesSeen?: boolean | null;
  waxMothSeen?: boolean | null;
  diseaseSignsSeen?: boolean | null;
  noteText?: string | null;
}

export const inspectionsRepo = {
  /** Timeline for the hive detail screen — newest first. */
  async listByHive(hiveId: string): Promise<Inspection[]> {
    return db
      .select()
      .from(inspections)
      .where(eq(inspections.hiveId, hiveId))
      .orderBy(desc(inspections.inspectedAt));
  },

  /** Newest inspection only — R6 (neglect warning) just needs one date. */
  async latestByHive(hiveId: string): Promise<Inspection | null> {
    const rows = await db
      .select()
      .from(inspections)
      .where(eq(inspections.hiveId, hiveId))
      .orderBy(desc(inspections.inspectedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(hiveId: string, input: InspectionInput): Promise<Inspection> {
    const now = nowIso();
    const row: Inspection = {
      id: newId(),
      hiveId,
      inspectedAt: now,
      queenSeen: input.queenSeen,
      eggsSeen: input.eggsSeen,
      larvaeCondition: input.larvaeCondition ?? null,
      broodPattern: input.broodPattern ?? null,
      honeyStores: input.honeyStores ?? null,
      pollenStores: input.pollenStores ?? null,
      varroaCount: input.varroaCount ?? null,
      varroaMethod: input.varroaMethod ?? null,
      temperament: input.temperament ?? null,
      beeDensity: input.beeDensity ?? null,
      moisture: input.moisture ?? null,
      beetlesSeen: input.beetlesSeen ?? null,
      waxMothSeen: input.waxMothSeen ?? null,
      diseaseSignsSeen: input.diseaseSignsSeen ?? null,
      weatherSnapshot: null, // M8
      noteText: input.noteText?.trim() || null,
      voiceTranscript: null, // M6
      createdAt: now,
    };
    await db.insert(inspections).values(row);
    return row;
  },
};
