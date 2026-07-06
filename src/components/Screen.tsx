import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Shared screen shell: themed background, safe area, big title. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: tokens.background }]}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
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
  title: { fontSize: sizes.fontTitle, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sp(6) },
  emptyText: { fontSize: sizes.fontBody, textAlign: 'center', lineHeight: 24 },
});
