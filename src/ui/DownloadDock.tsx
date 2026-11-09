import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { downloadLabels, type DownloadSummary } from '../core/download-status';
import { Icon } from './components';
import { useTheme } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export function DownloadDock({ download, onOpen, inline = false }: { download: DownloadSummary; onOpen: () => void; inline?: boolean }) {
  const { colors: c, common: s, reduceMotion } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * 18;
  const offset = useRef(new Animated.Value(circumference)).current;
  const indeterminate = download.percent === null && !download.error && download.phase !== 'complete';
  useEffect(() => {
    if (!indeterminate || reduceMotion) { rotation.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }));
    loop.start(); return () => loop.stop();
  }, [indeterminate, reduceMotion, rotation]);
  useEffect(() => {
    const animation = Animated.timing(offset, { toValue: circumference * (1 - (download.percent ?? 25) / 100), duration: reduceMotion ? 0 : 250, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [download.percent, circumference, offset, reduceMotion]);
  const label = download.error ? 'Needs attention' : downloadLabels[download.phase];
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open download for ${download.title}`} accessibilityHint="Show download progress and controls" onPress={onOpen} style={({ pressed }) => [s.row, { backgroundColor: inline ? 'transparent' : c.rail, borderTopWidth: inline ? 0 : 1, borderBottomWidth: inline ? 1 : 0, borderColor: c.line, minHeight: 66, paddingHorizontal: inline ? 4 : 16, paddingVertical: 8, gap: 12, opacity: pressed ? 0.8 : 1 }]}>
    <View accessibilityRole="progressbar" accessibilityLabel="Download progress" accessibilityValue={download.percent === null ? { text: label } : { min: 0, max: 100, now: download.percent }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <Svg width={44} height={44} viewBox="0 0 44 44"><Circle cx={22} cy={22} r={18} stroke={c.line} strokeWidth={3} fill="none" /><AnimatedCircle cx={22} cy={22} r={18} stroke={download.error ? c.danger : c.accent} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} rotation={-90} origin="22, 22" /></Svg>
      </Animated.View>
      <Icon name={download.error ? 'alert-circle' : download.phase === 'complete' ? 'check' : 'download'} size={17} color={download.error ? c.danger : c.accent} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text numberOfLines={1} style={s.label}>{download.title}</Text><Text numberOfLines={1} style={[s.muted, { fontSize: 12 }]}>{label}{download.percent !== null && download.phase !== 'complete' ? ` · ${download.percent}%` : ''}</Text></View>
    <Icon name="chevron-up" size={20} color={c.muted} />
  </Pressable>;
}
