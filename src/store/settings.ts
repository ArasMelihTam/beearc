import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

/**
 * App settings held in memory (Zustand keeps this thin — the DB is the
 * source of truth). NOTE: in-memory only for M1; persisted to the SQLite
 * `settings` table in M2 so choices survive an app restart.
 */
export const useSettings = create<SettingsState>((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
}));
