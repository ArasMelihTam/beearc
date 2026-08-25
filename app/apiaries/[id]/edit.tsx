import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { ApiaryForm } from '@/src/components/ApiaryForm';
import { apiariesRepo, type Apiary } from '@/src/db/repos/apiariesRepo';
import { deleteApiary } from '@/src/logic/status';
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

  /**
   * The same delete as the swipe on the apiary list — kept here too, because
   * this is where you look when you haven't discovered the gesture yet. The
   * hive count goes in the message: deleting a yard deletes its hives.
   */
  const handleDelete = async () => {
    if (!apiary) return;
    const hiveCount = await apiariesRepo.activeHiveCount(apiary.id);
    const message =
      hiveCount > 0
        ? t('apiaries.deleteWithHives', { count: hiveCount })
        : t('apiaries.deleteMessage');
    Alert.alert(t('apiaries.deleteTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteApiary(apiary.id);
          // Jump past the (now deleted) detail screen, back to the list.
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
          accessibilityLabel={t('apiaries.delete')}
          onPress={() => void handleDelete()}
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={tokens.danger} />
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
  deleteButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
