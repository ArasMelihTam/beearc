import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { treatmentsRepo, type Treatment } from '@/src/db/repos/treatmentsRepo';
import { formatAgo, formatDate } from '@/src/i18n/formatDate';
import { applyTreatmentEnded } from '@/src/logic/status';
import { nowIso } from '@/src/db/util';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Treatment log for one hive (M5a). The treatment still on the hive sits at
 * the top with a one-tap "end treatment" — ending it closes the assistant's
 * reminder and schedules the varroa recount that proves it worked (R2).
 */
export default function HiveTreatmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  const load = useCallback(() => {
    if (!id) return;
    hivesRepo.getById(id).then(setHive);
    treatmentsRepo.listByHive(id).then(setTreatments);
  }, [id]);

  useFocusEffect(useCallback(() => load(), [load]));

  if (!hive) return null;

  const active = treatments.find((tr) => tr.endedAt === null) ?? null;
  const finished = treatments.filter((tr) => tr.endedAt !== null);

  const confirmEnd = (treatment: Treatment) => {
    Alert.alert(t('treatments.endTitle'), t('treatments.endMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('treatments.end'),
        onPress: async () => {
          const endedAt = nowIso();
          await treatmentsRepo.setEnded(treatment.id, endedAt);
          // R2: closes the "end treatment" reminder, books the recount.
          await applyTreatmentEnded({ ...treatment, endedAt });
          load();
        },
      },
    ]);
  };

  const activeCard = () => {
    if (!active) return null;
    return (
      <View
        style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.primary }]}
      >
        <Text style={[styles.cardLabel, { color: tokens.textMuted }]}>
          {t('treatments.onHive')}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('treatments.edit')}
          onPress={() => router.push(`/treatments/${active.id}/edit`)}
        >
          <Text style={[styles.product, { color: tokens.text }]}>
            {t(`treatmentProduct.${active.product}`)}
          </Text>
          <View style={styles.detailRow}>
            <View style={styles.detail}>
              <MaterialCommunityIcons name="calendar" size={18} color={tokens.textMuted} />
              <Text style={[styles.detailText, { color: tokens.text }]}>
                {formatDate(active.startedAt)} · {formatAgo(active.startedAt)}
              </Text>
            </View>
            {active.dose ? (
              <View style={styles.detail}>
                <MaterialCommunityIcons name="beaker-outline" size={18} color={tokens.textMuted} />
                <Text style={[styles.detailText, { color: tokens.text }]}>{active.dose}</Text>
              </View>
            ) : null}
          </View>
          {active.notes ? (
            <Text style={[styles.notes, { color: tokens.textMuted }]}>{active.notes}</Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => confirmEnd(active)}
          style={[styles.endButton, { backgroundColor: tokens.primary }]}
        >
          <MaterialCommunityIcons name="check" size={22} color={tokens.onPrimary} />
          <Text style={[styles.endLabel, { color: tokens.onPrimary }]}>{t('treatments.end')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Screen title={`${t('treatments.title')} — ${hive.label}`} onBack={() => router.back()}>
      {treatments.length === 0 ? (
        <EmptyState message={t('treatments.empty')} />
      ) : (
        <FlatList
          data={finished}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {activeCard()}
              {finished.length > 0 ? (
                <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
                  {t('treatments.history')}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push(`/treatments/${item.id}/edit`)}
              style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            >
              <Text style={[styles.product, { color: tokens.text }]}>
                {t(`treatmentProduct.${item.product}`)}
              </Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailText, { color: tokens.textMuted }]}>
                  {formatDate(item.startedAt)} — {formatDate(item.endedAt!)}
                </Text>
                {item.dose ? (
                  <Text style={[styles.detailText, { color: tokens.textMuted }]}>{item.dose}</Text>
                ) : null}
              </View>
              {item.notes ? (
                <Text numberOfLines={2} style={[styles.notes, { color: tokens.textMuted }]}>
                  {item.notes}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
      <PrimaryButton
        label={t('treatments.add')}
        icon="plus"
        onPress={() => router.push(`/treatments/new?hiveId=${hive.id}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: sp(3), gap: sp(2) },
  card: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    gap: sp(2),
    marginTop: sp(3),
  },
  cardLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  product: { fontSize: sizes.fontBody, fontWeight: '700' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(3), marginTop: sp(1) },
  detail: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  detailText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  notes: { fontSize: sizes.fontLabel, lineHeight: 20 },
  endButton: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2),
  },
  endLabel: { fontSize: sizes.fontBody, fontWeight: '700' },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
  },
});
