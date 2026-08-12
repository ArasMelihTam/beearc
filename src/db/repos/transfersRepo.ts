import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../client';
import { hives, transfers, type TransferItem } from '../schema';
import { newId, nowIso } from '../util';

export type Transfer = typeof transfers.$inferSelect;

/**
 * A transfer plus both hive labels. One row is one move, so the donor's
 * history and the receiver's history read the SAME row from opposite sides —
 * nothing is ever entered twice, and the two halves can never disagree.
 */
export interface TransferWithHives extends Transfer {
  fromLabel: string;
  toLabel: string;
}

export interface TransferInput {
  fromHiveId: string;
  toHiveId: string;
  item: TransferItem;
  quantity: number;
  transferredAt: string;
  notes?: string | null;
}

// Both foreign keys point at the same table, so each side needs its own alias
// or SQLite cannot tell which `hives` row we mean.
const fromHive = alias(hives, 'from_hive');
const toHive = alias(hives, 'to_hive');

const withHives = {
  transfer: transfers,
  fromLabel: fromHive.label,
  toLabel: toHive.label,
};

const flatten = (rows: { transfer: Transfer; fromLabel: string; toLabel: string }[]) =>
  rows.map((r) => ({ ...r.transfer, fromLabel: r.fromLabel, toLabel: r.toLabel }));

const joined = () =>
  db
    .select(withHives)
    .from(transfers)
    .innerJoin(fromHive, eq(transfers.fromHiveId, fromHive.id))
    .innerJoin(toHive, eq(transfers.toHiveId, toHive.id));

/** Rows this hive took part in, whichever end it was on. */
const touchesHive = (hiveId: string) =>
  and(
    isNull(transfers.deletedAt),
    or(eq(transfers.fromHiveId, hiveId), eq(transfers.toHiveId, hiveId))
  );

export const transfersRepo = {
  /** Everything this hive gave or received, newest first. */
  async listByHive(hiveId: string): Promise<TransferWithHives[]> {
    const rows = await joined().where(touchesHive(hiveId)).orderBy(desc(transfers.transferredAt));
    return flatten(rows);
  },

  /** The last move either way — the hive detail summary line. */
  async latestByHive(hiveId: string): Promise<TransferWithHives | null> {
    const rows = await joined()
      .where(touchesHive(hiveId))
      .orderBy(desc(transfers.transferredAt))
      .limit(1);
    return flatten(rows)[0] ?? null;
  },

  async getById(id: string): Promise<TransferWithHives | null> {
    const rows = await joined().where(eq(transfers.id, id));
    return flatten(rows)[0] ?? null;
  },

  async create(input: TransferInput): Promise<Transfer> {
    const row: Transfer = {
      id: newId(),
      fromHiveId: input.fromHiveId,
      toHiveId: input.toHiveId,
      item: input.item,
      quantity: Math.max(1, Math.round(input.quantity)),
      transferredAt: input.transferredAt,
      notes: input.notes?.trim() || null,
      deletedAt: null,
    };
    await db.insert(transfers).values(row);
    return row;
  },

  async update(id: string, input: TransferInput): Promise<void> {
    await db
      .update(transfers)
      .set({
        fromHiveId: input.fromHiveId,
        toHiveId: input.toHiveId,
        item: input.item,
        quantity: Math.max(1, Math.round(input.quantity)),
        transferredAt: input.transferredAt,
        notes: input.notes?.trim() || null,
      })
      .where(eq(transfers.id, id));
  },

  /** Soft delete — it disappears from BOTH hives' histories at once. */
  async softDelete(id: string): Promise<void> {
    await db.update(transfers).set({ deletedAt: nowIso() }).where(eq(transfers.id, id));
  },
};
