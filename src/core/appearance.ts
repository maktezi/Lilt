export type AppearancePreference = 'system' | 'light' | 'dark';
export function appearancePreference(value: unknown): AppearancePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
export function resolvedAppearance(preference: AppearancePreference, device: string | null | undefined): 'light' | 'dark' {
  return preference === 'system' ? device === 'dark' ? 'dark' : 'light' : preference;
}
export const lightColors = {
  canvas: '#F5F1E8', surface: '#FCFAF5', rail: '#EDE8DC', ink: '#292E27', muted: '#60685B',
  line: '#DADACE', accent: '#A74325', onAccent: '#FCFAF5', accentSoft: '#F1DED2', green: '#486449', greenSoft: '#E4EADF',
  danger: '#A33226', white: '#FFFFFF', record: '#30372F', navActive: '#E0E3D4', selectedTrack: '#EAECDD',
  welcome: '#EDECDD', sleevePaper: '#E6DFCF', inspector: '#F0EDE3', scrollbar: '#B8BEAE', overlay: 'rgba(26,31,26,0.42)',
};
export type ThemeColors = typeof lightColors;
export const darkColors: ThemeColors = {
  canvas: '#171916', surface: '#20231E', rail: '#2A2F27', ink: '#F3F1E8', muted: '#B6BEAE',
  line: '#454D3E', accent: '#F0AA8B', onAccent: '#24170F', accentSoft: '#483127', green: '#B5CE9E', greenSoft: '#2C3D2A',
  danger: '#FFB3A7', white: '#FFFFFF', record: '#30372F', navActive: '#394332', selectedTrack: '#303A2A',
  welcome: '#272E23', sleevePaper: '#454335', inspector: '#242820', scrollbar: '#68745E', overlay: 'rgba(8,11,7,0.72)',
};
