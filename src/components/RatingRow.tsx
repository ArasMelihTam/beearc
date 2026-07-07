import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Which set of word anchors to show under the numbers (user decision). */
export type RatingAnchors = 'quality' | 'stores' | 'temperament' | 'density' | 'moisture';

/**
 * 0–5 rating for gloved hands: six big buttons in a row, with the word
 * anchor for the current value shown underneath (e.g. 3 = "Orta / Fair").
 * All ratings are optional — tapping the selected number again clears it
 * back to "not recorded", so skipped fields never store fake zeros.
 */
export function RatingRow({
  label,
  value,
  onChange,
  anchors,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  anchors: RatingAnchors;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <TouchableOpacity
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${n} — ${t(`rating.${anchors}.${n}`)}`}
              onPress={() => onChange(selected ? null : n)}
              style={[
                styles.cell,
                {
                  backgroundColor: selected ? tokens.primary : tokens.surface,
                  borderColor: selected ? tokens.primary : tokens.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: selected ? tokens.onPrimary : tokens.textMuted },
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Fixed-height anchor line so the form never jumps while tapping. */}
      <Text style={[styles.anchor, { color: value === null ? tokens.textMuted : tokens.text }]}>
        {value === null ? t('inspections.notRecorded') : t(`rating.${anchors}.${value}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: sp(4) },
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: sp(2),
  },
  row: { flexDirection: 'row', gap: sp(1) },
  cell: {
    flex: 1,
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: sizes.fontBody, fontWeight: '700' },
  anchor: { fontSize: sizes.fontLabel, marginTop: sp(1), minHeight: 20 },
});
