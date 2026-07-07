import { Image, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { HIVE_TYPES, type HiveType } from '@/src/db/schema';
import { useTheme } from '@/src/theme/useTheme';
import type { ThemeScheme } from '@/src/theme/tokens';
import { sizes, sp } from '@/src/theme/tokens';

/**
 * Original schematic illustrations (drawn for Beearc, GPLv3 like the rest of
 * the project — no external license worries). One variant per theme so lines
 * stay visible on both backgrounds. `require` must get literal paths —
 * Metro bundles assets at build time, so no dynamic strings here.
 */
const IMAGES: Record<HiveType, Record<ThemeScheme, ImageSourcePropType>> = {
  langstroth: {
    light: require('@/assets/hive-types/langstroth-light.png'),
    dark: require('@/assets/hive-types/langstroth-dark.png'),
  },
  dadant: {
    light: require('@/assets/hive-types/dadant-light.png'),
    dark: require('@/assets/hive-types/dadant-dark.png'),
  },
  top_bar: {
    light: require('@/assets/hive-types/top_bar-light.png'),
    dark: require('@/assets/hive-types/top_bar-dark.png'),
  },
  warre: {
    light: require('@/assets/hive-types/warre-light.png'),
    dark: require('@/assets/hive-types/warre-dark.png'),
  },
  traditional: {
    light: require('@/assets/hive-types/traditional-light.png'),
    dark: require('@/assets/hive-types/traditional-dark.png'),
  },
  other: {
    light: require('@/assets/hive-types/other-light.png'),
    dark: require('@/assets/hive-types/other-dark.png'),
  },
};

/**
 * Hive type selector: one full-width card per type with an illustration and
 * an always-visible plain-language description — nothing to hunt for with
 * gloves on. Labels/descriptions live in i18n under hiveType.<value>.
 */
export function HiveTypePicker({
  value,
  onChange,
}: {
  value: HiveType;
  onChange: (v: HiveType) => void;
}) {
  const { tokens, scheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.stack}>
      {HIVE_TYPES.map((type) => {
        const selected = type === value;
        return (
          <TouchableOpacity
            key={type}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(type)}
            style={[
              styles.card,
              {
                backgroundColor: tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
                borderWidth: selected ? 2.5 : 1.5,
              },
            ]}
          >
            <Image source={IMAGES[type][scheme]} style={styles.image} resizeMode="contain" />
            <View style={styles.textCol}>
              <Text style={[styles.label, { color: tokens.text }]}>
                {t(`hiveType.${type}.label`)}
              </Text>
              <Text style={[styles.desc, { color: tokens.textMuted }]}>
                {t(`hiveType.${type}.desc`)}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={selected ? 'radiobox-marked' : 'radiobox-blank'}
              size={26}
              color={selected ? tokens.primary : tokens.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: sp(2) },
  card: {
    minHeight: sizes.tapPrimary,
    borderRadius: sizes.radius,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(3),
    paddingHorizontal: sp(3),
    paddingVertical: sp(3),
  },
  image: { width: 56, height: 56 },
  textCol: { flex: 1, gap: 2 },
  label: { fontSize: sizes.fontBody, fontWeight: '700' },
  desc: { fontSize: sizes.fontLabel, lineHeight: 20 },
});
