import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTime } from '../core/model';
import { libraryStore, useLibrary } from '../state/library';
import type { Player } from '../state/player';
import { Button, Icon, IconButton, Sheet, Sleeve } from './components';
import { useTheme } from './theme';
import { PlayingAnimation } from './PlayingAnimation';
export function SeekBar({ player }: { player: Player }) {
  const { colors: c, common: s, reduceMotion } = useTheme();
  const [width, setWidth] = useState(1);
  const value = Math.min(1, player.status.currentTime / (player.status.duration || 1));
  const progress = useRef(new Animated.Value(value)).current;
  const previous = useRef(value);
  useEffect(() => {
    const jump = Math.abs(previous.current - value) > 0.03;
    previous.current = value;
    const animation = Animated.timing(progress, { toValue: value, duration: reduceMotion || jump ? 0 : 300, easing: Easing.linear, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [value, reduceMotion, progress]);
  return <View style={{ gap: 4 }}><Pressable accessibilityRole="adjustable" accessibilityLabel="Playback position" accessibilityValue={{ min: 0, max: Math.round(player.status.duration), now: Math.round(player.status.currentTime), text: formatTime(player.status.currentTime) }}
    accessibilityActions={[{ name: 'increment', label: 'Seek forward 10 seconds' }, { name: 'decrement', label: 'Seek backward 10 seconds' }]}
    onAccessibilityAction={event => void player.seek(player.status.currentTime + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    onPress={event => void player.seek(event.nativeEvent.locationX / width * player.status.duration)}
    {...(Platform.OS === 'web' ? { onKeyDown: (event: { nativeEvent: { key: string }; preventDefault: () => void }) => { if (['ArrowLeft', 'ArrowRight'].includes(event.nativeEvent.key)) { event.preventDefault(); void player.seek(player.status.currentTime + (event.nativeEvent.key === 'ArrowRight' ? 10 : -10)); } } } : {})}
    style={{ minHeight: 48, justifyContent: 'center' }}><View style={{ height: 4, backgroundColor: c.line, borderRadius: 2 }}><Animated.View style={{ width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }), height: 4, borderRadius: 2, backgroundColor: c.accent }} /><Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, position: 'absolute', left: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '98%'], extrapolate: 'clamp' }), top: -4 }} /></View></Pressable>
    <View style={[s.spread, { marginTop: -10 }]}><Text style={[s.muted, { fontVariant: ['tabular-nums'], fontSize: 12 }]}>{formatTime(player.status.currentTime)}</Text><Text style={[s.muted, { fontVariant: ['tabular-nums'], fontSize: 12 }]}>{formatTime(player.status.duration)}</Text></View>
  </View>;
}
export function Controls({ player, full = false }: { player: Player; full?: boolean }) {
  const { colors: c, common: s, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const pressScale = useRef(new Animated.Value(1)).current;
  function animatePress(value: number) {
    Animated.spring(pressScale, { toValue: reduceMotion ? 1 : value, damping: 22, stiffness: 280, mass: 0.7, useNativeDriver: true }).start();
  }
  const { library } = useLibrary();
  function shuffle() {
    const currentId = player.current?.id, ids = [...library.playback.queue];
    if (!library.playback.shuffle) {
      const rest = ids.filter(id => id !== currentId);
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      void player.updateQueue(currentId ? [currentId, ...rest] : rest).catch(libraryStore.report);
    }
    void libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, shuffle: !l.playback.shuffle } })).catch(libraryStore.report);
  }
  return <View style={[s.row, { justifyContent: 'center', gap: full ? width < 375 ? 2 : 10 : 0 }]}>
    {full && <IconButton name="shuffle" label={library.playback.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} active={library.playback.shuffle} onPress={shuffle} />}
    <IconButton name="skip-back" label="Previous track" onPress={player.previous} disabled={!player.current} />
    <Animated.View style={{ transform: [{ scale: pressScale }] }}><Pressable accessibilityRole="button" accessibilityLabel={player.status.playing ? 'Pause' : 'Play'} onPress={player.toggle} onPressIn={() => animatePress(0.94)} onPressOut={() => animatePress(1)} disabled={player.loading || !player.current} style={({ pressed }) => ({ width: full ? 64 : 48, height: full ? 64 : 48, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, opacity: pressed || !player.current ? 0.5 : 1 })}><Icon name={player.status.playing ? 'pause' : 'play'} color={c.onAccent} size={full ? 26 : 21} /></Pressable></Animated.View>
    <IconButton name="skip-forward" label="Next track" onPress={player.next} disabled={!player.current} />
    {full && <IconButton name="repeat" label={`Repeat: ${library.playback.repeat}. Change repeat mode`} badge={library.playback.repeat === 'single' ? '1' : undefined} active={library.playback.repeat !== 'none'} onPress={() => void libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, repeat: ({ none: 'all', all: 'single', single: 'none' } as const)[l.playback.repeat] } })).catch(libraryStore.report)} />}
  </View>;
}
export function PlayerDock({ player, onExpand, onQueue }: { player: Player; onExpand: () => void; onQueue: () => void }) {
  const { colors: c, common: s } = useTheme();
  const { width } = useWindowDimensions(), track = player.current, wide = width >= 900;
  return <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: wide ? 28 : 12, paddingVertical: 10 }}>
    {player.error && <Text accessibilityRole="alert" style={[s.muted, { color: c.danger, paddingBottom: 8 }]}>{player.error}</Text>}
    <View style={[s.row, { gap: wide ? 24 : 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={track ? `Open player for ${track.title}` : 'Nothing playing'} disabled={!track} onPress={onExpand} style={[s.row, { gap: 12, flex: 1, minWidth: 0 }]}>
        {track ? <PlayingAnimation playing={player.status.playing} size={48} /> : <View style={{ width: 48, height: 48, backgroundColor: c.rail, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Icon name="music" color={c.muted} /></View>}
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={s.label}>{track?.title || 'Nothing playing'}</Text><Text numberOfLines={1} style={s.muted}>{player.loading ? 'Opening audio…' : track?.artist || 'A song will feel right here.'}</Text></View>
      </Pressable>
      {wide && <View style={{ flex: 1.15, maxWidth: 560 }}><SeekBar player={player} /></View>}
      {wide ? <Controls player={player} /> : <Pressable accessibilityRole="button" accessibilityLabel={player.status.playing ? 'Pause' : 'Play'} onPress={player.toggle} disabled={!track} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={player.status.playing ? 'pause' : 'play'} color={track ? c.accent : c.muted} size={23} /></Pressable>}
      <IconButton name="list" label="Open playback queue" onPress={onQueue} />
    </View>
  </View>;
}
export function NowPlaying({ visible, player, onClose, onQueue, onFavorite }: { visible: boolean; player: Player; onClose: () => void; onQueue: () => void; onFavorite: () => void }) {
  const { colors: c, common: s, reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const artworkScale = useRef(new Animated.Value(0.97)).current;
  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) { artworkScale.setValue(1); return; }
    const animation = Animated.spring(artworkScale, { toValue: player.status.playing ? 1 : 0.97, damping: 24, stiffness: 150, mass: 0.9, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [visible, player.status.playing, reduceMotion, artworkScale]);
  const track = player.current;
  const artworkSize = Math.max(140, Math.min(width - 64, 440, height * 0.34));
  return <Modal visible={visible} presentationStyle="fullScreen" animationType={reduceMotion ? 'fade' : 'slide'} onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <View style={[s.spread, { minHeight: 64, paddingHorizontal: 12 }]}>
        <IconButton name="chevron-down" label="Minimize player" size={28} onPress={onClose} />
        <Text accessibilityRole="header" style={s.label}>Now playing</Text>
        <IconButton name="list" label="Open playback queue" onPress={onQueue} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: 26 }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: artworkScale }] }}><PlayingAnimation playing={player.status.playing} active={visible} size={artworkSize} /></Animated.View>
          <View style={[s.spread, { alignItems: 'center' }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[s.section, { fontSize: 27, lineHeight: 35 }]} numberOfLines={2}>{track?.title || 'Choose a song'}</Text>
              <Text style={[s.muted, { fontSize: 16, lineHeight: 24 }]} numberOfLines={2}>{track?.artist || 'Your collection is ready when you are.'}</Text>
            </View>
            <IconButton name="heart" size={24} label={track?.favorite ? 'Remove from favorites' : 'Add to favorites'} active={track?.favorite} onPress={onFavorite} disabled={!track} />
          </View>
          <View style={{ gap: 18 }}><SeekBar player={player} /><Controls player={player} full /></View>
          <Text style={[s.muted, { textAlign: 'center' }]}>{player.loading ? 'Loading…' : 'Playing from your device'}</Text>
          {player.error && <Text accessibilityRole="alert" style={[s.text, { color: c.danger }]}>{player.error}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
export function Queue({ player, onClose }: { player: Player; onClose: () => void }) {
  const { colors: c, common: s } = useTheme();
  const { library } = useLibrary();
  const ids = library.playback.queue;
  function move(index: number, delta: number) {
    const next = [...ids], to = index + delta;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    void player.updateQueue(next).catch(libraryStore.report);
  }
  return <Sheet title="Your queue" onClose={onClose} wide>
    <Text style={s.muted}>{ids.length ? `${ids.length} songs, in your order.` : 'Play a song or add one from its options.'}</Text>
    {ids.map((id, index) => { const track = library.tracks.find(t => t.id === id); if (!track) return null; return <View key={id} style={[s.row, { gap: 8, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 10 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title} from queue`} onPress={() => void player.playTracks(ids, index)} style={[s.row, { gap: 10, flex: 1, minWidth: 0 }]}><Sleeve name={track.title} size={42} /><View style={{ flex: 1 }}><Text style={[s.label, { color: player.current?.id === id ? c.accent : c.ink }]} numberOfLines={1}>{track.title}</Text><Text style={s.muted} numberOfLines={1}>{track.artist}</Text></View></Pressable><IconButton name="arrow-up" label={`Move ${track.title} up in queue`} disabled={index === 0} onPress={() => move(index, -1)} /><IconButton name="x" label={`Remove ${track.title} from queue`} onPress={() => void player.updateQueue(ids.filter(t => t !== id)).catch(libraryStore.report)} /></View>; })}
    {ids.length > 0 && <Button secondary label="Clear queue" onPress={() => void player.updateQueue([]).catch(libraryStore.report)} />}
  </Sheet>;
}
