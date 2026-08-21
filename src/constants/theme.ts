/**
 * Mailmark design tokens.
 *
 * The palettes mirror the two themes that ship on mailmark.dev: `clean-white`
 * (the product default — warm paper, ink, terracotta) and `enterprise-dark`
 * (slate surfaces). The dark palette keeps a lightened terracotta accent so the
 * brand colour survives the switch instead of turning blue mid-app.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#ece7df',
    backgroundElement: '#e2dbd0',
    backgroundSelected: '#d8d0c2',
    surface: '#e2dbd0',
    surfaceRaised: '#fbf9f4',
    inputBackground: '#fbf9f4',
    border: '#d3cabb',
    borderStrong: '#beb5a1',
    text: '#16130f',
    textSecondary: '#7c7365',
    textMuted: '#9d9482',
    accent: '#ce3a1b',
    accentPressed: '#a82c11',
    accentText: '#fbf9f4',
    accentSoft: '#f6d6cc',
    success: '#3f6b44',
    successSoft: '#dbe7d5',
    warning: '#9a6b12',
    warningSoft: '#f2e3c4',
    danger: '#a82c11',
    dangerSoft: '#f6d6cc',
    info: '#3a5f8a',
    infoSoft: '#d8e2ee',
    overlay: 'rgba(22, 19, 15, 0.45)',
  },
  dark: {
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#334155',
    surface: '#1e293b',
    surfaceRaised: '#243044',
    inputBackground: '#1e293b',
    border: '#334155',
    borderStrong: '#475569',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#f0714f',
    accentPressed: '#d85a3a',
    accentText: '#1a0d08',
    accentSoft: '#3a2018',
    success: '#7fba86',
    successSoft: '#1d3324',
    warning: '#e0b45c',
    warningSoft: '#3a2f16',
    danger: '#f08a70',
    dangerSoft: '#3a1c15',
    info: '#8fb4e0',
    infoSoft: '#1b2c42',
    overlay: 'rgba(2, 6, 23, 0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = Record<ThemeColor, string>;

export const Fonts = {
  sans: 'SchibstedGrotesk-Regular',
  sansMedium: 'SchibstedGrotesk-Medium',
  sansSemiBold: 'SchibstedGrotesk-SemiBold',
  sansBold: 'SchibstedGrotesk-Bold',
  sansExtraBold: 'SchibstedGrotesk-ExtraBold',
  display: 'Fraunces-SemiBold',
  displayBold: 'Fraunces-Bold',
  mono: 'DMMono-Regular',
  monoMedium: 'DMMono-Medium',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
