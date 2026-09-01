import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { treatments, type TreatmentProduct } from '../schema';
import { newId } from '../util';

export type Treatment = typeof treatments.$inferSelect;

export interface TreatmentInput {
  product: TreatmentProduct;
  /** The typed-in name when `product` is 'other' (M6c); null otherwise. */
  customProduct?: string | null;
  /** Free text on purpose: "2 strips", "50 ml", "5 g/hive" — units vary wildly. */
  dose?: string | null;
  startedAt: string;
  /** null = still on the hive. */
  endedAt?: string | null;
  /** Days it should stay on; null = use the product default (or no reminder). */
  durationDays?: number | null;
  /** Days after removal before honey is safe; null = unknown, R7 stays quiet. */
  withdrawalDays?: number | null;
  /** false = the reminders this treatment books never ring (M6d). */
  notify?: boolean;
  notes?: string | null;
}

/**
 * A treatment's display name: the typed-in name for a custom product, the
 * translated product name otherwise. Every screen showing a product goes
 * through this, so "Other" never appears where a real name was recorded.
 */
export function treatmentProductLabel(
  treatment: Pick<Treatment, 'product' | 'customProduct'>,
  translate: (key: string) => string
): string {
  if (treatment.product === 'other' && treatment.customProduct) return treatment.customProduct;
  return translate(`treatmentProduct.${treatment.product}`);
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
      customProduct: input.product === 'other' ? input.customProduct?.trim() || null : null,
      dose: input.dose?.trim() || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? null,
      durationDays: input.durationDays ?? null,
      withdrawalDays: input.withdrawalDays ?? null,
      notify: input.notify ?? true,
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
        customProduct: input.product === 'other' ? input.customProduct?.trim() || null : null,
        dose: input.dose?.trim() || null,
        startedAt: input.startedAt,
        endedAt: input.endedAt ?? null,
        durationDays: input.durationDays ?? null,
        withdrawalDays: input.withdrawalDays ?? null,
        notify: input.notify ?? true,
        notes: input.notes?.trim() || null,
      })
      .where(eq(treatments.id, id));
  },

  /** "Treatment removed today" — the common one-tap case. */
  async setEnded(id: string, endedAtIso: string): Promise<void> {
    await db.update(treatments).set({ endedAt: endedAtIso }).where(eq(treatments.id, id));
  },
};
