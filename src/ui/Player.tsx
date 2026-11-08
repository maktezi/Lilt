import React, { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { formatTime } from '../core/model';
import { libraryStore, useLibrary } from '../state/library';
import type { Player } from '../state/player';
import { Button, Icon, IconButton, Sheet, Sleeve } from './components';
import { colors as c, common as s } from './theme';
export function SeekBar({ player }: { player: Player }) {
  const [width, setWidth] = useState(1);
  const value = Math.min(1, player.status.currentTime / (player.status.duration || 1));
  return <View style={{ gap: 4 }}><Pressable accessibilityRole="adjustable" accessibilityLabel="Playback position" accessibilityValue={{ min: 0, max: Math.round(player.status.duration), now: Math.round(player.status.currentTime), text: formatTime(player.status.currentTime) }}
    accessibilityActions={[{ name: 'increment', label: 'Seek forward 10 seconds' }, { name: 'decrement', label: 'Seek backward 10 seconds' }]}
    onAccessibilityAction={event => void player.seek(player.status.currentTime + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    onPress={event => void player.seek(event.nativeEvent.locationX / width * player.status.duration)}
    {...(Platform.OS === 'web' ? { onKeyDown: (event: { nativeEvent: { key: string }; preventDefault: () => void }) => { if (['ArrowLeft', 'ArrowRight'].includes(event.nativeEvent.key)) { event.preventDefault(); void player.seek(player.status.currentTime + (event.nativeEvent.key === 'ArrowRight' ? 10 : -10)); } } } : {})}
    style={{ minHeight: 48, justifyContent: 'center' }}><View style={{ height: 4, backgroundColor: c.line, borderRadius: 2 }}><View style={{ width: `${value * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.accent }} /><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, position: 'absolute', left: `${Math.min(98, value * 100)}%`, top: -4 }} /></View></Pressable>
    <View style={[s.spread, { marginTop: -10 }]}><Text style={[s.muted, { fontVariant: ['tabular-nums'], fontSize: 12 }]}>{formatTime(player.status.currentTime)}</Text><Text style={[s.muted, { fontVariant: ['tabular-nums'], fontSize: 12 }]}>{formatTime(player.status.duration)}</Text></View>
  </View>;
}
export function Controls({ player, full = false }: { player: Player; full?: boolean }) {
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
  return <View style={[s.row, { justifyContent: 'center', gap: full ? 10 : 0 }]}>
    {full && <IconButton name="shuffle" label={library.playback.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} active={library.playback.shuffle} onPress={shuffle} />}
    <IconButton name="skip-back" label="Previous track" onPress={player.previous} disabled={!player.current} />
    <Pressable accessibilityRole="button" accessibilityLabel={player.status.playing ? 'Pause' : 'Play'} onPress={player.toggle} disabled={player.loading || !player.current} style={({ pressed }) => ({ width: full ? 64 : 48, height: full ? 64 : 48, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent, opacity: pressed || !player.current ? 0.5 : 1 })}><Icon name={player.status.playing ? 'pause' : 'play'} color={c.surface} size={full ? 26 : 21} /></Pressable>
    <IconButton name="skip-forward" label="Next track" onPress={player.next} disabled={!player.current} />
    {full && <IconButton name="repeat" label={`Repeat: ${library.playback.repeat}. Change repeat mode`} active={library.playback.repeat !== 'none'} onPress={() => void libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, repeat: ({ none: 'all', all: 'single', single: 'none' } as const)[l.playback.repeat] } })).catch(libraryStore.report)} />}
    {full && library.playback.repeat === 'single' && <Text accessibilityLabel="Repeating one track" style={{ position: 'absolute', right: 9, top: 5, color: c.accent, fontSize: 10, fontWeight: '700' }}>1</Text>}
  </View>;
}
export function PlayerDock({ player, onExpand, onQueue }: { player: Player; onExpand: () => void; onQueue: () => void }) {
  const { width } = useWindowDimensions(), track = player.current, wide = width >= 900;
  return <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: wide ? 28 : 12, paddingVertical: 10 }}>
    {player.error && <Text accessibilityRole="alert" style={[s.muted, { color: c.danger, paddingBottom: 8 }]}>{player.error}</Text>}
    <View style={[s.row, { gap: wide ? 24 : 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={track ? `Open player for ${track.title}` : 'Nothing playing'} disabled={!track} onPress={onExpand} style={[s.row, { gap: 12, flex: 1, minWidth: 0 }]}>
        {track ? <Sleeve name={track.album === 'Unknown album' ? track.title : track.album} size={48} /> : <View style={{ width: 48, height: 48, backgroundColor: c.rail, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}><Icon name="music" color={c.muted} /></View>}
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={s.label}>{track?.title || 'Nothing playing'}</Text><Text numberOfLines={1} style={s.muted}>{player.loading ? 'Opening audio…' : track?.artist || 'A song will feel right here.'}</Text></View>
      </Pressable>
      {wide && <View style={{ flex: 1.15, maxWidth: 560 }}><SeekBar player={player} /></View>}
      {wide ? <Controls player={player} /> : <Pressable accessibilityRole="button" accessibilityLabel={player.status.playing ? 'Pause' : 'Play'} onPress={player.toggle} disabled={!track} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={player.status.playing ? 'pause' : 'play'} color={track ? c.accent : c.muted} size={23} /></Pressable>}
      <IconButton name="list" label="Open playback queue" onPress={onQueue} />
    </View>
  </View>;
}
export function NowPlaying({ player, onClose, onQueue, onFavorite }: { player: Player; onClose: () => void; onQueue: () => void; onFavorite: () => void }) {
  const track = player.current;
  return <Sheet title="Now playing" onClose={onClose}>
    <View style={{ alignItems: 'center', paddingTop: 6, gap: 26 }}><Sleeve name={track?.album === 'Unknown album' ? track?.title : track?.album} size={240} record /><View style={{ alignItems: 'center', gap: 7 }}><Text style={[s.section, { textAlign: 'center' }]}>{track?.title || 'Choose a song'}</Text><Text style={s.muted}>{track?.artist || 'Your collection is ready when you are.'}</Text></View></View>
    <SeekBar player={player} /><Controls player={player} full />
    <View style={s.spread}><IconButton name="heart" label={track?.favorite ? 'Remove from favorites' : 'Add to favorites'} active={track?.favorite} onPress={onFavorite} disabled={!track} /><Text style={s.muted}>{player.loading ? 'Loading…' : 'Playing from your device'}</Text><IconButton name="list" label="Open playback queue" onPress={onQueue} /></View>
    {player.error && <Text accessibilityRole="alert" style={[s.text, { color: c.danger }]}>{player.error}</Text>}
  </Sheet>;
}
export function Queue({ player, onClose }: { player: Player; onClose: () => void }) {
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
