import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { RecencyLine } from '@/src/components/RecencyLine';
import { apiariesRepo, type Apiary } from '@/src/db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { getHiveRecency, type HiveRecency } from '@/src/logic/status';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** Apiary detail: its hives, plus header shortcut to edit the apiary. */
export default function ApiaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [apiary, setApiary] = useState<Apiary | null>(null);
  const [hives, setHives] = useState<Hive[]>([]);
  const [recency, setRecency] = useState<HiveRecency>({ lastInspectedAt: {}, overdueDays: 21 });

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const a = await apiariesRepo.getById(id);
        // Archived or deleted while we were away? Leave quietly.
        if (!a || a.archivedAt) {
          router.back();
          return;
        }
        setApiary(a);
        const list = await hivesRepo.listActiveByApiary(id);
        setHives(list);
        // The apiary's latitude decides the season, so every hive here shares
        // one settings lookup.
        setRecency(await getHiveRecency(list, a.latitude));
      })();
    }, [id, router])
  );

  if (!apiary) return null; // one frame while loading; avoids a title flash

  return (
    <Screen
      title={apiary.name}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('apiaries.edit')}
          onPress={() => router.push(`/apiaries/${apiary.id}/edit`)}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={24} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      {hives.length === 0 ? (
        <EmptyState message={t('hives.empty')} />
      ) : (
        <FlatList
          data={hives}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push(`/hives/${item.id}`)}
              style={[
                styles.card,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
            >
              <View style={styles.cardText}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: tokens.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.cardSub, { color: tokens.textMuted }]}>
                  {t(`hiveType.${item.hiveType}.label`)}
                </Text>
                {/* When you last opened this hive, without opening it. */}
                <RecencyLine
                  compact
                  inspectedAt={recency.lastInspectedAt[item.id] ?? null}
                  overdueDays={recency.overdueDays}
                />
              </View>
              <MaterialCommunityIcons name="chevron-right" size={26} color={tokens.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
      <PrimaryButton
        label={t('hives.add')}
        icon="plus"
        onPress={() => router.push(`/hives/new?apiaryId=${apiary.id}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  editButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingTop: sp(3), paddingBottom: sp(3), gap: sp(2) },
  card: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: sizes.fontBody, fontWeight: '700' },
  cardSub: { fontSize: sizes.fontLabel },
});
