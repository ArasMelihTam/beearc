import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatElapsed } from '@/src/i18n/formatElapsed';
import { staleness } from '@/src/logic/elapsed';
import { recencyColor } from '@/src/theme/recencyColor';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * "Inspected 12 days ago", shaded by how long ago that was (M5d).
 *
 * The words alone don't register when you're scanning forty hives, so the
 * clock and the text fade from sage through grey to terracotta as the hive
 * approaches and passes the neglect threshold. Color is never the only
 * signal — the sentence always says the actual age too (§5 rule 3).
 */
export function RecencyLine({
  inspectedAt,
  overdueDays,
  compact = false,
}: {
  /** null = never inspected. */
  inspectedAt: string | null;
  /** R6's threshold, so the tone follows the beekeeper's own setting. */
  overdueDays: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  if (!inspectedAt) {
    return (
      <View style={styles.row}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={compact ? 15 : 17}
          color={tokens.textMuted}
        />
        <Text
          style={[styles.text, compact && styles.compact, { color: tokens.textMuted }]}
        >
          {t('inspections.neverInspected')}
        </Text>
      </View>
    );
  }

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(inspectedAt).getTime()) / 86_400_000
  );
  const tone = recencyColor(staleness(ageDays, overdueDays), tokens);

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name="clock-outline" size={compact ? 15 : 17} color={tone} />
      <Text numberOfLines={1} style={[styles.text, compact && styles.compact, { color: tone }]}>
        {t('inspections.inspectedAgo', { ago: formatElapsed(t, inspectedAt) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  text: { fontSize: sizes.fontLabel, fontWeight: '600', flexShrink: 1 },
  compact: { fontWeight: '500' },
});
