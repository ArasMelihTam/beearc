import { queenAgeMonths } from '../logic/queens';

/**
 * Queen age as a sentence, in the active language. Kept out of the screens
 * because both the hive summary row and the queen screen show it, and out of
 * src/logic/queens.ts because that module stays pure and language-free.
 *
 * Always in MONTHS (master prompt M5: "queen age in months") — a queen's
 * second summer is what matters, and "26 months" says that more precisely
 * than "2 years" does.
 *
 * Takes `t` as an argument rather than importing i18n directly, so it can be
 * called from anywhere without caring how translation was set up.
 */
type Translate = (key: string, options?: Record<string, unknown>) => string;

export function formatQueenAge(
  t: Translate,
  introducedAtIso: string,
  nowIso: string = new Date().toISOString()
): string {
  const months = queenAgeMonths(introducedAtIso, nowIso);
  // "0 months old" is technically true and reads like a bug.
  return months === 0 ? t('queens.ageNew') : t('queens.ageMonths', { count: months });
}
