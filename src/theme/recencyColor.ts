import type { ThemeTokens } from './tokens';

/**
 * How long ago a hive was inspected, as a color (user request: "just looking
 * at the dates doesn't instantly click").
 *
 * Sage when you were there yesterday, fading through the ordinary muted text
 * color as the days pass, arriving at terracotta once the hive crosses the
 * neglect threshold R6 uses. Two straight segments mixed in RGB, so nothing
 * lands on a hue the design language doesn't already use.
 *
 * The color only ever paints an icon and a line of text that ALSO states the
 * age in words, so it is never the sole signal (§5 rule 3).
 */

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');

const mix = (a: string, b: string, ratio: number): string => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `#${toHex(r1 + (r2 - r1) * ratio)}${toHex(g1 + (g2 - g1) * ratio)}${toHex(
    b1 + (b2 - b1) * ratio
  )}`;
};

/** `staleness` runs 0 (just inspected) → 1 (at or past the threshold). */
export function recencyColor(staleness: number, tokens: ThemeTokens): string {
  const s = Math.min(1, Math.max(0, staleness));
  return s <= 0.5
    ? mix(tokens.statusHealthy, tokens.textMuted, s / 0.5)
    : mix(tokens.textMuted, tokens.statusWarning, (s - 0.5) / 0.5);
}
