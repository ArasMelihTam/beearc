import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { equipment, type EquipmentItem } from '../schema';
import { newId, nowIso } from '../util';

export type Equipment = typeof equipment.$inferSelect;

/**
 * What sits on a hive right now, and what used to. The point of the log is
 * the second half: a super you put on in June has to come off, and a drone
 * trap frame left in past capping breeds the very mites it was meant to catch.
 */
export interface EquipmentInput {
  item: EquipmentItem;
  quantity: number;
  addedAt: string;
  /** null = still on the hive. */
  removedAt?: string | null;
  notes?: string | null;
}

export const equipmentRepo = {
  /**
   * Everything ever put on this hive, newest first. The screen splits it into
   * "on the hive" and "removed" — same shape as the treatment log, so one
   * query serves both sections.
   */
  async listByHive(hiveId: string): Promise<Equipment[]> {
    return db
      .select()
      .from(equipment)
      .where(and(eq(equipment.hiveId, hiveId), isNull(equipment.deletedAt)))
      .orderBy(desc(equipment.addedAt));
  },

  /** Only what is on the hive right now — the hive detail summary line. */
  async onHiveByHive(hiveId: string): Promise<Equipment[]> {
    return db
      .select()
      .from(equipment)
      .where(
        and(
          eq(equipment.hiveId, hiveId),
          isNull(equipment.removedAt),
          isNull(equipment.deletedAt)
        )
      )
      .orderBy(desc(equipment.addedAt));
  },

  async getById(id: string): Promise<Equipment | null> {
    const rows = await db.select().from(equipment).where(eq(equipment.id, id));
    return rows[0] ?? null;
  },

  async add(hiveId: string, input: EquipmentInput): Promise<Equipment> {
    const row: Equipment = {
      id: newId(),
      hiveId,
      item: input.item,
      // A quantity below 1 would be a row that records nothing.
      quantity: Math.max(1, Math.round(input.quantity)),
      addedAt: input.addedAt,
      removedAt: input.removedAt ?? null,
      notes: input.notes?.trim() || null,
      deletedAt: null,
    };
    await db.insert(equipment).values(row);
    return row;
  },

  async update(id: string, input: EquipmentInput): Promise<void> {
    await db
      .update(equipment)
      .set({
        item: input.item,
        quantity: Math.max(1, Math.round(input.quantity)),
        addedAt: input.addedAt,
        removedAt: input.removedAt ?? null,
        notes: input.notes?.trim() || null,
      })
      .where(eq(equipment.id, id));
  },

  /** "Took it off today" — the one-tap case from the equipment list. */
  async setRemoved(id: string, removedAtIso: string): Promise<void> {
    await db.update(equipment).set({ removedAt: removedAtIso }).where(eq(equipment.id, id));
  },

  /** Soft delete — for a row that should never have existed. */
  async softDelete(id: string): Promise<void> {
    await db.update(equipment).set({ deletedAt: nowIso() }).where(eq(equipment.id, id));
  },
};
