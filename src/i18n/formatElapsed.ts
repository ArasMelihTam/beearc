import { elapsedParts } from '../logic/elapsed';

/**
 * "Inspected 12 days ago" / "3 months 12 days ago" (M5c, user request).
 * Wording lives here; the arithmetic lives in src/logic/elapsed.ts where it
 * can be tested. `t` is passed in rather than imported, like formatQueen.ts.
 */
type Translate = (key: string, options?: Record<string, unknown>) => string;

export function formatElapsed(
  t: Translate,
  fromIso: string,
  nowIso: string = new Date().toISOString()
): string {
  const { months, days, totalDays } = elapsedParts(fromIso, nowIso);
  if (totalDays === 0) return t('elapsed.today');
  // Built from parts so each unit gets its own plural rule: "1 month 1 day
  // ago" and "3 months 12 days ago" both come out right, in either language.
  const parts: string[] = [];
  if (months > 0) parts.push(t('elapsed.monthPart', { count: months }));
  if (days > 0) parts.push(t('elapsed.dayPart', { count: days }));
  return t('elapsed.ago', { duration: parts.join(' ') });
}
