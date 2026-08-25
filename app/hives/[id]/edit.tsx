import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { HiveForm } from '@/src/components/HiveForm';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { deleteHive } from '@/src/logic/status';
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

  /**
   * The same delete as the swipe on the hive list, kept here for anyone who
   * hasn't found the gesture. `back()` lands on whichever screen sent us
   * here; the hive detail screen pops itself when its hive is gone.
   */
  const handleDelete = () => {
    if (!hive) return;
    Alert.alert(t('hives.deleteTitle'), t('hives.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteHive(hive.id);
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
          accessibilityLabel={t('hives.delete')}
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={tokens.danger} />
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
  deleteButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
