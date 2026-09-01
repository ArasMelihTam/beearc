import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * "How many days?" — quick chips for the usual answers, then ±1 for the odd
 * one (M6c). Same shape as `DueDayPicker`, so it reads the same in the hand.
 *
 * `null` is a real, first-class answer meaning "I don't know / don't remind
 * me". It is NOT zero: a withdrawal period of 0 says the honey is fine
 * immediately, while null says the app has nothing to tell you. Confusing
 * the two would either nag about nothing or imply a harvest is safe on a
 * guess, so they stay distinct all the way down to the rules engine.
 */
export function DayCountStepper({
  label,
  hint,
  value,
  onChange,
  presets,
  max = 180,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  presets: number[];
  max?: number;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const chip = (chipValue: number | null, text: string) => {
    const selected = value === chipValue;
    return (
      <TouchableOpacity
        key={String(chipValue)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(chipValue)}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? tokens.primary : tokens.surface,
            borderColor: selected ? tokens.primary : tokens.border,
          },
        ]}
      >
        <Text style={[styles.chipText, { color: selected ? tokens.onPrimary : tokens.textMuted }]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  const step = (delta: number, icon: 'minus' | 'plus') => {
    const disabled = value === null;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={icon === 'minus' ? t('quantity.less') : t('quantity.more')}
        disabled={disabled}
        onPress={() => onChange(Math.min(max, Math.max(0, (value ?? 0) + delta)))}
        style={[
          styles.stepButton,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={tokens.text} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      {hint ? <Text style={[styles.hint, { color: tokens.textMuted }]}>{hint}</Text> : null}
      <View style={styles.chips}>
        {chip(null, t('days.notSet'))}
        {presets.map((d) => chip(d, t('days.count', { count: d })))}
      </View>
      <View style={styles.stepRow}>
        {step(-1, 'minus')}
        <Text style={[styles.value, { color: value === null ? tokens.textMuted : tokens.text }]}>
          {value === null ? t('days.notSet') : t('days.count', { count: value })}
        </Text>
        {step(1, 'plus')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: sp(4), gap: sp(2) },
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { fontSize: sizes.fontLabel, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2) },
  chip: {
    minHeight: sizes.tapMin,
    justifyContent: 'center',
    paddingHorizontal: sp(3),
    borderRadius: sizes.radius,
    borderWidth: 1.5,
  },
  chipText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: sp(3) },
  stepButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { flex: 1, textAlign: 'center', fontSize: sizes.fontBody, fontWeight: '700' },
});
