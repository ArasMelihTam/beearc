import { useColorScheme } from 'react-native';
import { useSettings } from '@/src/store/settings';
import { themes, type ThemeScheme, type ThemeTokens } from './tokens';

/**
 * Resolves the active theme: follows the phone's light/dark setting unless
 * the user picked a manual override in More → Appearance.
 */
export function useTheme(): { scheme: ThemeScheme; tokens: ThemeTokens } {
  const systemScheme = useColorScheme(); // what the phone says: 'light' | 'dark' | null
  const mode = useSettings((s) => s.themeMode);
  const scheme: ThemeScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  return { scheme, tokens: themes[scheme] };
}
