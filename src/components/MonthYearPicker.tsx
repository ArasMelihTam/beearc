import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatMonthShort } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Noon local time: far enough from midnight that no timezone shifts the day. */
const monthStartIso = (year: number, month: number) =>
  new Date(year, month, 1, 12, 0, 0).toISOString();

/**
 * Month + year chooser for past events (M5a): a queen is remembered as "May
 * 2025", not to the day. A year stepper plus twelve month buttons — no
 * calendar grid, for the same reason task due dates don't have one: calendar
 * cells are far too small for gloves.
 *
 * Future months are disabled: `introduced_at` is always something that
 * already happened, and a future date would compute as a 0-month-old queen.
 */
export function MonthYearPicker({
  value,
  onChange,
}: {
  /** ISO timestamp; only its year and month are meaningful. */
  value: string;
  onChange: (iso: string) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const selected = new Date(value);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const isFuture = (y: number, m: number) => y > thisYear || (y === thisYear && m > thisMonth);

  /** Stepping to a year that makes the chosen month future lands on December. */
  const stepYear = (delta: number) => {
    const nextYear = year + delta;
    if (nextYear > thisYear) return;
    const nextMonth = isFuture(nextYear, month) ? thisMonth : month;
    onChange(monthStartIso(nextYear, nextMonth));
  };

  const yearButton = (delta: number, icon: 'chevron-left' | 'chevron-right') => {
    const disabled = delta > 0 && year >= thisYear;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={icon === 'chevron-left' ? t('dates.prevYear') : t('dates.nextYear')}
        disabled={disabled}
        onPress={() => stepYear(delta)}
        style={[
          styles.yearBtn,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={28} color={tokens.text} />
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View style={styles.yearRow}>
        {yearButton(-1, 'chevron-left')}
        <Text style={[styles.yearText, { color: tokens.text }]}>{year}</Text>
        {yearButton(1, 'chevron-right')}
      </View>
      <View style={styles.monthGrid}>
        {Array.from({ length: 12 }, (_, m) => {
          const active = m === month;
          const disabled = isFuture(year, m);
          return (
            <TouchableOpacity
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onChange(monthStartIso(year, m))}
              style={[
                styles.monthCell,
                {
                  backgroundColor: active ? tokens.primary : tokens.surface,
                  borderColor: active ? tokens.primary : tokens.border,
                  opacity: disabled ? 0.35 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.monthText,
                  { color: active ? tokens.onPrimary : tokens.textMuted },
                ]}
              >
                {formatMonthShort(m)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp(2),
  },
  yearBtn: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: { fontSize: sizes.fontBody, fontWeight: '700', flex: 1, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2), marginTop: sp(3) },
  monthCell: {
    // Four per row: (100% - 3 gaps) / 4, expressed so it survives any width.
    width: '22%',
    flexGrow: 1,
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { fontSize: sizes.fontBody, fontWeight: '600' },
});
