import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * The big bottom-anchored action (§5): 56dp tall, Honey Gold,
 * Dark Umber text — never white on gold.
 */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: tokens.primary, opacity: disabled ? 0.5 : 1 }]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={24} color={tokens.onPrimary} /> : null}
      <Text style={[styles.label, { color: tokens.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2),
    marginTop: 'auto',
    marginBottom: sp(3),
  },
  label: { fontSize: sizes.fontBody, fontWeight: '700' },
});
