import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { QUEEN_MARK_COLORS, type QueenMarkColor } from '@/src/logic/queens';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * The five paint colors as they look on a queen's thorax.
 *
 * These are deliberately NOT theme tokens: they are physical objects the
 * beekeeper is holding (a red paint pen is red in both themes), the same way
 * the hive-type illustrations are pictures of real hives. They live here, in
 * one place, and no screen ever writes a hex value itself.
 */
export const MARK_COLOR_SWATCH: Record<QueenMarkColor, string> = {
  white: '#FFFFFF',
  yellow: '#F2C300',
  red: '#C62828',
  green: '#2E7D32',
  blue: '#1565C0',
};

/** The painted dot — always accompanied by the color's NAME (§5 rule 3). */
export function MarkColorDot({ color, size = 18 }: { color: QueenMarkColor; size?: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: MARK_COLOR_SWATCH[color],
        // Every dot is outlined so white stays visible on a white card.
        borderWidth: 1.5,
        borderColor: tokens.textMuted,
      }}
    />
  );
}

/**
 * Queen marking color, plus "unmarked" (many queens simply aren't marked).
 * Color is never the only signal — each chip shows the dot AND the name.
 */
export function MarkColorPicker({
  value,
  onChange,
}: {
  value: QueenMarkColor | null;
  onChange: (v: QueenMarkColor | null) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <View style={styles.wrap}>
      {QUEEN_MARK_COLORS.map((color) => {
        const selected = value === color;
        return (
          <TouchableOpacity
            key={color}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(color)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? tokens.primary : tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
              },
            ]}
          >
            <MarkColorDot color={color} />
            <Text
              style={[styles.chipText, { color: selected ? tokens.onPrimary : tokens.textMuted }]}
            >
              {t(`markColor.${color}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        onPress={() => onChange(null)}
        style={[
          styles.chip,
          {
            backgroundColor: value === null ? tokens.primary : tokens.surface,
            borderColor: value === null ? tokens.primary : tokens.border,
          },
        ]}
      >
        <Text
          style={[styles.chipText, { color: value === null ? tokens.onPrimary : tokens.textMuted }]}
        >
          {t('queens.unmarked')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2) },
  chip: {
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingHorizontal: sp(3),
  },
  chipText: { fontSize: sizes.fontBody, fontWeight: '600' },
});
