import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { StatusChip } from '@/src/components/StatusChip';
import { apiariesRepo, type Apiary } from '@/src/db/repos/apiariesRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
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

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      apiariesRepo.getById(id).then((a) => {
        // Archived or deleted while we were away? Leave quietly.
        if (!a || a.archivedAt) {
          router.back();
          return;
        }
        setApiary(a);
      });
      hivesRepo.listActiveByApiary(id).then(setHives);
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
              </View>
              <StatusChip status={item.status} />
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
