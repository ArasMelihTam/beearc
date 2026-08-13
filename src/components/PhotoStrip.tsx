import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { photoUri } from '@/src/photos/photoStore';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

const THUMB = 96;

/**
 * Read-only photos on the inspection detail screen (M6). Tapping one opens
 * it full screen, where a frame photo is finally big enough to count cells
 * or spot a queen cell.
 *
 * The viewer is a plain Modal rather than a route: it is a way of looking
 * closer at this screen's own content, not somewhere you navigate to, and
 * the phone's back gesture should close it rather than leave the inspection.
 */
export function PhotoStrip({ fileNames }: { fileNames: string[] }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (fileNames.length === 0) return null;

  const open = openIndex !== null ? fileNames[openIndex] : null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {fileNames.map((fileName, index) => (
          <TouchableOpacity
            key={fileName}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('photos.viewPhoto', { number: index + 1 })}
            onPress={() => setOpenIndex(index)}
          >
            <Image
              source={{ uri: photoUri(fileName) }}
              style={[styles.thumb, { borderColor: tokens.border }]}
              contentFit="cover"
              transition={120}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={open !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenIndex(null)}
        supportedOrientations={['portrait', 'landscape']}
      >
        {/* Tapping the backdrop closes — the expected gesture for a lightbox. */}
        <Pressable style={styles.backdrop} onPress={() => setOpenIndex(null)}>
          {open ? (
            <Image
              source={{ uri: photoUri(open) }}
              style={styles.full}
              contentFit="contain"
              transition={120}
            />
          ) : null}
        </Pressable>

        <View style={styles.viewerBar} pointerEvents="box-none">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={() => setOpenIndex(null)}
            style={styles.closeButton}
            hitSlop={{ top: sp(2), bottom: sp(2), left: sp(2), right: sp(2) }}
          >
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {openIndex !== null && fileNames.length > 1 ? (
            <Text style={styles.counter}>
              {t('photos.counter', { current: openIndex + 1, total: fileNames.length })}
            </Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  strip: { gap: sp(2), paddingVertical: sp(2), paddingRight: sp(2) },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: sizes.radius,
    borderWidth: 1,
  },
  // Deliberately not a theme token: a lightbox is black in both themes, the
  // same way a photo is a photo. Same reasoning as the queen mark colors.
  backdrop: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '100%' },
  viewerBar: {
    position: 'absolute',
    top: sp(12),
    left: sp(4),
    right: sp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: sizes.tapMin,
    height: sizes.tapMin,
    borderRadius: sizes.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counter: { color: '#FFFFFF', fontSize: sizes.fontLabel, fontWeight: '700' },
});
