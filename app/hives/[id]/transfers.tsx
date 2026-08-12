import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { transfersRepo, type TransferWithHives } from '@/src/db/repos/transfersRepo';
import { formatAgo, formatDate } from '@/src/i18n/formatDate';
import { directionFor } from '@/src/logic/transfers';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Everything this hive gave or received (M5b). Each row is a single stored
 * move read from this hive's side, so the frame of brood that left K-03 for
 * K-08 appears in both histories saying opposite — and correct — things.
 */
export default function HiveTransfersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [rows, setRows] = useState<TransferWithHives[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    hivesRepo.getById(id).then(setHive);
    transfersRepo.listByHive(id).then(setRows);
  }, [id]);

  useFocusEffect(useCallback(() => load(), [load]));

  if (!hive) return null;

  return (
    <Screen title={`${t('transfers.title')} — ${hive.label}`} onBack={() => router.back()}>
      {rows.length === 0 ? (
        <EmptyState message={t('transfers.empty')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const direction = directionFor(item, hive.id);
            if (!direction) return null; // cannot happen: the query is by hive
            const gave = direction === 'gave';
            return (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push(`/transfers/${item.id}/edit?hiveId=${hive.id}`)}
                style={[
                  styles.card,
                  { backgroundColor: tokens.surface, borderColor: tokens.border },
                ]}
              >
                <View style={styles.headRow}>
                  {/* Icon AND word: which way it went is never color alone. */}
                  <MaterialCommunityIcons
                    name={gave ? 'export' : 'import'}
                    size={22}
                    color={tokens.primary}
                  />
                  <Text style={[styles.item, { color: tokens.text }]}>
                    {item.quantity} × {t(`transferItem.${item.item}`)}
                  </Text>
                </View>
                <Text style={[styles.detailText, { color: tokens.text }]}>
                  {gave
                    ? t('transfers.gaveTo', { hive: item.toLabel })
                    : t('transfers.receivedFrom', { hive: item.fromLabel })}
                </Text>
                <Text style={[styles.detailText, { color: tokens.textMuted }]}>
                  {formatDate(item.transferredAt)} · {formatAgo(item.transferredAt)}
                </Text>
                {item.notes ? (
                  <Text numberOfLines={2} style={[styles.notes, { color: tokens.textMuted }]}>
                    {item.notes}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
      <PrimaryButton
        label={t('transfers.add')}
        icon="plus"
        onPress={() => router.push(`/transfers/new?hiveId=${hive.id}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: sp(3), gap: sp(2), paddingTop: sp(3) },
  card: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    gap: sp(1),
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: sp(2) },
  item: { fontSize: sizes.fontBody, fontWeight: '700', flexShrink: 1 },
  detailText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  notes: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(1) },
});
