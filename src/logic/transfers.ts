/**
 * Transfer logic (M5b) — PURE, like src/logic/rules.ts: no database, no clock.
 *
 * A transfer is stored once, from one hive to another. Every screen that shows
 * it is standing at ONE of those two hives, so the only real question this
 * module answers is: from where I'm standing, did this hive give or receive?
 */

/** Which end of the move the hive we are looking at was on. */
export type TransferDirection = 'gave' | 'received';

/** The two hive ids a transfer connects — all these helpers need. */
export interface TransferEnds {
  fromHiveId: string;
  toHiveId: string;
}

/**
 * 'gave' when the hive is the donor, 'received' when it is the receiver,
 * null when the transfer has nothing to do with it (a caller bug, not a
 * crash — a list simply skips a row it cannot place).
 */
export function directionFor(
  transfer: TransferEnds,
  hiveId: string
): TransferDirection | null {
  if (transfer.fromHiveId === hiveId) return 'gave';
  if (transfer.toHiveId === hiveId) return 'received';
  return null;
}

/** The hive at the OTHER end — the one whose label the row should name. */
export function otherHiveIdOf(transfer: TransferEnds, hiveId: string): string | null {
  const direction = directionFor(transfer, hiveId);
  if (direction === 'gave') return transfer.toHiveId;
  if (direction === 'received') return transfer.fromHiveId;
  return null;
}

/**
 * A hive cannot give to itself, and both ends must be chosen. The form uses
 * this to keep the save button honest instead of writing a row that would
 * show up twice in one history saying opposite things.
 */
export function isValidTransfer(fromHiveId: string | null, toHiveId: string | null): boolean {
  return fromHiveId != null && toHiveId != null && fromHiveId !== toHiveId;
}

/**
 * Build the two ends from "this hive" plus a direction — what the form holds
 * while the beekeeper is filling it in. They are standing at one hive and
 * saying which way things moved.
 */
export function endsFor(
  hiveId: string,
  direction: TransferDirection,
  otherHiveId: string
): TransferEnds {
  return direction === 'gave'
    ? { fromHiveId: hiveId, toHiveId: otherHiveId }
    : { fromHiveId: otherHiveId, toHiveId: hiveId };
}
