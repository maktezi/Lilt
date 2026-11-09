import React, { type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, type ThemeColors } from './theme';
export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors: c } = useTheme();
  return <Feather name={name} size={size} color={color ?? c.ink} />;
}
export function Button({ label, icon, onPress, secondary = false, quiet = false, disabled = false, loading = false, style }: {
  label: string; icon?: IconName; onPress: () => void; secondary?: boolean; quiet?: boolean; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors: c, common: s } = useTheme();
  const styles = useThemedStyles(createStyles);
  const foreground = secondary || quiet ? c.ink : c.onAccent;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.button, { backgroundColor: quiet ? 'transparent' : secondary ? c.rail : c.accent, opacity: disabled ? 0.45 : pressed ? 0.7 : hovered ? 0.88 : 1 }, style]}>
    {loading ? <ActivityIndicator color={foreground} size="small" /> : icon ? <Icon name={icon} size={18} color={foreground} /> : null}
    <Text style={{ color: foreground, fontSize: 14, fontWeight: '600', lineHeight: 20 }}>{label}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, active = false, disabled = false, size = 20, badge }: { name: IconName; label: string; onPress: () => void; active?: boolean; disabled?: boolean; size?: number; badge?: string }) {
  const { colors: c, common: s } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={onPress}
    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.iconButton, { backgroundColor: active ? c.accentSoft : pressed || hovered ? c.rail : 'transparent', opacity: disabled ? 0.4 : 1 }]}><Icon name={name} size={size} color={active ? c.accent : c.ink} />{badge ? <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: 5, top: 6, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.accent, fontSize: 11, lineHeight: 13, fontWeight: '700' }}>{badge}</Text></View> : null}</Pressable>;
}
export function Brand({ small = false }: { small?: boolean }) {
  const { colors: c, common: s } = useTheme();
  const height = small ? 30 : 38;
  return <Image source={require('../../assets/brand/logo.png')} accessibilityLabel="Lilt" accessibilityRole="image" resizeMode="contain" style={{ width: height * 285 / 114, height, tintColor: c.accent }} />;
}
const sleeves = ['#C5CDBA', '#D6B6A0', '#C7C7B7', '#B9C6C8', '#D1C393'];
export function Sleeve({ name = '', size = 52, record = false }: { name?: string; size?: number; record?: boolean }) {
  const { colors: c, common: s } = useTheme();
  const color = sleeves[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % sleeves.length];
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderRadius: size > 100 ? 5 : 7, overflow: 'hidden' }}>
    <View style={{ width: size * 0.76, height: size * 0.76, backgroundColor: c.record, borderRadius: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0.64, 0.79, 0.93].map(f => <View key={f} style={{ position: 'absolute', width: size * 0.76 * f, height: size * 0.76 * f, borderRadius: size, borderWidth: 1, borderColor: '#4B5247' }} />)}
      <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: size, backgroundColor: record ? c.accent : color, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: Math.max(3, size * 0.03), height: Math.max(3, size * 0.03), borderRadius: size, backgroundColor: c.surface }} /></View>
    </View>
  </View>;
}
export function Sheet({ title, children, onClose, wide = false, visible = true }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; visible?: boolean }) {
  const { colors: c, common: s } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} style={styles.overlay}><Pressable accessibilityLabel="Close dialog" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom', 'top']} style={[styles.sheet, { maxWidth: wide ? 680 : 540 }]} accessibilityViewIsModal>
        <View style={[s.spread, { padding: 22, paddingBottom: 12 }]}><Text accessibilityRole="header" style={s.section}>{title}</Text><IconButton name="x" label={`Close ${title}`} onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 6, gap: 20 }}>{children}</ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Empty({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: ReactNode }) {
  const { colors: c, common: s } = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24, gap: 16 }}><View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.rail, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={26} color={c.muted} /></View><Text style={[s.section, { textAlign: 'center' }]}>{title}</Text><Text style={[s.muted, { textAlign: 'center', maxWidth: 330 }]}>{detail}</Text>{action}</View>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  button: { minHeight: 48, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  iconButton: { width: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center', backgroundColor: c.overlay, padding: Platform.OS === 'web' ? 16 : 0 },
  sheet: { backgroundColor: c.surface, width: '100%', maxHeight: '92%', borderRadius: 16, overflow: 'hidden' },
});
