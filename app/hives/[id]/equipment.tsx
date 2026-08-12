import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { equipmentRepo, type Equipment } from '@/src/db/repos/equipmentRepo';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { nowIso } from '@/src/db/util';
import { formatAgo, formatDate } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * What is on this hive, and what used to be (M5b). The top section is the
 * one that matters in the field — a super, an excluder, a drone trap frame
 * all have to come off again, and "Take off" is one tap from here.
 */
export default function HiveEquipmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [rows, setRows] = useState<Equipment[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    hivesRepo.getById(id).then(setHive);
    equipmentRepo.listByHive(id).then(setRows);
  }, [id]);

  useFocusEffect(useCallback(() => load(), [load]));

  if (!hive) return null;

  const onHive = rows.filter((r) => r.removedAt === null);
  const removed = rows.filter((r) => r.removedAt !== null);

  const confirmRemove = (row: Equipment) => {
    Alert.alert(
      t('equipment.removeTitle'),
      t('equipment.removeMessage', { item: t(`equipmentItem.${row.item}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('equipment.remove'),
          onPress: async () => {
            await equipmentRepo.setRemoved(row.id, nowIso());
            load();
          },
        },
      ]
    );
  };

  const card = (row: Equipment, active: boolean) => (
    <View
      key={row.id}
      style={[
        styles.card,
        { backgroundColor: tokens.surface, borderColor: active ? tokens.primary : tokens.border },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('equipment.edit')}
        onPress={() => router.push(`/equipment/${row.id}/edit`)}
      >
        <Text style={[styles.item, { color: tokens.text }]}>
          {row.quantity} × {t(`equipmentItem.${row.item}`)}
        </Text>
        <View style={styles.detailRow}>
          <View style={styles.detail}>
            <MaterialCommunityIcons name="calendar" size={18} color={tokens.textMuted} />
            <Text style={[styles.detailText, { color: tokens.text }]}>
              {active
                ? `${formatDate(row.addedAt)} · ${formatAgo(row.addedAt)}`
                : `${formatDate(row.addedAt)} — ${formatDate(row.removedAt!)}`}
            </Text>
          </View>
        </View>
        {row.notes ? (
          <Text numberOfLines={2} style={[styles.notes, { color: tokens.textMuted }]}>
            {row.notes}
          </Text>
        ) : null}
      </TouchableOpacity>
      {active ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => confirmRemove(row)}
          style={[styles.removeButton, { backgroundColor: tokens.primary }]}
        >
          <MaterialCommunityIcons name="tray-arrow-up" size={22} color={tokens.onPrimary} />
          <Text style={[styles.removeLabel, { color: tokens.onPrimary }]}>
            {t('equipment.remove')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <Screen title={`${t('equipment.title')} — ${hive.label}`} onBack={() => router.back()}>
      {rows.length === 0 ? (
        <EmptyState message={t('equipment.empty')} />
      ) : (
        <FlatList
          data={removed}
          keyExtractor={(row) => row.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {onHive.length > 0 ? (
                <>
                  <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
                    {t('equipment.onHive')}
                  </Text>
                  {onHive.map((row) => card(row, true))}
                </>
              ) : null}
              {removed.length > 0 ? (
                <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
                  {t('equipment.history')}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => card(item, false)}
        />
      )}
      <PrimaryButton
        label={t('equipment.add')}
        icon="plus"
        onPress={() => router.push(`/equipment/new?hiveId=${hive.id}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: sp(3) },
  card: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    gap: sp(2),
    marginTop: sp(2),
  },
  item: { fontSize: sizes.fontBody, fontWeight: '700' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(3), marginTop: sp(1) },
  detail: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  detailText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  notes: { fontSize: sizes.fontLabel, lineHeight: 20, marginTop: sp(1) },
  removeButton: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2),
  },
  removeLabel: { fontSize: sizes.fontBody, fontWeight: '700' },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
  },
});
