import { and, desc, eq, inArray, isNull, max } from 'drizzle-orm';
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
  otherInsectsSeen?: boolean | null;
  diseaseSignsSeen?: boolean | null;
  noteText?: string | null;
}

export const inspectionsRepo = {
  /** Timeline for the hive detail screen — newest first. */
  async listByHive(hiveId: string): Promise<Inspection[]> {
    return db
      .select()
      .from(inspections)
      .where(and(eq(inspections.hiveId, hiveId), isNull(inspections.deletedAt)))
      .orderBy(desc(inspections.inspectedAt));
  },

  /** Newest inspection only — R6 (neglect warning) just needs one date. */
  async latestByHive(hiveId: string): Promise<Inspection | null> {
    const rows = await db
      .select()
      .from(inspections)
      .where(and(eq(inspections.hiveId, hiveId), isNull(inspections.deletedAt)))
      .orderBy(desc(inspections.inspectedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async getById(id: string): Promise<Inspection | null> {
    const rows = await db.select().from(inspections).where(eq(inspections.id, id));
    return rows[0] ?? null;
  },

  /**
   * Newest inspection DATE for each of several hives, in one grouped query —
   * what the hive list needs to show "inspected 12 days ago" on every card
   * without running a query per hive.
   */
  async latestByHives(hiveIds: string[]): Promise<Record<string, string>> {
    if (hiveIds.length === 0) return {};
    const rows = await db
      .select({ hiveId: inspections.hiveId, latest: max(inspections.inspectedAt) })
      .from(inspections)
      .where(and(inArray(inspections.hiveId, hiveIds), isNull(inspections.deletedAt)))
      .groupBy(inspections.hiveId);
    const out: Record<string, string> = {};
    for (const row of rows) if (row.latest) out[row.hiveId] = row.latest;
    return out;
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
      otherInsectsSeen: input.otherInsectsSeen ?? null,
      diseaseSignsSeen: input.diseaseSignsSeen ?? null,
      weatherSnapshot: null, // M8
      noteText: input.noteText?.trim() || null,
      voiceTranscript: null, // M6
      createdAt: now,
      deletedAt: null,
    };
    await db.insert(inspections).values(row);
    return row;
  },

  /**
   * Correct a saved inspection (M5c). `inspectedAt` is deliberately NOT
   * editable: it records when you actually stood at the hive, and the rules
   * and the condition score both date their evidence from it.
   */
  async update(id: string, input: InspectionInput): Promise<void> {
    await db
      .update(inspections)
      .set({
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
        otherInsectsSeen: input.otherInsectsSeen ?? null,
        diseaseSignsSeen: input.diseaseSignsSeen ?? null,
        noteText: input.noteText?.trim() || null,
      })
      .where(eq(inspections.id, id));
  },

  /** Soft delete — hidden everywhere, kept forever, like archived hives. */
  async softDelete(id: string): Promise<void> {
    await db.update(inspections).set({ deletedAt: nowIso() }).where(eq(inspections.id, id));
  },
};
