import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import tr from './locales/tr.json';

/**
 * i18n setup. Rule: no hard-coded user-visible strings anywhere in the app —
 * every string lives in locales/en.json and locales/tr.json.
 * Starts in the phone's language (Turkish if the phone is Turkish, else
 * English); the user can override in More → Language. Since M2 the override
 * is saved to the settings table (see setAppLanguage) and restored by
 * DbProvider on startup.
 */
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: deviceLanguage === 'tr' ? 'tr' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes output
});

export type AppLanguage = 'en' | 'tr';

/** Switch language AND persist the choice so it survives a restart. */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  // Imported lazily to keep this module free of a hard DB dependency at init.
  const { settingsRepo, SETTING_KEYS } = await import('@/src/db/repos/settingsRepo');
  await settingsRepo.set(SETTING_KEYS.language, lang);
}

export default i18n;
