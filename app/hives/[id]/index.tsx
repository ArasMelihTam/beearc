import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { StatusChip } from '@/src/components/StatusChip';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { inspectionsRepo, type Inspection } from '@/src/db/repos/inspectionsRepo';
import { formatDateTime } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Hive detail (new in M3): header with type + status, then the inspection
 * timeline (newest first), with the big "Add inspection" button anchored at
 * the bottom. Editing the hive moved to the pencil in the header.
 */
export default function HiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [timeline, setTimeline] = useState<Inspection[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      hivesRepo.getById(id).then((h) => {
        // Archived from the edit screen while we were away? Leave quietly.
        if (!h || h.archivedAt) {
          router.back();
          return;
        }
        setHive(h);
      });
      inspectionsRepo.listByHive(id).then(setTimeline);
    }, [id, router])
  );

  if (!hive) return null;

  /** color + icon + label, never color alone (§5 rule 3). */
  const Fact = ({
    icon,
    ok,
    label,
    showAnswer = true,
  }: {
    icon: IconName;
    ok: boolean;
    label: string;
    showAnswer?: boolean;
  }) => (
    <View style={styles.fact}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={ok ? tokens.statusHealthy : tokens.statusWarning}
      />
      <Text
        style={[styles.factText, { color: ok ? tokens.statusHealthy : tokens.statusWarning }]}
      >
        {label}
        {showAnswer ? ` ${ok ? t('inspections.yes') : t('inspections.no')}` : ''}
      </Text>
    </View>
  );

  return (
    <Screen
      title={hive.label}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('hives.edit')}
          onPress={() => router.push(`/hives/${hive.id}/edit`)}
          style={styles.editButton}
        >
          <MaterialCommunityIcons name="pencil" size={24} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      <View style={styles.headerFacts}>
        <Text style={[styles.typeText, { color: tokens.textMuted }]}>
          {t(`hiveType.${hive.hiveType}.label`)}
        </Text>
        <StatusChip status={hive.status} />
      </View>

      {timeline.length === 0 ? (
        <EmptyState message={t('inspections.timelineEmpty')} />
      ) : (
        <FlatList
          data={timeline}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
            >
              <Text style={[styles.cardDate, { color: tokens.text }]}>
                {formatDateTime(item.inspectedAt)}
              </Text>
              <View style={styles.factsRow}>
                <Fact icon="crown-outline" ok={item.queenSeen} label={t('inspections.queenSeen')} />
                <Fact icon="egg-outline" ok={item.eggsSeen} label={t('inspections.eggsSeen')} />
                {item.varroaCount !== null ? (
                  <View style={styles.fact}>
                    <MaterialCommunityIcons name="bug-outline" size={18} color={tokens.text} />
                    <Text style={[styles.factText, { color: tokens.text }]}>
                      {t('inspections.varroa')}: {item.varroaCount}
                    </Text>
                  </View>
                ) : null}
                {/* Pests & disease: only shown when found — cards stay compact. */}
                {item.beetlesSeen ? (
                  <Fact
                    icon="ladybug"
                    ok={false}
                    showAnswer={false}
                    label={t('inspections.beetlesSeen')}
                  />
                ) : null}
                {item.waxMothSeen ? (
                  <Fact
                    icon="butterfly-outline"
                    ok={false}
                    showAnswer={false}
                    label={t('inspections.waxMothSeen')}
                  />
                ) : null}
                {item.diseaseSignsSeen ? (
                  <Fact
                    icon="alert-circle-outline"
                    ok={false}
                    showAnswer={false}
                    label={t('inspections.diseaseSignsSeen')}
                  />
                ) : null}
              </View>
              {item.noteText ? (
                <Text numberOfLines={2} style={[styles.note, { color: tokens.textMuted }]}>
                  {item.noteText}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}

      <PrimaryButton
        label={t('inspections.add')}
        icon="plus"
        onPress={() => router.push(`/inspections/new?hiveId=${hive.id}`)}
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
  headerFacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp(2),
  },
  typeText: { fontSize: sizes.fontLabel },
  list: { paddingTop: sp(3), paddingBottom: sp(3), gap: sp(2) },
  card: {
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    gap: sp(2),
  },
  cardDate: { fontSize: sizes.fontBody, fontWeight: '700' },
  factsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(3) },
  fact: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  factText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  note: { fontSize: sizes.fontLabel, lineHeight: 20 },
});
