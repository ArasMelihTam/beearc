import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ChipPicker } from '@/src/components/ChipPicker';
import { nowIso } from '@/src/db/util';
import { formatDueDate } from '@/src/i18n/formatDate';
import { dueInDays } from '@/src/logic/rules';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Quick due-date choices; the ± stepper covers everything in between. */
const QUICK_OFFSETS = ['0', '1', '3', '7'] as const;
type QuickOffset = (typeof QUICK_OFFSETS)[number];

const QUICK_LABEL_KEYS: Record<QuickOffset, string> = {
  '0': 'tasks.dueToday',
  '1': 'tasks.dueTomorrow',
  '3': 'tasks.dueIn3',
  '7': 'tasks.dueIn7',
};

/**
 * Glove-friendly due-date control (extracted for reuse by new + edit
 * screens): big chips for the common cases, a ±1 day stepper for the rest.
 * No calendar picker on purpose — try tapping a calendar cell with gloves.
 *
 * `fixedLabel` shows the task's CURRENT due date until the user touches a
 * control (edit screen: opening the editor must not silently move the date).
 */
export function DueDayPicker({
  dayOffset,
  onChange,
  fixedLabel,
}: {
  dayOffset: number;
  onChange: (days: number) => void;
  fixedLabel?: string | null;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const resolved = fixedLabel ?? formatDueDate(dueInDays(nowIso(), dayOffset));

  const stepperButton = (delta: number, icon: 'minus' | 'plus', disabled: boolean) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? t('tasks.minusDay') : t('tasks.plusDay')}
      disabled={disabled}
      onPress={() => onChange(Math.max(0, dayOffset + delta))}
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
      <Text style={[styles.label, { color: tokens.textMuted }]}>{t('tasks.dueLabel')}</Text>
      <ChipPicker<QuickOffset>
        options={QUICK_OFFSETS}
        value={
          fixedLabel == null && QUICK_OFFSETS.includes(String(dayOffset) as QuickOffset)
            ? (String(dayOffset) as QuickOffset)
            : null
        }
        onChange={(v) => {
          if (v !== null) onChange(Number(v));
        }}
        getLabel={(v) => t(QUICK_LABEL_KEYS[v])}
      />
      <View style={styles.stepperRow}>
        {stepperButton(-1, 'minus', fixedLabel == null && dayOffset === 0)}
        <Text style={[styles.dueText, { color: tokens.text }]}>{resolved}</Text>
        {stepperButton(1, 'plus', false)}
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
  dueText: { fontSize: sizes.fontBody, fontWeight: '700', flex: 1, textAlign: 'center' },
});
