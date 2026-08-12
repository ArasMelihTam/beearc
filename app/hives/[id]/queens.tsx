import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EmptyState, Screen } from '@/src/components/Screen';
import { MarkColorDot } from '@/src/components/MarkColorPicker';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { queensRepo, type Queen } from '@/src/db/repos/queensRepo';
import { formatMonthYear } from '@/src/i18n/formatDate';
import { formatQueenAge } from '@/src/i18n/formatQueen';
import { isQueenAging, parseMarkColor, queenAgeMonths } from '@/src/logic/queens';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Queen tracker for one hive (M5a): the reigning queen in full at the top,
 * then every queen before her. Age is computed from her introduction date on
 * every render — nothing about her age is ever stored (§6).
 */
export default function HiveQueensScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);
  const [queens, setQueens] = useState<Queen[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      hivesRepo.getById(id).then(setHive);
      queensRepo.listByHive(id).then(setQueens);
    }, [id])
  );

  if (!hive) return null;

  const current = queens.find((q) => q.replacedAt === null) ?? null;
  const past = queens.filter((q) => q.replacedAt !== null);

  /** Mark color as dot + name, or the word "unmarked" — never color alone. */
  const MarkLabel = ({ queen, muted }: { queen: Queen; muted?: boolean }) => {
    const color = parseMarkColor(queen.markColor);
    const textColor = muted ? tokens.textMuted : tokens.text;
    if (!color) {
      return (
        <Text style={[styles.detailText, { color: textColor }]}>{t('queens.unmarked')}</Text>
      );
    }
    return (
      <View style={styles.detail}>
        <MarkColorDot color={color} />
        <Text style={[styles.detailText, { color: textColor }]}>{t(`markColor.${color}`)}</Text>
      </View>
    );
  };

  const Stars = ({ score }: { score: number }) => (
    <View style={styles.detail}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons
          key={n}
          name={n <= score ? 'star' : 'star-outline'}
          size={18}
          color={n <= score ? tokens.primary : tokens.textMuted}
        />
      ))}
    </View>
  );

  const currentCard = () => {
    if (!current) {
      return <EmptyState message={t('queens.noneCurrent')} />;
    }
    const aging = isQueenAging(queenAgeMonths(current.introducedAt, new Date().toISOString()));
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push(`/queens/${current.id}/edit`)}
        style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.primary }]}
      >
        <Text style={[styles.cardLabel, { color: tokens.textMuted }]}>{t('queens.current')}</Text>
        <Text style={[styles.age, { color: tokens.text }]}>
          {formatQueenAge(t, current.introducedAt)}
        </Text>
        <View style={styles.detailRow}>
          <View style={styles.detail}>
            <MaterialCommunityIcons name="calendar" size={18} color={tokens.textMuted} />
            <Text style={[styles.detailText, { color: tokens.text }]}>
              {formatMonthYear(current.introducedAt)}
            </Text>
          </View>
          <View style={styles.detail}>
            <MaterialCommunityIcons name="crown-outline" size={18} color={tokens.textMuted} />
            <Text style={[styles.detailText, { color: tokens.text }]}>
              {t(`queenOrigin.${current.origin}`)}
            </Text>
          </View>
          <MarkLabel queen={current} />
          {current.productivityScore !== null ? (
            <Stars score={current.productivityScore} />
          ) : null}
        </View>
        {aging ? (
          <View style={styles.detail}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={tokens.statusWarning}
            />
            <Text style={[styles.agingText, { color: tokens.statusWarning }]}>
              {t('queens.agingHint')}
            </Text>
          </View>
        ) : null}
        {current.notes ? (
          <Text style={[styles.notes, { color: tokens.textMuted }]}>{current.notes}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Screen title={`${t('queens.title')} — ${hive.label}`} onBack={() => router.back()}>
      <FlatList
        data={past}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {currentCard()}
            {past.length > 0 ? (
              <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
                {t('queens.history')}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push(`/queens/${item.id}/edit`)}
            style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          >
            <Text style={[styles.pastRange, { color: tokens.text }]}>
              {formatMonthYear(item.introducedAt)} — {formatMonthYear(item.replacedAt!)}
            </Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailText, { color: tokens.textMuted }]}>
                {t(`queenOrigin.${item.origin}`)}
              </Text>
              <MarkLabel queen={item} muted />
              {item.productivityScore !== null ? <Stars score={item.productivityScore} /> : null}
            </View>
          </TouchableOpacity>
        )}
      />
      <PrimaryButton
        label={current ? t('queens.replace') : t('queens.add')}
        icon="plus"
        onPress={() => router.push(`/queens/new?hiveId=${hive.id}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: sp(3), gap: sp(2) },
  header: { gap: sp(2) },
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
  age: { fontSize: sizes.fontTitle, fontWeight: '700' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(3) },
  detail: { flexDirection: 'row', alignItems: 'center', gap: sp(1) },
  detailText: { fontSize: sizes.fontLabel, fontWeight: '600' },
  agingText: { fontSize: sizes.fontLabel, fontWeight: '600', flexShrink: 1, lineHeight: 20 },
  notes: { fontSize: sizes.fontLabel, lineHeight: 20 },
  pastRange: { fontSize: sizes.fontBody, fontWeight: '700' },
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
  },
});
