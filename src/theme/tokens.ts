/**
 * Beearc design tokens — "Nature & Utility" (locked, see master prompt §5).
 * Every color and size in the app comes from here. Never hard-code a hex
 * value or tap-target size in a component.
 */

export type ThemeScheme = 'light' | 'dark';

export interface ThemeTokens {
  primary: string;
  /** Text/icons placed ON a primary (Honey Gold) surface. Dark Umber, never white. */
  onPrimary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  statusHealthy: string;
  statusWarning: string;
  statusUrgent: string;
}

export const themes: Record<ThemeScheme, ThemeTokens> = {
  light: {
    primary: '#D29D30', // Honey Gold
    onPrimary: '#3A200C',
    background: '#F8F7DE', // Parchment (off-white kills glare)
    surface: '#FFFFFF',
    text: '#3A200C', // Dark Umber
    textMuted: '#6B5B4A',
    border: '#E3DEC3',
    statusHealthy: '#7A9E7E', // Sage
    statusWarning: '#C06E52', // Terracotta
    statusUrgent: '#2C3E50', // Slate
  },
  dark: {
    primary: '#D29D30',
    onPrimary: '#3A200C',
    background: '#121212', // Deep Charcoal
    surface: '#1E1E1E',
    text: '#F1EAE0', // warm off-white
    textMuted: '#B3A897',
    border: '#33302B',
    statusHealthy: '#8FB893',
    statusWarning: '#D98B6F',
    statusUrgent: '#8CA6C0',
  },
};

/** Sizes for gloves and sunlight: big targets, big type. */
export const sizes = {
  fontTitle: 28,
  fontBody: 17, // base font — never smaller for body text
  fontLabel: 15,
  tapPrimary: 56, // dp — primary bottom-anchored actions
  tapMin: 48, // dp — minimum for anything tappable
  radius: 12,
} as const;

/** 4dp spacing scale: sp(4) = 16 */
export const sp = (n: number) => n * 4;
