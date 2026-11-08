import { Platform, StyleSheet } from 'react-native';
export const colors = {
  canvas: '#F5F1E8', surface: '#FCFAF5', rail: '#EDE8DC', ink: '#292E27', muted: '#687062',
  line: '#DADACE', accent: '#A74325', accentSoft: '#F1DED2', green: '#486449', greenSoft: '#E4EADF',
  danger: '#A33226', white: '#FFFFFF', record: '#30372F',
};
export const displayFont = Platform.select({ web: 'CollectionSerif', ios: 'Georgia', default: 'serif' });
export const common = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 36, lineHeight: 44, fontFamily: displayFont, color: colors.ink, letterSpacing: -0.7 },
  section: { fontSize: 23, lineHeight: 30, fontFamily: displayFont, color: colors.ink },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 22, color: colors.muted },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, minHeight: 50, fontSize: 16, color: colors.ink },
});
