/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    tint: '#0E8F6E',
    /** Deeper brand shade — gradient end, pressed states. */
    tintDeep: '#0A6B53',
    /** Soft brand wash — chip/badge backgrounds, active tab pill. */
    tintSoft: '#E7F4EF',
    onTint: '#FFFFFF',
    /** Elevated card background (sits on `background` with a shadow). */
    surface: '#FFFFFF',
    border: '#E6E8EB',
    price: '#0E8F6E',
    success: '#16A34A',
    danger: '#DC2626',
    warning: '#D97706',
    star: '#F59E0B',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0B0B0C',
    backgroundElement: '#1A1B1E',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: '#2BB893',
    tintDeep: '#15745D',
    tintSoft: '#11302A',
    onTint: '#04201A',
    surface: '#17181B',
    border: '#2A2C30',
    price: '#2BB893',
    success: '#22C55E',
    danger: '#F87171',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Cross-platform `boxShadow` values (RN 0.76+ supports the CSS syntax on all
 * platforms). Tuned for light surfaces; in dark mode they fade naturally and
 * surfaces rely on `surface` + `border` for definition.
 */
export const Shadow = {
  card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 6px 18px rgba(16, 24, 40, 0.08)',
  float: '0 10px 28px rgba(16, 24, 40, 0.22)',
  fab: '0 6px 18px rgba(14, 143, 110, 0.42)',
} as const;

/** Shared spring configs so motion feels consistent app-wide. */
export const Motion = {
  /** Gentle settle — layout-ish moves, heart pop release. */
  spring: { damping: 18, stiffness: 240, mass: 0.7 },
  /** Snappy press feedback. */
  springSnappy: { damping: 22, stiffness: 420, mass: 0.6 },
} as const;
