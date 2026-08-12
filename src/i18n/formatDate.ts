import { format, formatDistanceToNowStrict } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import i18n from './index';

/**
 * New concept — date-fns: a small date library (master prompt §4). We store
 * timestamps as ISO-8601 UTC strings; this helper turns them into a
 * human-readable local date in the app's current language, e.g.
 * "7 Temmuz 2026 14:30" / "July 7, 2026 14:30".
 */
export function formatDateTime(iso: string): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return format(new Date(iso), 'd MMMM yyyy HH:mm', { locale });
}

/** Date only, with weekday — task due dates read naturally ("Sal, 14 Temmuz"). */
export function formatDueDate(iso: string): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return format(new Date(iso), 'EEE, d MMMM', { locale });
}

/** Day and month, no weekday — treatment start/end dates ("14 Temmuz 2026"). */
export function formatDate(iso: string): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return format(new Date(iso), 'd MMMM yyyy', { locale });
}

/** Month + year only — a queen is remembered as "May 2025", not to the day. */
export function formatMonthYear(iso: string): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return format(new Date(iso), 'LLLL yyyy', { locale });
}

/**
 * "12 days ago" / "12 gün önce" — how long ago something happened. Strict, so
 * 12 days never rounds to "about 2 weeks": treatment dates are counted, not
 * felt. date-fns supplies the wording in the active language.
 */
export function formatAgo(iso: string): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale });
}

/** Standalone short month name for the month grid (0 = January). */
export function formatMonthShort(monthIndex: number): string {
  const locale = i18n.language.startsWith('tr') ? tr : enUS;
  return format(new Date(2000, monthIndex, 1), 'LLL', { locale });
}
