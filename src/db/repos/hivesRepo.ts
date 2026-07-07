import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { hives, type HiveType } from '../schema';
import { newId, nowIso } from '../util';

export type Hive = typeof hives.$inferSelect;

export interface HiveInput {
  label: string;
  hiveType: HiveType;
  notes?: string | null;
}

export const hivesRepo = {
  /** Active hives of one apiary, sorted by label (K-01, K-02, …). */
  async listActiveByApiary(apiaryId: string): Promise<Hive[]> {
    return db
      .select()
      .from(hives)
      .where(and(eq(hives.apiaryId, apiaryId), isNull(hives.archivedAt)))
      .orderBy(asc(hives.label));
  },

  async getById(id: string): Promise<Hive | null> {
    const rows = await db.select().from(hives).where(eq(hives.id, id));
    return rows[0] ?? null;
  },

  async create(apiaryId: string, input: HiveInput): Promise<Hive> {
    const row: Hive = {
      id: newId(),
      apiaryId,
      label: input.label.trim(),
      hiveType: input.hiveType,
      status: 'healthy', // derived by the rules engine from M4 on
      mapLat: null,
      mapLng: null,
      colorTag: null,
      notes: input.notes?.trim() || null,
      createdAt: nowIso(),
      archivedAt: null,
    };
    await db.insert(hives).values(row);
    return row;
  },

  async update(id: string, input: HiveInput): Promise<void> {
    await db
      .update(hives)
      .set({
        label: input.label.trim(),
        hiveType: input.hiveType,
        notes: input.notes?.trim() || null,
      })
      .where(eq(hives.id, id));
  },

  /** Soft delete — inspection history stays forever. */
  async archive(id: string): Promise<void> {
    await db.update(hives).set({ archivedAt: nowIso() }).where(eq(hives.id, id));
  },
};
