import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Multi-select sibling of ChipPicker (M4b): tap to toggle any number of
 * chips. Selected chips show a check icon — never color alone (§5 rule 3).
 * Used for "one task on several hives" (equalizing, feeding rounds, …).
 */
export function MultiChipPicker<T extends string>({
  options,
  values,
  onChange,
  getLabel,
}: {
  options: readonly T[];
  values: T[];
  onChange: (v: T[]) => void;
  getLabel: (option: T) => string;
}) {
  const { tokens } = useTheme();
  const toggle = (option: T) =>
    onChange(
      values.includes(option) ? values.filter((v) => v !== option) : [...values, option]
    );

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => toggle(option)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? tokens.primary : tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
              },
            ]}
          >
            {selected ? (
              <MaterialCommunityIcons name="check" size={18} color={tokens.onPrimary} />
            ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(1),
    paddingHorizontal: sp(3),
  },
  chipText: { fontSize: sizes.fontBody, fontWeight: '600' },
});
