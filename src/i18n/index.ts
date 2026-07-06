import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import tr from './locales/tr.json';

/**
 * i18n setup. Rule: no hard-coded user-visible strings anywhere in the app —
 * every string lives in locales/en.json and locales/tr.json.
 * Starts in the phone's language (Turkish if the phone is Turkish, else
 * English); the user can override in More → Language.
 * NOTE: the override is in-memory for M1; persisted via the settings table in M2.
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

export default i18n;
