import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { ApiaryForm } from '@/src/components/ApiaryForm';
import { apiariesRepo, type Apiary } from '@/src/db/repos/apiariesRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes } from '@/src/theme/tokens';

export default function EditApiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [apiary, setApiary] = useState<Apiary | null>(null);

  useEffect(() => {
    if (id) apiariesRepo.getById(id).then(setApiary);
  }, [id]);

  const handleArchive = () => {
    if (!apiary) return;
    Alert.alert(t('apiaries.archiveTitle'), t('apiaries.archiveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.archive'),
        style: 'destructive',
        onPress: async () => {
          const result = await apiariesRepo.archive(apiary.id);
          if (!result.ok) {
            // Data hygiene: an apiary with active hives cannot vanish.
            Alert.alert(t('apiaries.archiveBlocked'));
            return;
          }
          // Jump past the (now archived) detail screen, back to the list.
          router.dismissTo('/(tabs)/hives');
        },
      },
    ]);
  };

  if (!apiary) return null;

  return (
    <Screen
      title={t('apiaries.edit')}
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
      <ApiaryForm
        initial={apiary}
        onSubmit={async (input) => {
          await apiariesRepo.update(apiary.id, input);
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
