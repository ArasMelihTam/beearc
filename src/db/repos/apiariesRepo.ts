import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { apiaries, hives } from '../schema';
import { newId, nowIso } from '../util';

export type Apiary = typeof apiaries.$inferSelect;
export type ApiaryWithHiveCount = Apiary & { hiveCount: number };

export interface ApiaryInput {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export const apiariesRepo = {
  /** Active (non-archived) apiaries with their active-hive counts, A→Z. */
  async listActive(): Promise<ApiaryWithHiveCount[]> {
    const rows = await db
      .select({ apiary: apiaries, hiveCount: count(hives.id) })
      .from(apiaries)
      .leftJoin(hives, and(eq(hives.apiaryId, apiaries.id), isNull(hives.archivedAt)))
      .where(isNull(apiaries.archivedAt))
      .groupBy(apiaries.id)
      .orderBy(asc(apiaries.name));
    return rows.map((r) => ({ ...r.apiary, hiveCount: r.hiveCount }));
  },

  async getById(id: string): Promise<Apiary | null> {
    const rows = await db.select().from(apiaries).where(eq(apiaries.id, id));
    return rows[0] ?? null;
  },

  async create(input: ApiaryInput): Promise<Apiary> {
    const row: Apiary = {
      id: newId(),
      name: input.name.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      notes: input.notes?.trim() || null,
      createdAt: nowIso(),
      archivedAt: null,
    };
    await db.insert(apiaries).values(row);
    return row;
  },

  async update(id: string, input: ApiaryInput): Promise<void> {
    await db
      .update(apiaries)
      .set({
        name: input.name.trim(),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: input.notes?.trim() || null,
      })
      .where(eq(apiaries.id, id));
  },

  /**
   * Soft delete (§6): sets archived_at, keeps all history.
   * Refuses if the apiary still has active hives — archive those first,
   * so no hive ever silently disappears from lists.
   */
  async archive(id: string): Promise<{ ok: boolean; activeHives: number }> {
    const [row] = await db
      .select({ n: count() })
      .from(hives)
      .where(and(eq(hives.apiaryId, id), isNull(hives.archivedAt)));
    const activeHives = row?.n ?? 0;
    if (activeHives > 0) return { ok: false, activeHives };
    await db.update(apiaries).set({ archivedAt: nowIso() }).where(eq(apiaries.id, id));
    return { ok: true, activeHives: 0 };
  },
};
