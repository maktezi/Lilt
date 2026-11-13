export type AppearancePreference = 'system' | 'light' | 'dark';
export function appearancePreference(value: unknown): AppearancePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
export function resolvedAppearance(preference: AppearancePreference, device: string | null | undefined): 'light' | 'dark' {
  return preference === 'system' ? device === 'dark' ? 'dark' : 'light' : preference;
}
export const lightColors = {
  canvas: '#F5F5F5', surface: '#FFFFFF', rail: '#EBEBEB', ink: '#121212', muted: '#575757',
  line: '#D7D7D7', accent: '#117537', onAccent: '#FFFFFF', accentSoft: '#D8F3E2', green: '#117537', greenSoft: '#D8F3E2',
  danger: '#B42332', white: '#FFFFFF', record: '#181818', navActive: '#DCDCDC', selectedTrack: '#D8F3E2',
  welcome: '#E5EBE7', sleevePaper: '#CCD9D1', inspector: '#FFFFFF', scrollbar: '#A0A0A0', overlay: 'rgba(0,0,0,0.6)',
};
export type ThemeColors = typeof lightColors;
export const darkColors: ThemeColors = {
  canvas: '#000000', surface: '#121212', rail: '#1F1F1F', ink: '#FFFFFF', muted: '#B3B3B3',
  line: '#333333', accent: '#1ED760', onAccent: '#000000', accentSoft: '#153A22', green: '#1ED760', greenSoft: '#153A22',
  danger: '#FF8C98', white: '#FFFFFF', record: '#181818', navActive: '#2A2A2A', selectedTrack: '#24342A',
  welcome: '#1B2D23', sleevePaper: '#284D36', inspector: '#121212', scrollbar: '#727272', overlay: 'rgba(0,0,0,0.75)',
};
