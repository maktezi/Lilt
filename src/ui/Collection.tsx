import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { Track, Playlist } from '../core/model';
import { formatTime, matches } from '../core/model';
import { useLibrary } from '../state/library';
import type { Player } from '../state/player';
import { Button, Empty, Icon, IconButton, Sleeve } from './components';
import { colors as c, common as s, displayFont } from './theme';
export function TrackRow({ track, index, player, onPress, onOptions, onFavorite, compact = false }: { track: Track; index: number; player: Player; onPress: () => void; onOptions: () => void; onFavorite?: () => void; compact?: boolean }) {
  const selected = player.current?.id === track.id;
  return <View style={[styles.track, { backgroundColor: selected ? '#EAECDD' : 'transparent' }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}`} onPress={onPress} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [s.row, { gap: 12, flex: 1, minWidth: 0, paddingVertical: 10, opacity: hovered ? 0.7 : 1 }]}>
      {!compact && <Text style={[s.muted, { width: 24, textAlign: 'center' }]}>{selected && player.status.playing ? <Icon name="volume-2" size={15} color={c.accent} /> : String(index + 1).padStart(2, '0')}</Text>}
      <Sleeve name={track.album === 'Unknown album' ? track.title : track.album} size={compact ? 40 : 46} />
      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[s.label, { color: selected ? c.accent : c.ink }]}>{track.title}</Text><Text numberOfLines={1} style={s.muted}>{track.artist}{!track.available ? ' · File missing' : ''}</Text></View>
    </Pressable>
    {!compact && <Text style={[s.muted, { marginLeft: 8, fontVariant: ['tabular-nums'] }]}>{track.duration ? formatTime(track.duration) : '—'}</Text>}
    {onFavorite && <IconButton name="heart" label={track.favorite ? `Unfavorite ${track.title}` : `Favorite ${track.title}`} active={track.favorite} onPress={onFavorite} />}
    <IconButton name="more-horizontal" label={`Options for ${track.title}`} onPress={onOptions} />
  </View>;
}
const filters = ['Songs', 'Playlists', 'Albums', 'Artists', 'Favorites'] as const;
export function Collection({ player, onAdd, onTrackOptions, onFavorite, onNewPlaylist, selectedPlaylist, onSelectPlaylist, onPlaylistOptions }: {
  player: Player; onAdd: () => void; onTrackOptions: (track: Track) => void; onFavorite: (id: string) => void;
  onNewPlaylist: () => void; selectedPlaylist?: Playlist; onSelectPlaylist: (id?: string) => void; onPlaylistOptions: (playlist: Playlist) => void;
}) {
  const { library, importing } = useLibrary();
  const { width } = useWindowDimensions();
  const wide = width >= 900, padding = wide ? 40 : 22;
  const [filter, setFilter] = useState<typeof filters[number]>('Songs');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'Recent' | 'Title' | 'Artist' | 'Duration'>('Recent');
  const [group, setGroup] = useState<{ type: 'Albums' | 'Artists'; name: string } | null>(null);
  const tracks = useMemo(() => library.tracks.filter(t => (!selectedPlaylist || selectedPlaylist.trackIds.includes(t.id)) &&
    (filter !== 'Favorites' || t.favorite) && (!group || t[group.type === 'Albums' ? 'album' : 'artist'] === group.name) && matches(t, query))
    .sort((a, b) => selectedPlaylist ? selectedPlaylist.trackIds.indexOf(a.id) - selectedPlaylist.trackIds.indexOf(b.id) : sort === 'Title' ? a.title.localeCompare(b.title) : sort === 'Artist' ? a.artist.localeCompare(b.artist) : sort === 'Duration' ? b.duration - a.duration : b.addedAt - a.addedAt), [library.tracks, selectedPlaylist, filter, group, query, sort]);
  const grouped = useMemo(() => {
    const result = new Map<string, Track[]>();
    for (const track of tracks) { const name = filter === 'Albums' ? track.album : track.artist; result.set(name, [...(result.get(name) || []), track]); }
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tracks, filter]);
  const showSongs = !!selectedPlaylist || !!group || !['Playlists', 'Albums', 'Artists'].includes(filter);
  const title = selectedPlaylist?.name || group?.name || 'Your collection';
  const header = <View>
    {(selectedPlaylist || group) && <View style={{ alignItems: 'flex-start', marginBottom: 16 }}><Button quiet icon="arrow-left" label="Back to collection" onPress={() => { onSelectPlaylist(undefined); setGroup(null); setQuery(''); }} /></View>}
    <View style={[s.spread, { alignItems: 'flex-start', marginBottom: 26 }]}>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={[s.muted, { marginTop: 6 }]}>{selectedPlaylist ? `${selectedPlaylist.trackIds.length} tracks · Saved on this device` : group ? `${tracks.length} tracks in your library` : 'The music you love. Yours to keep close.'}</Text></View>
      {wide ? <Button label="Add music" icon="plus" onPress={onAdd} loading={importing} /> : <IconButton name="plus" label="Add music" onPress={onAdd} />}
    </View>
    {!selectedPlaylist && !group && <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: c.line, gap: wide ? 28 : 14, marginBottom: 24, flexWrap: 'wrap' }]}>{filters.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: item === filter }} onPress={() => setFilter(item)} style={{ minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: item === filter ? c.accent : 'transparent' }}><Text style={{ fontSize: 14, fontWeight: item === filter ? '600' : '400', color: item === filter ? c.accent : c.muted }}>{item}</Text></Pressable>)}</View>}
    <View style={[s.spread, { marginBottom: 24, flexWrap: 'wrap' }]}>
      <View style={[s.row, styles.search, { flex: 1, minWidth: 150 }]}><Icon name="search" color={c.muted} size={18} /><TextInput accessibilityLabel="Search your collection" placeholder="Search your collection" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={{ flex: 1, minWidth: 0, height: 48, fontSize: 14, color: c.ink }} />{query ? <IconButton name="x" label="Clear search" onPress={() => setQuery('')} /> : null}</View>
      {showSongs && !selectedPlaylist && <Button quiet label={sort} icon="sliders" onPress={() => setSort(({ Recent: 'Title', Title: 'Artist', Artist: 'Duration', Duration: 'Recent' } as const)[sort])} />}
      {selectedPlaylist && <IconButton name="more-horizontal" label="Playlist options" onPress={() => onPlaylistOptions(selectedPlaylist)} />}
    </View>
    {selectedPlaylist && <View style={[s.row, { gap: 12, marginBottom: 20 }]}><Button label="Play playlist" icon="play" disabled={!tracks.length} onPress={() => void player.playTracks(tracks.map(t => t.id))} /><Button label="Add tracks" secondary icon="plus" onPress={onAdd} /></View>}
    {filter === 'Playlists' && !selectedPlaylist && !group && <View style={[s.spread, { marginBottom: 18 }]}><Text style={s.section}>Made by you</Text><Button quiet icon="plus" label="New playlist" onPress={onNewPlaylist} /></View>}
    {showSongs && tracks.length > 0 && <View style={[s.spread, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line }]}><Text style={s.muted}>{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}{query ? ' found' : ''}</Text><Button quiet icon="play" label="Play all" onPress={() => void player.playTracks(tracks.map(t => t.id))} /></View>}
    {!showSongs && filter === 'Playlists' && library.playlists.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Open playlist ${p.name}`} onPress={() => onSelectPlaylist(p.id)} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.collectionRow, { backgroundColor: hovered ? c.rail : 'transparent' }]}><Sleeve name={p.name} size={72} /><View style={{ flex: 1 }}><Text style={s.section}>{p.name}</Text><Text style={s.muted}>{p.trackIds.length} tracks · Local playlist</Text></View><Icon name="chevron-right" color={c.muted} /></Pressable>)}
    {!showSongs && ['Albums', 'Artists'].includes(filter) && grouped.map(([name, items]) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Open ${name}`} onPress={() => setGroup({ type: filter as 'Albums' | 'Artists', name })} style={styles.collectionRow}><Sleeve name={name} size={64} /><View style={{ flex: 1 }}><Text style={s.label}>{name}</Text><Text style={s.muted}>{items.length} tracks</Text></View><Icon name="chevron-right" color={c.muted} /></Pressable>)}
    {!showSongs && !(filter === 'Playlists' ? library.playlists.length : grouped.length) && <Empty icon={filter === 'Playlists' ? 'list' : 'disc'} title={filter === 'Playlists' ? 'Make a little mixtape.' : `Your ${filter.toLowerCase()} will live here.`} detail={filter === 'Playlists' ? 'A soundtrack for the commute, the slow mornings, or whatever comes next.' : 'Import music to organize your collection by its metadata.'} action={<Button label={filter === 'Playlists' ? 'Create playlist' : 'Import music'} icon="plus" onPress={filter === 'Playlists' ? onNewPlaylist : onAdd} />} />}
  </View>;
  return <FlatList keyboardShouldPersistTaps="handled" data={showSongs ? tracks : []} keyExtractor={track => track.id} contentContainerStyle={{ paddingHorizontal: padding, paddingTop: wide ? 42 : 22, paddingBottom: 36, flexGrow: 1 }} ListHeaderComponent={header}
    renderItem={({ item, index }) => <TrackRow track={item} index={index} player={player} onPress={() => void player.playTracks(tracks.map(t => t.id), index)} onOptions={() => onTrackOptions(item)} onFavorite={() => onFavorite(item.id)} />}
    ListEmptyComponent={showSongs ? library.tracks.length === 0 && !selectedPlaylist && !query && filter === 'Songs' ? <View style={[styles.welcome, { flexDirection: wide ? 'row' : 'column', gap: wide ? 48 : 28 }]}>
      <View style={{ alignItems: 'center', justifyContent: 'center', padding: wide ? 24 : 12, flex: wide ? 0.9 : undefined }}><View style={{ transform: [{ rotate: '-7deg' }], padding: 13, backgroundColor: '#E6DFCF', borderRadius: 5 }}><Sleeve name="Lilt" size={wide ? 194 : 156} record /></View></View>
      <View style={{ flex: 1, gap: 18, alignItems: wide ? 'flex-start' : 'center' }}><Text style={{ fontFamily: displayFont, fontSize: wide ? 43 : 34, lineHeight: wide ? 49 : 41, color: c.ink, letterSpacing: -0.8, textAlign: wide ? 'left' : 'center' }}>Good music.{ '\n' }Within reach.</Text><Text style={[s.text, { color: c.muted, maxWidth: 330, textAlign: wide ? 'left' : 'center' }]}>Bring your favorite songs into Lilt. Organize a little, press play, and take them offline.</Text><Button label="Import your first songs" icon="plus" onPress={onAdd} loading={importing} /><Text style={[s.muted, { fontSize: 12 }]}>MP3, M4A & WAV · No account needed</Text></View>
    </View> : <Empty icon={query ? 'search' : filter === 'Favorites' ? 'heart' : 'music'} title={query ? 'No songs found.' : filter === 'Favorites' ? 'Keep your favorites close.' : 'This playlist is waiting for music.'} detail={query ? 'Try a song title, artist, or album from your saved library.' : filter === 'Favorites' ? 'Tap the heart beside a song to find it here.' : 'Import files or add songs from your collection.'} action={!query && filter !== 'Favorites' ? <Button label="Add music" onPress={onAdd} icon="plus" /> : undefined} /> : undefined}
    ListFooterComponent={library.tracks.length === 0 && filter === 'Songs' && !query && !selectedPlaylist ? <View style={{ paddingTop: 28, gap: 18 }}><View style={s.divider} /><View style={[s.row, { gap: 12 }]}><Icon name="hard-drive" color={c.green} size={18} /><Text style={[s.muted, { flex: 1 }]}>Your library lives on this device. Listening stays simple, even without a signal.</Text></View></View> : undefined}
  />;
}
const styles = StyleSheet.create({
  track: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 2, borderBottomWidth: 1, borderBottomColor: c.line, paddingHorizontal: 4, borderRadius: 6 },
  search: { backgroundColor: c.rail, borderRadius: 10, paddingLeft: 14, gap: 10 },
  welcome: { paddingVertical: 32, paddingHorizontal: 10, backgroundColor: '#EDECDD', borderRadius: 16, alignItems: 'center', minHeight: 350 },
  collectionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 18, borderBottomWidth: 1, borderBottomColor: c.line },
});
