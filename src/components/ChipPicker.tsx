import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * A wrap-row of selectable chips (48dp tall) for short option lists,
 * e.g. the varroa count method. Optional: tap the selected chip to clear.
 */
export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  getLabel: (option: T) => string;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? null : option)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? tokens.primary : tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? tokens.onPrimary : tokens.textMuted },
              ]}
            >
              {getLabel(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(2) },
  chip: {
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(3),
  },
  chipText: { fontSize: sizes.fontBody, fontWeight: '600' },
});
