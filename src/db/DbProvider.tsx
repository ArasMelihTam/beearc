import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useTranslation } from 'react-i18next';
import migrations from '@/drizzle/migrations';
import i18n from '@/src/i18n';
import { useSettings } from '@/src/store/settings';
import { sizes, sp } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import { db } from './client';
import { SETTING_KEYS, settingsRepo } from './repos/settingsRepo';
import { schemaVersion } from './schema';
import { nowIso } from './util';

/** Bump on every new migration; written to the schema_version table (§6). */
const SCHEMA_VERSION = 2; // 2 = M3 inspection factors (density, moisture, pests)

/**
 * Gates the whole app behind two startup steps:
 * 1. Run pending SQL migrations (creates/updates tables on-device, offline).
 * 2. Hydrate saved settings (theme + language) so choices survive restarts.
 * Children render only when both are done — no screen ever sees a missing table.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const [hydrated, setHydrated] = useState(false);
  const { tokens } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    if (!success) return;
    (async () => {
      await db
        .insert(schemaVersion)
        .values({ version: SCHEMA_VERSION, appliedAt: nowIso() })
        .onConflictDoNothing();

      const [theme, lang] = await Promise.all([
        settingsRepo.get(SETTING_KEYS.themeMode),
        settingsRepo.get(SETTING_KEYS.language),
      ]);
      if (theme === 'system' || theme === 'light' || theme === 'dark') {
        useSettings.setState({ themeMode: theme });
      }
      if (lang === 'en' || lang === 'tr') {
        await i18n.changeLanguage(lang);
      }
      setHydrated(true);
    })();
  }, [success]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <Text style={[styles.errorText, { color: tokens.text }]}>{t('db.migrationError')}</Text>
        <Text style={[styles.errorDetail, { color: tokens.textMuted }]}>{error.message}</Text>
      </View>
    );
  }

  if (!hydrated) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sp(6) },
  errorText: { fontSize: sizes.fontBody, fontWeight: '700', textAlign: 'center' },
  errorDetail: { fontSize: sizes.fontLabel, textAlign: 'center', marginTop: sp(2) },
});
