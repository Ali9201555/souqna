/**
 * Souqna design tokens — "electric souq" v2.
 *
 * Brand is an electric blue with a violet accent (gradients run tint → accent).
 * Light mode sits white cards on a cool off-white canvas (Zillow-style); dark
 * mode is a deep navy. Components consume tokens only — no raw hex outside
 * this file (one-off `rgba()` overlays excepted).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F7F8FC',
    backgroundElement: '#EEF1F7',
    backgroundSelected: '#E1E7F2',
    textSecondary: '#5C6678',
    tint: '#2563EB',
    /** Deeper brand shade — pressed states, gradient mid-stops. */
    tintDeep: '#1D4ED8',
    /** Soft brand wash — chip/badge backgrounds, active tab pill. */
    tintSoft: '#E9EFFD',
    onTint: '#FFFFFF',
    /** Violet pole of the brand gradient; sparing highlight use. */
    accent: '#7C3AED',
    /** Soft violet wash — secondary chips, decorative fills. */
    accentSoft: '#F1EAFE',
    /** Elevated card background (sits on `background` with a shadow). */
    surface: '#FFFFFF',
    border: '#E4E8F0',
    /** Prices read dark and heavy (Zillow-style), not brand-colored. */
    price: '#0F172A',
    success: '#16A34A',
    danger: '#E11D48',
    warning: '#D97706',
    star: '#F59E0B',
  },
  dark: {
    text: '#F1F4FB',
    background: '#0A0E1A',
    backgroundElement: '#161C2E',
    backgroundSelected: '#232C46',
    textSecondary: '#97A1B8',
    tint: '#5B8CFF',
    tintDeep: '#3E66E8',
    tintSoft: '#15203C',
    onTint: '#FFFFFF',
    accent: '#A78BFA',
    accentSoft: '#221A3E',
    surface: '#131A2C',
    border: '#252E47',
    price: '#F1F4FB',
    success: '#22C55E',
    danger: '#FB7185',
    warning: '#FBBF24',
    star: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Clearance for the floating tab dock — scrollable tab screens add this to
 * their bottom content padding so the last row isn't hidden behind the dock.
 */
export const BottomTabInset = Platform.select({ ios: 88, android: 96 }) ?? 96;
export const MaxContentWidth = 800;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Cross-platform `boxShadow` values (RN 0.76+ supports the CSS syntax on all
 * platforms). Tuned for light surfaces; in dark mode they fade naturally and
 * surfaces rely on `surface` + `border` for definition.
 */
export const Shadow = {
  card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.07)',
  float: '0 12px 32px rgba(15, 23, 42, 0.24)',
  fab: '0 8px 20px rgba(37, 99, 235, 0.45)',
  /** The floating tab dock's lift off the canvas. */
  dock: '0 8px 28px rgba(15, 23, 42, 0.16)',
} as const;

/** Shared spring configs so motion feels consistent app-wide. */
export const Motion = {
  /** Gentle settle — layout-ish moves, heart pop release. */
  spring: { damping: 18, stiffness: 240, mass: 0.7 },
  /** Snappy press feedback. */
  springSnappy: { damping: 22, stiffness: 420, mass: 0.6 },
  /** Playful overshoot — icon pops, FAB, badge entrances. */
  springBouncy: { damping: 13, stiffness: 330, mass: 0.7 },
} as const;
