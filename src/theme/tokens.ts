/**
 * React Native runtime mirror of tokens.css — keep in sync.
 * Consume via useTheme() or direct import.
 */

export const colors = {
  brand: '#118779',
  brandDeep: '#156860',
  brandLight: '#E8F5F3',
  brandMuted: '#6B7472',

  paper: '#F4F7F6',
  paper2: '#EEF3F1',
  card: '#FFFFFF',
  border: '#DDE5E2',
  borderStrong: '#B8C9C4',

  text: '#3C3939',
  textMuted: '#6B7472',
  textInverse: '#FFFFFF',
  textLink: '#118779',

  success: '#309653',
  successSoft: '#E8F7EF',
  warning: '#DC8D11',
  warningSoft: '#FFF3E0',
  danger: '#CC3E3C',
  dangerSoft: '#FFEBEE',
  info: '#156860',
  infoSoft: '#E8F5F3',

  focus: '#118779',
  overlay: 'rgba(60, 57, 57, 0.45)',
  scrim: 'rgba(21, 104, 96, 0.08)',

  /** Legacy aliases — used by existing services/components during migration */
  primary: '#118779',
  primaryDark: '#156860',
  background: '#F4F7F6',
  muted: '#6B7472',
  green: '#309653',
  greenSoft: '#E8F7EF',
  orange: '#DC8D11',
  orangeSoft: '#FFF3E0',
  red: '#CC3E3C',
  redSoft: '#FFEBEE',
  blueSoft: '#E8F5F3',
} as const;

export const fonts = {
  display: 'Poppins_700Bold',
  displayMedium: 'Poppins_600SemiBold',
  displayRegular: 'Poppins_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 32,
  display: 40,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const elevation = {
  sm: {
    shadowColor: '#3C3939',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#3C3939',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3C3939',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const duration = {
  fast: 120,
  normal: 200,
  slow: 320,
} as const;

export const layout = {
  headerHeight: 56,
  tabBarHeight: 64,
  hitTargetMin: 44,
} as const;

/** Default Figma logo radial gradient (node 11:28) at accent #118779 */
export const brandGradientStops = ['#52BCB9', '#31A299', '#219489', '#118779'] as const;

export type ThemeTokens = {
  colors: typeof colors;
  fonts: typeof fonts;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  duration: typeof duration;
  layout: typeof layout;
  brandGradientStops: readonly [string, string, string, string];
};

export const themeTokens: ThemeTokens = {
  colors,
  fonts,
  fontSizes,
  lineHeights,
  spacing,
  radius,
  elevation,
  duration,
  layout,
  brandGradientStops,
};
