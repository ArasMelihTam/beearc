import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { QueenForm } from '@/src/components/QueenForm';
import { queensRepo, type Queen } from '@/src/db/repos/queensRepo';
import { formatMonthYear } from '@/src/i18n/formatDate';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Introduce a queen. If the colony already has one, saving retires her — so
 * we say that up front, with her dates, before anything is changed.
 */
export default function NewQueenScreen() {
  const { hiveId } = useLocalSearchParams<{ hiveId: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [previous, setPrevious] = useState<Queen | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hiveId) return;
    queensRepo.current(hiveId).then((q) => {
      setPrevious(q);
      setLoaded(true);
    });
  }, [hiveId]);

  if (!hiveId || !loaded) return null;

  return (
    <Screen
      title={previous ? t('queens.replaceTitle') : t('queens.new')}
      onBack={() => router.back()}
    >
      {previous ? (
        <View
          style={[styles.warning, { backgroundColor: tokens.surface, borderColor: tokens.primary }]}
        >
          <MaterialCommunityIcons name="crown-outline" size={26} color={tokens.primary} />
          <Text style={[styles.warningText, { color: tokens.text }]}>
            {t('queens.replaceWarning', { date: formatMonthYear(previous.introducedAt) })}
          </Text>
        </View>
      ) : null}
      <QueenForm
        onSubmit={async (input) => {
          await queensRepo.introduce(hiveId, input);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    padding: sp(3),
    marginTop: sp(3),
  },
  warningText: { fontSize: sizes.fontLabel, lineHeight: 21, flexShrink: 1 },
});
