import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Apiary, ApiaryInput } from '@/src/db/repos/apiariesRepo';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { sp } from '@/src/theme/tokens';

/**
 * Shared create/edit form for an apiary. Validates, then hands a clean
 * ApiaryInput to the parent screen — the form never touches the DB itself.
 */
export function ApiaryForm({
  initial,
  onSubmit,
}: {
  initial?: Apiary;
  onSubmit: (input: ApiaryInput) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [latitude, setLatitude] = useState(initial?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(initial?.longitude?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('apiaries.nameRequired'));
      return;
    }
    // Coordinates are optional, but if given they must be plausible.
    // parseFloat needs a dot; Turkish keyboards produce commas — accept both.
    const lat = latitude.trim() ? parseFloat(latitude.replace(',', '.')) : null;
    const lng = longitude.trim() ? parseFloat(longitude.replace(',', '.')) : null;
    const latBad = lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90);
    const lngBad = lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180);
    if (latBad || lngBad) {
      Alert.alert(t('apiaries.latLngInvalid'));
      return;
    }
    onSubmit({ name, latitude: lat, longitude: lng, notes: notes || null });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <FormField
          label={t('apiaries.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('apiaries.namePlaceholder')}
        />
        <FormField
          label={t('apiaries.latitude')}
          value={latitude}
          onChangeText={setLatitude}
          placeholder="39.9255"
          keyboardType="numbers-and-punctuation"
        />
        <FormField
          label={t('apiaries.longitude')}
          value={longitude}
          onChangeText={setLongitude}
          placeholder="32.8663"
          keyboardType="numbers-and-punctuation"
        />
        <FormField label={t('apiaries.notes')} value={notes} onChangeText={setNotes} multiline />
      </ScrollView>
      <PrimaryButton label={t('common.save')} icon="check" onPress={handleSave} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: sp(4) },
});
