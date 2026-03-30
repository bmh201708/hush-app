export const hushColors = {
  background: '#FBF9F5',
  surface: '#FFFFFF',
  surfaceLow: '#F5F3EF',
  surfaceMid: '#EFEEEA',
  surfaceHigh: '#EAE8E4',
  surfaceVariant: '#E4E2DE',
  outline: '#D0C4BB',
  text: '#1B1C1A',
  textMuted: '#7A746B',
  textSoft: '#9B9489',
  primary: '#667931',
  primaryDark: '#56642B',
  primarySoft: '#D9EAA3',
  primarySoftStrong: '#C8DB88',
  accent: '#F2D44C',
  accentStrong: '#F5BF2B',
  secondary: '#8B876D',
  amber: '#A97B16',
  error: '#BA1A1A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const hushFonts = {
  display: 'Manrope_300Light',
  headline: 'Manrope_500Medium',
  title: 'Manrope_700Bold',
  strong: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const hushMetrics = {
  screenPadding: 24,
  cardRadius: 28,
  pillRadius: 999,
  topBarHeight: 72,
  tabBarInset: 22,
  tabBarHeight: 74,
  bottomSpacing: 148,
} as const;

export const hushShadow = {
  ambient: {
    shadowColor: hushColors.black,
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  soft: {
    shadowColor: hushColors.black,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
