import { and, desc, eq, isNull } from 'drizzle-orm';
import type { QueenMarkColor } from '../../logic/queens';
import { db } from '../client';
import { queens, type QueenOrigin } from '../schema';
import { newId } from '../util';

export type Queen = typeof queens.$inferSelect;

/**
 * Queen age is NEVER stored (§6) — only `introducedAt` is, and
 * src/logic/queens.ts computes the age from it.
 */
export interface QueenInput {
  introducedAt: string;
  origin: QueenOrigin;
  /** null = unmarked. */
  markColor?: QueenMarkColor | null;
  /** 1–5 stars, null = not rated yet. */
  productivityScore?: number | null;
  notes?: string | null;
}

export const queensRepo = {
  /** Full queen history of a hive, newest first — the replacement record. */
  async listByHive(hiveId: string): Promise<Queen[]> {
    return db
      .select()
      .from(queens)
      .where(eq(queens.hiveId, hiveId))
      .orderBy(desc(queens.introducedAt));
  },

  /** The queen heading the colony right now (not yet replaced), or null. */
  async current(hiveId: string): Promise<Queen | null> {
    const rows = await db
      .select()
      .from(queens)
      .where(and(eq(queens.hiveId, hiveId), isNull(queens.replacedAt)))
      .orderBy(desc(queens.introducedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  async getById(id: string): Promise<Queen | null> {
    const rows = await db.select().from(queens).where(eq(queens.id, id));
    return rows[0] ?? null;
  },

  /**
   * Introduce a queen. A colony has exactly one laying queen, so any queen
   * still marked current is retired first — dated at the moment the new one
   * arrived, never earlier than her own introduction (a mistyped date must
   * not create a queen who was replaced before she existed).
   */
  async introduce(hiveId: string, input: QueenInput): Promise<Queen> {
    const previous = await this.current(hiveId);
    if (previous) {
      const replacedAt =
        input.introducedAt < previous.introducedAt ? previous.introducedAt : input.introducedAt;
      await db.update(queens).set({ replacedAt }).where(eq(queens.id, previous.id));
    }
    const row: Queen = {
      id: newId(),
      hiveId,
      introducedAt: input.introducedAt,
      origin: input.origin,
      markColor: input.markColor ?? null,
      productivityScore: input.productivityScore ?? null,
      replacedAt: null,
      notes: input.notes?.trim() || null,
    };
    await db.insert(queens).values(row);
    return row;
  },

  /** Edit a queen's details (her star rating changes across the season). */
  async update(id: string, input: QueenInput): Promise<void> {
    await db
      .update(queens)
      .set({
        introducedAt: input.introducedAt,
        origin: input.origin,
        markColor: input.markColor ?? null,
        productivityScore: input.productivityScore ?? null,
        notes: input.notes?.trim() || null,
      })
      .where(eq(queens.id, id));
  },
};
