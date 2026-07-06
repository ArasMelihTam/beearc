import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { EmptyState, Screen } from '@/src/components/Screen';
import { useSettings, type ThemeMode } from '@/src/store/settings';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

/** A row of big, glove-friendly choice buttons. Exactly one is selected. */
function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.option,
              {
                backgroundColor: selected ? tokens.primary : tokens.surface,
                borderColor: selected ? tokens.primary : tokens.border,
              },
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                {
                  color: selected ? tokens.onPrimary : tokens.text,
                  fontWeight: selected ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const { tokens } = useTheme();
  const themeMode = useSettings((s) => s.themeMode);
  const setThemeMode = useSettings((s) => s.setThemeMode);

  const currentLanguage = i18n.language.startsWith('tr') ? 'tr' : 'en';

  return (
    <Screen title={t('more.title')}>
      <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
        {t('more.appearance')}
      </Text>
      <OptionRow<ThemeMode>
        value={themeMode}
        onChange={setThemeMode}
        options={[
          { value: 'system', label: t('more.themeSystem') },
          { value: 'light', label: t('more.themeLight') },
          { value: 'dark', label: t('more.themeDark') },
        ]}
      />

      <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
        {t('more.language')}
      </Text>
      <OptionRow
        value={currentLanguage}
        onChange={(lang) => i18n.changeLanguage(lang)}
        options={[
          { value: 'tr', label: t('more.languageTurkish') },
          { value: 'en', label: t('more.languageEnglish') },
        ]}
      />

      <EmptyState
        message={`${t('more.about')}\n${t('more.version')} ${Constants.expoConfig?.version ?? '?'}`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: sizes.fontLabel,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: sp(6),
    marginBottom: sp(2),
  },
  row: { flexDirection: 'row', gap: sp(2) },
  option: {
    flex: 1,
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(2),
  },
  optionLabel: { fontSize: sizes.fontBody },
});
