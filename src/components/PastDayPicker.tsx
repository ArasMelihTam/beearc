import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { subDays } from 'date-fns';
import { ChipPicker } from '@/src/components/ChipPicker';
import { formatDate } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Quick choices; the ± stepper covers everything in between. */
const QUICK_OFFSETS = ['0', '1', '3', '7'] as const;
type QuickOffset = (typeof QUICK_OFFSETS)[number];

const QUICK_LABEL_KEYS: Record<QuickOffset, string> = {
  '0': 'dates.today',
  '1': 'dates.yesterday',
  '3': 'dates.days3Ago',
  '7': 'dates.weekAgo',
};

/** ISO timestamp `daysAgo` days before now (0 = right now). */
export const daysAgoIso = (daysAgo: number): string =>
  subDays(new Date(), Math.max(0, daysAgo)).toISOString();

/**
 * The past-facing twin of DueDayPicker (M5a): when did you put the treatment
 * on? Usually today, sometimes a few days ago. Same shape as the due-date
 * control so the two feel like one control learned twice, and no calendar.
 *
 * `fixedLabel` shows a record's CURRENT date until the user touches a
 * control, so opening an editor never silently moves the date.
 */
export function PastDayPicker({
  label,
  daysAgo,
  onChange,
  fixedLabel,
}: {
  label: string;
  daysAgo: number;
  onChange: (days: number) => void;
  fixedLabel?: string | null;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const resolved = fixedLabel ?? formatDate(daysAgoIso(daysAgo));

  const stepperButton = (delta: number, icon: 'minus' | 'plus', disabled: boolean) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? t('dates.dayEarlier') : t('dates.dayLater')}
      disabled={disabled}
      onPress={() => onChange(Math.max(0, daysAgo + delta))}
      style={[
        styles.stepBtn,
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

  return (
    <View>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <ChipPicker<QuickOffset>
        options={QUICK_OFFSETS}
        value={
          fixedLabel == null && QUICK_OFFSETS.includes(String(daysAgo) as QuickOffset)
            ? (String(daysAgo) as QuickOffset)
            : null
        }
        onChange={(v) => {
          if (v !== null) onChange(Number(v));
        }}
        getLabel={(v) => t(QUICK_LABEL_KEYS[v])}
      />
      <View style={styles.stepperRow}>
        {/* Left button moves BACK in time, matching the arrow's direction on
            a timeline: minus = one day further into the past. */}
        {stepperButton(1, 'minus', false)}
        <Text style={[styles.dateText, { color: tokens.text }]}>{resolved}</Text>
        {stepperButton(-1, 'plus', fixedLabel == null && daysAgo === 0)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
    marginBottom: sp(2),
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(3),
    gap: sp(2),
  },
  stepBtn: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: { fontSize: sizes.fontBody, fontWeight: '700', flex: 1, textAlign: 'center' },
});
