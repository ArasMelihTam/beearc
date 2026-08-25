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
  /**
   * Destructive actions ONLY (delete panels and buttons) — never a hive
   * status. Status uses sage/terracotta/slate; red is reserved so that the
   * one colour meaning "this removes something" is never diluted.
   */
  danger: string;
  /** Text/icons placed ON `danger`. Both pairs clear WCAG AA (§5 rule 1). */
  onDanger: string;
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
    danger: '#B3261E', // deep brick red — 6.5:1 with white
    onDanger: '#FFFFFF',
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
    // Dark mode lifts the red the way it lifts every other status colour, so
    // it stays red against charcoal instead of going muddy. Dark Umber on it
    // is 5.2:1; white on a red this light would fail.
    danger: '#E8776E',
    onDanger: '#3A200C',
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
