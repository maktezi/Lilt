import React from 'react';
import { Text } from 'react-native';
import type { ConverterProps } from '../core/converter';
import { Sheet } from './components';
import { useTheme } from './theme';

export function Converter({ visible, onClose }: ConverterProps) {
  const { colors: c, common: s } = useTheme();
  return <Sheet visible={visible} title="Use the mobile app" onClose={onClose}><Text style={s.text}>In-app conversion and automatic saving are available in the iOS and Android app. In a browser, use a converter and import the downloaded audio file.</Text></Sheet>;
}
