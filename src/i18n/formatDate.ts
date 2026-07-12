import { format } from 'date-fns';
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
