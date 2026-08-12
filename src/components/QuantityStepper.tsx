import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * "How many?" for gloved hands (M5b): two 48dp buttons around a big number,
 * no keyboard. Nobody moves 40 frames at once, so a stepper beats typing —
 * and it can never produce a zero or a stray letter.
 */
export function QuantityStepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const button = (delta: number, icon: 'minus' | 'plus', disabled: boolean) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? t('quantity.less') : t('quantity.more')}
      disabled={disabled}
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      style={[
        styles.button,
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
      <View style={styles.row}>
        {button(-1, 'minus', value <= min)}
        <Text
          accessibilityLabel={`${label}: ${value}`}
          style={[styles.value, { color: tokens.text }]}
        >
          {value}
        </Text>
        {button(1, 'plus', value >= max)}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sp(2) },
  button: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: sizes.fontTitle, fontWeight: '700', flex: 1, textAlign: 'center' },
});
