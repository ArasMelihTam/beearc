import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { apiariesRepo, type ApiaryWithHiveCount } from '@/src/db/repos/apiariesRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Hives tab entry: the list of apiaries (locations). Tapping one opens its
 * hive list. `useFocusEffect` re-reads the DB every time the screen comes
 * back into view, so a new apiary appears the moment you return from the form.
 */
export default function ApiaryListScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<ApiaryWithHiveCount[]>([]);

  useFocusEffect(
    useCallback(() => {
      apiariesRepo.listActive().then(setItems);
    }, [])
  );

  return (
    <Screen title={t('apiaries.title')}>
      {items.length === 0 ? (
        <EmptyState message={t('apiaries.empty')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push(`/apiaries/${item.id}`)}
              style={[
                styles.card,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
            >
              <View style={styles.cardText}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: tokens.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.cardSub, { color: tokens.textMuted }]}>
                  {t('apiaries.hiveCount', { count: item.hiveCount })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={28} color={tokens.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
      <PrimaryButton
        label={t('apiaries.add')}
        icon="plus"
        onPress={() => router.push('/apiaries/new')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: sp(3), paddingBottom: sp(3), gap: sp(2) },
  card: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: sizes.fontBody, fontWeight: '700' },
  cardSub: { fontSize: sizes.fontLabel },
});
