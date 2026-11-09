import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from './theme';

export function PlayingAnimation({ playing, active = true, size }: { playing: boolean; active?: boolean; size: number }) {
  const { colors: c, reduceMotion } = useTheme();
  const ref = useRef<LottieView>(null);
  useEffect(() => { if (playing && active && !reduceMotion) ref.current?.resume(); else ref.current?.pause(); }, [playing, active, reduceMotion]);
  return <View style={{ width: size, height: size, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><LottieView ref={ref} source={require('../../assets/animations/playing.json')} loop autoPlay={playing && active && !reduceMotion} progress={reduceMotion ? 0.25 : undefined} colorFilters={[{ keypath: 'Spin Outlines', color: c.accent }]} style={{ width: size, height: size }} webStyle={{ width: size, height: size }} /></View>;
}
