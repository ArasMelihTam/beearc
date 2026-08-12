import { addMonths, differenceInCalendarDays, differenceInMonths } from 'date-fns';

/**
 * "How long ago was this?" in months and days (M5c) — PURE, so it is unit
 * tested like the rest of src/logic.
 *
 * Beekeepers count in both units at once: "I looked at that hive three months
 * and twelve days ago" is a normal sentence, and "about 3 months" is not
 * precise enough when the neglect rule fires at 21 days. So we return both
 * parts and let the caller word them.
 */
export interface ElapsedParts {
  months: number;
  days: number;
  /** Total whole days — handy for thresholds and sorting. */
  totalDays: number;
}

/**
 * How overdue an inspection is, from 0 (just done) to 1 (at or past the
 * neglect threshold R6 uses). Deliberately LINEAR: this drives a color the
 * beekeeper is meant to read at a glance, and a curve would make the same
 * gap in days look different at different ages.
 */
export function staleness(ageDays: number, overdueDays: number): number {
  if (overdueDays <= 0) return 0;
  return Math.min(1, Math.max(0, ageDays / overdueDays));
}

export function elapsedParts(fromIso: string, nowIso: string): ElapsedParts {
  const from = new Date(fromIso);
  const now = new Date(nowIso);
  if (now <= from) return { months: 0, days: 0, totalDays: 0 };

  const months = Math.max(0, differenceInMonths(now, from));
  // Days left over after the whole months, counted on the calendar so that
  // "one month and one day" never comes out as 30 or 32 depending on which
  // month it happens to be.
  const days = Math.max(0, differenceInCalendarDays(now, addMonths(from, months)));
  return { months, days, totalDays: Math.max(0, differenceInCalendarDays(now, from)) };
}
