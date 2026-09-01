import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * The bell (M6d): should the phone ring on the due date?
 *
 * Muting changes NOTHING about the task itself — it still sits on Today, it
 * still needs checking off, the assistant still tracks it. This is only
 * about being interrupted. Plenty of beekeeping chores are things you want
 * to see when you next look at the app, not things worth a buzz in your
 * pocket at nine in the morning.
 *
 * Bell-off is deliberately loud in the UI (terracotta, struck-through icon,
 * an explicit label): a silently silenced reminder is exactly the kind of
 * setting you forget you changed and then blame the app for.
 */
export function NotifyToggle({
  value,
  onChange,
  hint,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const color = value ? tokens.primary : tokens.statusWarning;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={t(value ? 'notify.on' : 'notify.off')}
        onPress={() => onChange(!value)}
        style={[styles.row, { backgroundColor: tokens.surface, borderColor: color }]}
      >
        <MaterialCommunityIcons
          name={value ? 'bell-outline' : 'bell-off-outline'}
          size={26}
          color={color}
        />
        <Text style={[styles.label, { color: tokens.text }]}>
          {t(value ? 'notify.on' : 'notify.off')}
        </Text>
        <MaterialCommunityIcons
          name={value ? 'toggle-switch' : 'toggle-switch-off-outline'}
          size={34}
          color={color}
        />
      </TouchableOpacity>
      {hint ? <Text style={[styles.hint, { color: tokens.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: sp(4), gap: sp(1) },
  row: {
    minHeight: sizes.tapPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    paddingHorizontal: sp(3),
    borderRadius: sizes.radius,
    borderWidth: 1.5,
  },
  label: { flex: 1, fontSize: sizes.fontBody, fontWeight: '600' },
  hint: { fontSize: sizes.fontLabel, lineHeight: 20 },
});
