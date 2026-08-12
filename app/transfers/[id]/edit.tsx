import { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Screen } from '@/src/components/Screen';
import { TransferForm } from '@/src/components/TransferForm';
import { hivesRepo, type Hive } from '@/src/db/repos/hivesRepo';
import { transfersRepo, type TransferWithHives } from '@/src/db/repos/transfersRepo';
import { useTheme } from '@/src/theme/useTheme';
import { sizes } from '@/src/theme/tokens';

/**
 * Correct a move — including turning it around if it was recorded backwards.
 * `hiveId` is the hive whose history we opened it from, so the form still
 * asks the question from where the beekeeper is standing.
 *
 * Deleting removes it from BOTH hives at once: one row, one move.
 */
export default function EditTransferScreen() {
  const { id, hiveId } = useLocalSearchParams<{ id: string; hiveId?: string }>();
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const [transfer, setTransfer] = useState<TransferWithHives | null>(null);
  const [hive, setHive] = useState<Hive | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const row = await transfersRepo.getById(id);
      if (cancelled || !row) return;
      setTransfer(row);
      // Fall back to the donor if we arrived without a side (deep link).
      const side = hiveId ?? row.fromHiveId;
      const h = await hivesRepo.getById(side);
      if (!cancelled) setHive(h);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, hiveId]);

  if (!transfer || !hive) return null;

  const confirmDelete = () => {
    Alert.alert(t('transfers.deleteTitle'), t('transfers.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('transfers.delete'),
        style: 'destructive',
        onPress: async () => {
          await transfersRepo.softDelete(transfer.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen
      title={t('transfers.edit')}
      onBack={() => router.back()}
      right={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('transfers.delete')}
          onPress={confirmDelete}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={tokens.text} />
        </TouchableOpacity>
      }
    >
      <TransferForm
        hive={hive}
        initial={transfer}
        onSubmit={async (input) => {
          await transfersRepo.update(transfer.id, input);
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
