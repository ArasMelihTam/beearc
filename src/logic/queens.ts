import { differenceInMonths } from 'date-fns';

/**
 * Queen logic (M5a) — PURE, like src/logic/rules.ts: no DB, no clock, no
 * screen. Age is COMPUTED from introduced_at and never stored (master
 * prompt §6), so it can never go stale in the database.
 */

// ---------------------------------------------------------------------------
// Marking colors
// ---------------------------------------------------------------------------

/**
 * The five paint colors beekeepers use on a queen's thorax. The app offers
 * them as a plain list and suggests nothing: the year-based color cycle was
 * removed at the beekeeper's request (2026-08-08) because a queen often
 * already wears whatever color she came with, and a suggestion the user has
 * to undo is worse than no suggestion at all.
 */
export const QUEEN_MARK_COLORS = ['white', 'yellow', 'red', 'green', 'blue'] as const;
export type QueenMarkColor = (typeof QUEEN_MARK_COLORS)[number];

/**
 * The `mark_color` column is permissive text (an unmarked queen stores null),
 * so anything read back gets validated here rather than trusted. Unknown
 * values read as "unmarked" instead of crashing a screen.
 */
export function parseMarkColor(value: string | null): QueenMarkColor | null {
  return (QUEEN_MARK_COLORS as readonly string[]).includes(value ?? '')
    ? (value as QueenMarkColor)
    : null;
}

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

/**
 * Completed months since the queen was introduced. "13 months" means she has
 * finished her 13th month, not that she is somewhere inside it — a queen's
 * productivity is judged in whole months, and rounding up would flatter her.
 * A future introduction date (typo) reads as 0 rather than a negative age.
 */
export function queenAgeMonths(introducedAtIso: string, nowIso: string): number {
  const months = differenceInMonths(new Date(nowIso), new Date(introducedAtIso));
  return Math.max(0, months);
}

/** Split for display: 14 months → { years: 1, months: 2 }. */
export function queenAgeParts(totalMonths: number): { years: number; months: number } {
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

/**
 * A queen past her second season is usually replaced: her egg-laying and her
 * pheromone both fade, which invites swarming and supersedure. 24 months is a
 * common rule of thumb, not a hard rule — we only use it to nudge, never to
 * create a task (that stays the beekeeper's call).
 */
export const QUEEN_AGING_MONTHS = 24;

export const isQueenAging = (ageMonths: number): boolean => ageMonths >= QUEEN_AGING_MONTHS;
