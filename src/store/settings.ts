import { create } from 'zustand';
import { SETTING_KEYS, settingsRepo } from '@/src/db/repos/settingsRepo';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

/**
 * App settings held in memory (Zustand keeps this thin — the DB is the
 * source of truth). Since M2 every change is also written to the SQLite
 * `settings` table; DbProvider reads it back on startup, so choices
 * survive an app restart and a phone reboot.
 */
export const useSettings = create<SettingsState>((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => {
    set({ themeMode }); // update the UI instantly…
    void settingsRepo.set(SETTING_KEYS.themeMode, themeMode); // …persist in background
  },
}));
