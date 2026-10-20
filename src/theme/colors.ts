/**
 * "Lunar Indigo" — a night-sky indigo primary with a warm crescent gold accent. Chosen to stay
 * visually distinct from the sibling apps (prayer-times-lb is emerald, lexitoon is blue) while
 * matching the ui-ux-pro-max recommendation for a spiritual/calendar utility (purple + gold).
 *
 * Every text-bearing pair was picked for >= 4.5:1 contrast in its theme (e.g. light `accent` is a
 * darker gold than the decorative `heroGold`, which only ever sits on the dark hero gradient).
 */
export const lightTheme = {
  background: '#F5F4FB',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEAF7',
  primary: '#4B3AC0',
  primaryDark: '#352A8F',
  primarySoft: '#E7E3FB',
  onPrimary: '#FFFFFF',
  text: '#16132B',
  textMuted: '#5B5873',
  border: '#E1DEF0',
  accent: '#946010',
  accentSoft: '#FBF0DA',
  card: '#FFFFFF',
  cardShadow: 'rgba(43, 32, 120, 0.14)',
  mourning: '#9B2C3F',
  mourningSoft: '#F8E3E7',
  celebration: '#1F7A4D',
  celebrationSoft: '#DFF3E8',
  heroFrom: '#2B1F7A',
  heroTo: '#5A47D6',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255, 255, 255, 0.78)',
  heroGold: '#F2C468',
  scrim: 'rgba(12, 10, 30, 0.45)',
};

export type ThemeColors = typeof lightTheme;

export const darkTheme: ThemeColors = {
  background: '#0C0A1D',
  surface: '#15122C',
  surfaceAlt: '#1F1B3E',
  primary: '#A99CFF',
  primaryDark: '#8A7BF5',
  primarySoft: '#262056',
  onPrimary: '#110E28',
  text: '#F3F1FF',
  textMuted: '#A9A5C8',
  border: '#2A2650',
  accent: '#E8BD62',
  accentSoft: '#3A2F18',
  card: '#19163A',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  mourning: '#F08A9C',
  mourningSoft: '#3B1A24',
  celebration: '#6FD6A2',
  celebrationSoft: '#14352A',
  heroFrom: '#1A1452',
  heroTo: '#3B2FA0',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255, 255, 255, 0.75)',
  heroGold: '#F2C468',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

/** Fixed brand night colors for the native splash + JS loading screen (same in both themes, so
 * the hand-off from the native splash to the JS loading screen is seamless). Keep `night` in sync
 * with the `--background` passed to react-native-bootsplash (see help.md). */
export const brand = {
  night: '#110D2E',
  nightGlow: '#3B2FA0',
  gold: '#F2C468',
  moonlight: '#E9E5FF',
};
