import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { HiveForm } from '@/src/components/HiveForm';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes } from '@/src/theme/tokens';

export default function EditHiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [hive, setHive] = useState<Hive | null>(null);

  useEffect(() => {
    if (id) hivesRepo.getById(id).then(setHive);
  }, [id]);

  const handleArchive = () => {
    if (!hive) return;
    Alert.alert(t('hives.archiveTitle'), t('hives.archiveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.archive'),
        style: 'destructive',
        onPress: async () => {
          await hivesRepo.archive(hive.id);
          router.back();
        },
      },
    ]);
  };

  if (!hive) return null;

  return (
    <Screen
      title={`${t('hives.edit')} — ${hive.label}`}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.archive')}
          onPress={handleArchive}
          style={styles.archiveButton}
        >
          <MaterialCommunityIcons name="archive-outline" size={24} color={tokens.statusWarning} />
        </TouchableOpacity>
      }
    >
      <HiveForm
        initial={hive}
        onSubmit={async (input) => {
          await hivesRepo.update(hive.id, input);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
