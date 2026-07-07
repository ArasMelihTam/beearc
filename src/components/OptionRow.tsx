import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * A row of big, glove-friendly choice buttons. Exactly one is selected.
 * `wrap` lets 4+ options flow onto two lines (used for hive type).
 */
export function OptionRow<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, wrap && styles.wrap]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.option,
              wrap && styles.optionWrap,
              {
                backgroundColor: selected ? tokens.primary : tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                {
                  color: selected ? tokens.onPrimary : tokens.text,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: sp(2) },
  wrap: { flexWrap: 'wrap' },
  option: {
    flex: 1,
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(2),
  },
  // With wrap on, fixed basis ≈ half the row → 2 columns of equal buttons.
  optionWrap: { flexBasis: '47%', flexGrow: 1 },
  optionLabel: { fontSize: sizes.fontBody },
});
