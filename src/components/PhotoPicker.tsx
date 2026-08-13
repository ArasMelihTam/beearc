import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { importPhoto, photoUri } from '@/src/photos/photoStore';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

const THUMB = 96;

/**
 * Attach photos to an inspection (M6).
 *
 * Each picked photo is resized, compressed and written to permanent storage
 * immediately, and only its file name is handed back to the form. That means
 * a photo survives the app being killed mid-entry — which, standing in a
 * field with one hand full of smoker, happens. Removing a photo here only
 * drops it from the list; the file is cleaned up by the startup sweep if the
 * inspection is never saved. Deleting the file on the spot would destroy the
 * photo of anyone who removes one and then backs out of the edit.
 */
export function PhotoPicker({
  fileNames,
  onChange,
}: {
  fileNames: string[];
  onChange: (fileNames: string[]) => void;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [busy, setBusy] = useState(false);

  const add = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setBusy(true);
    try {
      const imported: string[] = [];
      for (const asset of assets) {
        imported.push(await importPhoto(asset));
      }
      onChange([...fileNames, ...imported]);
    } catch {
      Alert.alert(t('photos.importFailed'));
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('photos.cameraDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) await add(result.assets);
  };

  const fromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('photos.libraryDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) await add(result.assets);
  };

  const choose = () => {
    Alert.alert(t('photos.addTitle'), undefined, [
      { text: t('photos.takePhoto'), onPress: fromCamera },
      { text: t('photos.chooseFromLibrary'), onPress: fromLibrary },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const remove = (fileName: string) => {
    Alert.alert(t('photos.removeTitle'), t('photos.removeMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('photos.remove'),
        style: 'destructive',
        onPress: () => onChange(fileNames.filter((name) => name !== fileName)),
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>
        {t('photos.section')}
      </Text>

      {fileNames.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {fileNames.map((fileName) => (
            <View key={fileName}>
              <Image
                source={{ uri: photoUri(fileName) }}
                style={[styles.thumb, { borderColor: tokens.border }]}
                contentFit="cover"
                transition={120}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('photos.remove')}
                onPress={() => remove(fileName)}
                // The tap target is bigger than the badge it draws: gloves.
                hitSlop={{ top: sp(3), bottom: sp(3), left: sp(3), right: sp(3) }}
                style={[styles.removeBadge, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              >
                <MaterialCommunityIcons name="close" size={20} color={tokens.text} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={choose}
        disabled={busy}
        style={[
          styles.addButton,
          { backgroundColor: tokens.surface, borderColor: tokens.border, opacity: busy ? 0.5 : 1 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={tokens.primary} />
        ) : (
          <MaterialCommunityIcons name="camera-plus-outline" size={24} color={tokens.primary} />
        )}
        <Text style={[styles.addLabel, { color: tokens.text }]}>
          {busy ? t('photos.importing') : t('photos.add')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: sp(4) },
  sectionLabel: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: sp(2),
  },
  strip: { gap: sp(2), paddingRight: sp(2), paddingTop: sp(2), paddingBottom: sp(3) },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: sizes.radius,
    borderWidth: 1,
  },
  removeBadge: {
    position: 'absolute',
    top: -sp(2),
    right: -sp(2),
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2),
  },
  addLabel: { fontSize: sizes.fontBody, fontWeight: '600' },
});
