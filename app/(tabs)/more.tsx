import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { EmptyState, Screen } from '@/src/components/Screen';
import { OptionRow } from '@/src/components/OptionRow';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { seedSampleData } from '@/src/db/seed';
import { setAppLanguage, type AppLanguage } from '@/src/i18n';
import { useSettings, type ThemeMode } from '@/src/store/settings';
import { useTheme } from '@/src/theme/useTheme';
import { sizes, sp } from '@/src/theme/tokens';

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const { tokens } = useTheme();
  const router = useRouter();
  const themeMode = useSettings((s) => s.themeMode);
  const setThemeMode = useSettings((s) => s.setThemeMode);

  const currentLanguage: AppLanguage = i18n.language.startsWith('tr') ? 'tr' : 'en';

  const handleSeed = async () => {
    const seeded = await seedSampleData();
    Alert.alert(seeded ? t('more.devSeedDone') : t('more.devSeedSkipped'));
  };

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
      <OptionRow<AppLanguage>
        value={currentLanguage}
        onChange={(lang) => void setAppLanguage(lang)}
        options={[
          { value: 'tr', label: t('more.languageTurkish') },
          { value: 'en', label: t('more.languageEnglish') },
        ]}
      />

      <Text style={[styles.sectionHeader, { color: tokens.textMuted }]}>
        {t('more.assistant')}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push('/rules-settings')}
        style={[styles.navRow, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
      >
        <MaterialCommunityIcons name="tune" size={24} color={tokens.text} />
        <Text style={[styles.navRowLabel, { color: tokens.text }]}>
          {t('rulesSettings.title')}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color={tokens.textMuted} />
      </TouchableOpacity>

      <EmptyState
        message={`${t('more.about')}\n${t('more.version')} ${Constants.expoConfig?.version ?? '?'}`}
      />

      {/* __DEV__ is true only while developing — testers/users never see this */}
      {__DEV__ ? (
        <PrimaryButton label={t('more.devSeed')} icon="database-plus" onPress={handleSeed} />
      ) : null}
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
  navRow: {
    minHeight: sizes.tapMin,
    borderRadius: sizes.radius,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingHorizontal: sp(3),
  },
  navRowLabel: { flex: 1, fontSize: sizes.fontBody, fontWeight: '600' },
});
