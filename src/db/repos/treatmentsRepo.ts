import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { treatments, type TreatmentProduct } from '../schema';
import { newId } from '../util';

export type Treatment = typeof treatments.$inferSelect;

export interface TreatmentInput {
  product: TreatmentProduct;
  /** Free text on purpose: "2 strips", "50 ml", "5 g/hive" — units vary wildly. */
  dose?: string | null;
  startedAt: string;
  /** null = still on the hive. */
  endedAt?: string | null;
  notes?: string | null;
}

export const treatmentsRepo = {
  /** Treatment history of a hive, newest first. */
  async listByHive(hiveId: string): Promise<Treatment[]> {
    return db
      .select()
      .from(treatments)
      .where(eq(treatments.hiveId, hiveId))
      .orderBy(desc(treatments.startedAt));
  },

  /**
   * The most recent treatment whatever its state — this is the one shown as a
   * warning when a new treatment is being added (§6: prevent overdose).
   */
  async latestByHive(hiveId: string): Promise<Treatment | null> {
    const rows = await db
      .select()
      .from(treatments)
      .where(eq(treatments.hiveId, hiveId))
      .orderBy(desc(treatments.startedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  /** A treatment still on the hive (not ended), if any. */
  async activeByHive(hiveId: string): Promise<Treatment | null> {
    const rows = await db
      .select()
      .from(treatments)
      .where(and(eq(treatments.hiveId, hiveId), isNull(treatments.endedAt)))
      .orderBy(desc(treatments.startedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async getById(id: string): Promise<Treatment | null> {
    const rows = await db.select().from(treatments).where(eq(treatments.id, id));
    return rows[0] ?? null;
  },

  async create(hiveId: string, input: TreatmentInput): Promise<Treatment> {
    const row: Treatment = {
      id: newId(),
      hiveId,
      product: input.product,
      dose: input.dose?.trim() || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? null,
      notes: input.notes?.trim() || null,
    };
    await db.insert(treatments).values(row);
    return row;
  },

  async update(id: string, input: TreatmentInput): Promise<void> {
    await db
      .update(treatments)
      .set({
        product: input.product,
        dose: input.dose?.trim() || null,
        startedAt: input.startedAt,
        endedAt: input.endedAt ?? null,
        notes: input.notes?.trim() || null,
      })
      .where(eq(treatments.id, id));
  },

  /** "Treatment removed today" — the common one-tap case. */
  async setEnded(id: string, endedAtIso: string): Promise<void> {
    await db.update(treatments).set({ endedAt: endedAtIso }).where(eq(treatments.id, id));
  },
};
