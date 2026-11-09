import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { appearancePreference, resolvedAppearance, lightColors, darkColors, type AppearancePreference, type ThemeColors } from '../core/appearance';
import { preferences } from '../platform/preferences';
export type { ThemeColors } from '../core/appearance';

export const displayFont = Platform.select({ web: 'CollectionSerif', ios: 'Georgia', default: 'serif' });
const createCommon = (colors: ThemeColors) => StyleSheet.create({
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

const themes = {
  light: { colors: lightColors, common: createCommon(lightColors) },
  dark: { colors: darkColors, common: createCommon(darkColors) },
};
type ThemeContextValue = typeof themes.light & {
  isDark: boolean; reduceMotion: boolean; preference: AppearancePreference; ready: boolean; error: string | null;
  setPreference: (next: AppearancePreference) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [preference, setCurrent] = useState<AppearancePreference>('system'), [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const serial = useRef<Promise<unknown>>(Promise.resolve());
  const mode = resolvedAppearance(preference, device);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(themes[mode].colors.canvas).catch(() => {}); }, [mode]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    let active = true;
    void preferences.get('lilt.appearance').then(value => { if (active) setCurrent(appearancePreference(value)); })
      .catch(() => { if (active) setError('Could not read your appearance setting. Device default is active.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const value = useMemo<ThemeContextValue>(() => ({ ...themes[mode], isDark: mode === 'dark', reduceMotion, preference, ready, error,
    async setPreference(next) {
      const task = serial.current.then(async () => { await preferences.set('lilt.appearance', next); setCurrent(next); setError(null); });
      serial.current = task.catch(() => {});
      try { await task; } catch { setError('Could not save your appearance setting. Try again.'); }
    },
  }), [mode, reduceMotion, preference, ready, error]);
  return <ThemeContext.Provider value={value}><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('ThemeProvider is required.');
  return theme;
}
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
