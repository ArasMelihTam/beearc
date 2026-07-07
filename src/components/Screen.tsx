import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Shared screen shell: themed background, safe area, big title.
 * `onBack` shows a 48dp back arrow (stack screens); `right` is an optional
 * header action (e.g. an edit button). Tab screens pass neither.
 */
export function Screen({
  title,
  onBack,
  right,
  children,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView
      // Tab screens: the tab bar owns the bottom edge. Stack screens (with a
      // back arrow) have no tab bar, so they take the bottom inset themselves.
      edges={onBack ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: tokens.background }]}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="back"
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color={tokens.text} />
            </TouchableOpacity>
          ) : null}
          <Text numberOfLines={1} style={[styles.title, { color: tokens.text }]}>
            {title}
          </Text>
          {right}
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

/** Muted centered text for screens that are intentionally empty (for now). */
export function EmptyState({ message }: { message: string }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, { color: tokens.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: sp(4), paddingTop: sp(2) },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: sp(2) },
  backButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: { fontSize: sizes.fontTitle, fontWeight: '700', flexShrink: 1, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sp(6) },
  emptyText: { fontSize: sizes.fontBody, textAlign: 'center', lineHeight: 24 },
});
