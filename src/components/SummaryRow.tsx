import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * A 56dp "headline + open" row (M5a): the hive detail screen uses one per
 * sub-record (queen, treatments, equipment, transfers) so the most important
 * fact — her age, the last treatment, what is on the box — is readable
 * without opening anything, while the whole row is still a glove-sized door
 * into the full history.
 *
 * The value SLIDES sideways (user request 2026-08-12). A hive with four
 * supers, an excluder and a feeder writes a line far wider than a phone, and
 * cutting it off with "…" meant opening a whole screen to read six words.
 * Now a finger drags the line along; a tap anywhere still opens the history,
 * because the text sits inside its own touchable as well as the row's.
 */
export function SummaryRow({
  icon,
  label,
  value,
  valueColor,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  /** Overrides the value color (e.g. terracotta for an aging queen). */
  valueColor?: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={[styles.row, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
    >
      <MaterialCommunityIcons name={icon} size={26} color={tokens.primary} />
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: tokens.textMuted }]}>{label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // A short value must not become draggable dead space, and the row
          // has to stay tappable while the finger is still.
          alwaysBounceHorizontal={false}
          contentContainerStyle={styles.valueScroll}
        >
          <TouchableOpacity accessibilityRole="button" onPress={onPress}>
            <Text style={[styles.value, { color: valueColor ?? tokens.text }]}>{value}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={26} color={tokens.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
  },
  // `minWidth: 0` lets the scrolling column shrink inside the row instead of
  // pushing the chevron off the edge.
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  label: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Room for the last word to clear the chevron when scrolled to the end.
  valueScroll: { paddingRight: sp(2) },
  value: { fontSize: sizes.fontBody, fontWeight: '600' },
});
