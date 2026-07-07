import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Big Yes/No question for gloved hands: label on the left, two 56dp-tall
 * segments on the right. Used for queen_seen / eggs_seen — the two answers
 * every inspection must have (they drive rule R3 in M4).
 */
export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const segment = (option: boolean, text: string) => {
    const selected = value === option;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(option)}
        style={[
          styles.segment,
          {
            backgroundColor: selected ? tokens.primary : tokens.surface,
            borderColor: selected ? tokens.primary : tokens.border,
          },
        ]}
      >
        <Text
          style={[
            styles.segmentText,
            { color: selected ? tokens.onPrimary : tokens.textMuted },
          ]}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: tokens.text }]}>{label}</Text>
      <View style={styles.segments}>
        {segment(true, t('inspections.yes'))}
        {segment(false, t('inspections.no'))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: sp(2),
    marginTop: sp(3),
  },
  label: { fontSize: sizes.fontBody, fontWeight: '600', flexShrink: 1 },
  segments: { flexDirection: 'row', gap: sp(2) },
  segment: {
    minWidth: 76,
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(3),
  },
  segmentText: { fontSize: sizes.fontBody, fontWeight: '700' },
});
