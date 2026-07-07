import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Hive, HiveInput } from '@/src/db/repos/hivesRepo';
import { type HiveType } from '@/src/db/schema';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';
import { FormField } from './FormField';
import { HiveTypePicker } from './HiveTypePicker';
import { PrimaryButton } from './PrimaryButton';

/** Shared create/edit form for a hive. Same pattern as ApiaryForm. */
export function HiveForm({
  initial,
  onSubmit,
}: {
  initial?: Hive;
  onSubmit: (input: HiveInput) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [hiveType, setHiveType] = useState<HiveType>(initial?.hiveType ?? 'langstroth');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    if (!label.trim()) {
      Alert.alert(t('hives.labelRequired'));
      return;
    }
    onSubmit({ label, hiveType, notes: notes || null });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <FormField
          label={t('hives.label')}
          value={label}
          onChangeText={setLabel}
          placeholder={t('hives.labelPlaceholder')}
          autoCapitalize="characters"
        />
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{t('hives.type')}</Text>
        <HiveTypePicker value={hiveType} onChange={setHiveType} />
        <FormField label={t('hives.notes')} value={notes} onChangeText={setNotes} multiline />
      </ScrollView>
      <PrimaryButton label={t('common.save')} icon="check" onPress={handleSave} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: sp(4) },
  sectionLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(4),
    marginBottom: sp(2),
  },
});
