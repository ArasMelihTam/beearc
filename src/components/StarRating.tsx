import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * 1–5 stars for the queen's productivity (§6). Like RatingRow, tapping the
 * current value again clears it back to "not rated" — a queen you haven't
 * judged yet must not silently read as one star.
 */
export function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = value !== null && n <= value;
          return (
            <TouchableOpacity
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: value === n }}
              accessibilityLabel={`${label}: ${n}`}
              onPress={() => onChange(value === n ? null : n)}
              style={[
                styles.cell,
                {
                  backgroundColor: filled ? tokens.primary : tokens.surface,
                  borderColor: filled ? tokens.primary : tokens.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={filled ? 'star' : 'star-outline'}
                size={26}
                color={filled ? tokens.onPrimary : tokens.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Fixed-height line so the form never jumps while tapping. */}
      <Text style={[styles.hint, { color: value === null ? tokens.textMuted : tokens.text }]}>
        {value === null ? t('queens.notRated') : `${value} / 5`}
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
  hint: { fontSize: sizes.fontLabel, marginTop: sp(1), minHeight: 20 },
});
