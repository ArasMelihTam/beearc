import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import type { HiveStatus } from '@/src/db/schema';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** §5 rule 3 — never color alone: every status shows color + icon + label. */
const STATUS_ICONS: Record<HiveStatus, IconName> = {
  healthy: 'check-circle',
  warning: 'alert-circle',
  urgent: 'alert-octagon',
};

export function StatusChip({ status }: { status: HiveStatus }) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const color = {
    healthy: tokens.statusHealthy,
    warning: tokens.statusWarning,
    urgent: tokens.statusUrgent,
  }[status];

  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons name={STATUS_ICONS[status]} size={20} color={color} />
      <Text style={[styles.label, { color }]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  label: { fontSize: sizes.fontLabel, fontWeight: '700' },
});
