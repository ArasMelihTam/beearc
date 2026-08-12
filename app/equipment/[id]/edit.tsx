import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { EquipmentForm } from '@/src/components/EquipmentForm';
import { Screen } from '@/src/components/Screen';
import { equipmentRepo, type Equipment } from '@/src/db/repos/equipmentRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes } from '@/src/theme/tokens';

/**
 * Correct an equipment entry, or take it off on the day it actually came off
 * rather than today. Editing deliberately does NOT re-run R1: the super was
 * added once, and fixing a typo must not book a second fill check.
 */
export default function EditEquipmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [row, setRow] = useState<Equipment | null>(null);

  useEffect(() => {
    if (!id) return;
    equipmentRepo.getById(id).then(setRow);
  }, [id]);

  if (!row) return null;

  const confirmDelete = () => {
    Alert.alert(t('equipment.deleteTitle'), t('equipment.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('equipment.delete'),
        style: 'destructive',
        onPress: async () => {
          await equipmentRepo.softDelete(row.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      title={t('equipment.edit')}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('equipment.delete')}
          onPress={confirmDelete}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      <EquipmentForm
        initial={row}
        showRemoved
        onSubmit={async (input) => {
          await equipmentRepo.update(row.id, input);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
