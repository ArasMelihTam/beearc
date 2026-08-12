import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Two or three full-width 56dp segments, icon above label (M5b).
 *
 * ChipPicker would do the same job in less space, but this control exists for
 * the one question you must not get backwards — which way did the frames
 * move. Bigger targets, and an icon as well as a word, because color alone
 * never carries meaning here (§5 rule 3).
 */
export function SegmentPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  getLabel,
  getIcon,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  getLabel: (option: T) => string;
  getIcon: (option: T) => IconName;
}) {
  const { tokens } = useTheme();
  return (
    <View>
      <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <TouchableOpacity
              key={option}
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
              <MaterialCommunityIcons
                name={getIcon(option)}
                size={24}
                color={selected ? tokens.onPrimary : tokens.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? tokens.onPrimary : tokens.textMuted },
                ]}
              >
                {getLabel(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  row: { flexDirection: 'row', gap: sp(2) },
  segment: {
    flex: 1,
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(1),
    paddingVertical: sp(2),
    paddingHorizontal: sp(2),
  },
  segmentText: { fontSize: sizes.fontLabel, fontWeight: '700', textAlign: 'center' },
});
