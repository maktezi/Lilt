import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { addToPlaylist, formatBytes, uid, type Playlist, type Track } from './core/model';
import { libraryStore, useLibrary } from './state/library';
import { usePlayer } from './state/player';
import { storage } from './platform/storage';
import { Brand, Button, Icon, IconButton, Sheet, Sleeve, type IconName } from './ui/components';
import { ThemeProvider, useTheme, useThemedStyles, type ThemeColors } from './ui/theme';
import { Collection } from './ui/Collection';
import { AddMusic } from './ui/AddMusic';
import { Discover, Settings, Transfers } from './ui/Screens';
import { Controls, NowPlaying, PlayerDock, Queue } from './ui/Player';
import { DownloadDock } from './ui/DownloadDock';
import { jobDownloadSummary, type DownloadSummary } from './core/download-status';

type Tab = 'Collection' | 'Transfers' | 'Discover' | 'Settings';
type Dialog = 'add' | 'player' | 'queue' | 'newPlaylist' | 'track' | 'editTrack' | 'addToPlaylist' | 'playlist' | 'confirmTrack' | 'confirmPlaylist' | 'confirmReset' | null;
const navigation: { tab: Tab; icon: IconName }[] = [{ tab: 'Collection', icon: 'grid' }, { tab: 'Transfers', icon: 'download' }, { tab: 'Discover', icon: 'compass' }];

export default function App() {
  return <ThemeProvider><SafeAreaProvider><Lilt /></SafeAreaProvider></ThemeProvider>;
}
function Lilt() {
  const { colors: c, common: s, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions(), wide = width >= 900, inspector = width >= 1360;
  const { library, ready, error, notice } = useLibrary();
  const [fontsLoaded] = useFonts(Platform.OS === 'web' ? { CollectionSerif: require('../assets/fonts/source-serif-4.woff2') } : {});
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>('Collection'), [dialog, setDialog] = useState<Dialog>(null);
  const [playlistId, setPlaylistId] = useState<string>();
  const [trackId, setTrackId] = useState<string>();
  const [name, setName] = useState(''), [artist, setArtist] = useState(''), [album, setAlbum] = useState('');
  const [formError, setFormError] = useState(''), [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [downloadSession, setDownloadSession] = useState<DownloadSummary | null>(null);
  const selectedPlaylist = library.playlists.find(p => p.id === playlistId);
  const selectedTrack = library.tracks.find(t => t.id === trackId);
  const activeJobs = library.jobs.filter(j => ['queued', 'downloading', 'verifying'].includes(j.state)).length;
  const activeDownload = library.jobs.find(j => ['queued', 'downloading', 'verifying'].includes(j.state));
  const dockDownload = downloadSession || (activeDownload ? jobDownloadSummary(activeDownload) : null);
  const showDownloadDock = !!dockDownload && !(tab === 'Collection' && selectedPlaylist && dockDownload.playlistId === selectedPlaylist.id);
  useEffect(() => { void libraryStore.init(); }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.title = 'Lilt — Your music, kept close';
    const update = () => setOnline(navigator.onLine); update();
    window.addEventListener('online', update); window.addEventListener('offline', update);
    if ('serviceWorker' in navigator && !__DEV__) void navigator.serviceWorker.register('/sw.js').catch(() => libraryStore.notify('Offline app setup failed. Reload while connected to try again.'));
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = `html,body,#root{height:100%;background:${c.canvas};color-scheme:${isDark ? 'dark' : 'light'}}*{box-sizing:border-box}::selection{background:${c.accentSoft};color:${c.ink}}:focus-visible{outline:2px solid ${c.accent}!important;outline-offset:3px}input,textarea{outline:none;caret-color:${c.accent}}input:focus,textarea:focus{box-shadow:inset 0 0 0 2px ${c.accent}}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${c.scrollbar};border:2px solid ${c.canvas};border-radius:5px}button,[role=button]{touch-action:manipulation}a{color:${c.accent}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
    document.head.appendChild(style);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', c.canvas);
    return () => style.remove();
  }, [c, isDark]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dialog) { setDialog(null); return true; }
      if (playlistId) { setPlaylistId(undefined); return true; }
      if (tab !== 'Collection') { setTab('Collection'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [dialog, playlistId, tab]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => libraryStore.notify(null), 9000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const close = () => { setDialog(null); setFormError(''); };
  const go = (next: Tab) => { setTab(next); setPlaylistId(undefined); };
  function favorite(id: string) { void libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => t.id === id ? { ...t, favorite: !t.favorite } : t) })).catch(libraryStore.report); }
  function trackOptions(track: Track) { setTrackId(track.id); setDialog('track'); }
  function newPlaylist() { setName(''); setFormError(''); setDialog('newPlaylist'); }
  async function submit(action: () => Promise<void>) {
    setSaving(true); setFormError('');
    try { await action(); close(); } catch (e) { setFormError(e instanceof Error ? e.message : 'Could not save. Please try again.'); }
    finally { setSaving(false); }
  }
  function option(label: string, icon: IconName, action: () => void, danger = false) {
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={action} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.row, { gap: 14, minHeight: 52, paddingHorizontal: 10, borderRadius: 8, backgroundColor: pressed || hovered ? c.rail : 'transparent' }]}><Icon name={icon} color={danger ? c.danger : c.ink} /><Text style={[s.text, { color: danger ? c.danger : c.ink, flex: 1 }]}>{label}</Text><Icon name="chevron-right" color={c.muted} size={17} /></Pressable>;
  }
  if (!ready || !fontsLoaded) return <SafeAreaView style={[styles.app, { alignItems: 'center', justifyContent: 'center', gap: 24 }]}><Brand />{error ? <><Text accessibilityRole="alert" style={[s.text, { textAlign: 'center', padding: 24 }]}>{error}</Text><Button label="Try opening again" icon="refresh-cw" onPress={() => void libraryStore.init()} /></> : <ActivityIndicator color={c.accent} accessibilityLabel="Opening your collection" />}</SafeAreaView>;

  return <SafeAreaView style={styles.app} edges={['top', 'bottom', 'left', 'right']}>
    <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
      {wide && <View style={styles.rail}><View style={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: 42 }}><Brand /><Text style={[s.muted, { marginTop: 10, fontSize: 12 }]}>Your music, kept close.</Text></View><View style={{ gap: 7 }}>{navigation.map(item => <Pressable key={item.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === item.tab }} onPress={() => go(item.tab)} style={[styles.navItem, { backgroundColor: tab === item.tab ? c.navActive : 'transparent' }]}><Icon name={item.icon} size={19} color={tab === item.tab ? c.ink : c.muted} /><Text style={[s.label, { color: tab === item.tab ? c.ink : c.muted, flex: 1 }]}>{item.tab}</Text>{item.tab === 'Transfers' && activeJobs > 0 && <Text style={{ color: c.accent, fontWeight: '600' }}>{activeJobs}</Text>}</Pressable>)}</View>
        <View style={{ flex: 1, paddingTop: 34, paddingHorizontal: 12 }}><View style={[s.spread, { paddingLeft: 12 }]}><Text style={[s.muted, { fontSize: 12 }]}>YOUR PLAYLISTS</Text><IconButton name="plus" label="Create playlist" onPress={newPlaylist} /></View><ScrollView>{library.playlists.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => { setTab('Collection'); setPlaylistId(p.id); }} style={[s.row, { gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 8, backgroundColor: playlistId === p.id ? c.navActive : 'transparent' }]}><Icon name="music" size={16} color={c.muted} /><Text numberOfLines={1} style={[s.muted, { flex: 1 }]}>{p.name}</Text></Pressable>)}{!library.playlists.length && <Text style={[s.muted, { paddingHorizontal: 12, fontSize: 12 }]}>A mix for every mood.</Text>}</ScrollView></View>
        <View style={{ padding: 12, gap: 14 }}><View style={{ padding: 12, gap: 6 }}><View style={[s.row, { gap: 8 }]}><Icon name={online ? 'hard-drive' : 'wifi-off'} size={14} color={c.green} /><Text style={[s.label, { fontSize: 12 }]}>{online ? 'On this device' : 'You’re offline'}</Text></View><Text style={[s.muted, { fontSize: 12 }]}>{library.tracks.length} songs · {formatBytes(library.tracks.reduce((n, t) => n + t.size, 0))}</Text></View><Pressable accessibilityRole="button" onPress={() => go('Settings')} style={[styles.navItem, { marginHorizontal: 0, backgroundColor: tab === 'Settings' ? c.navActive : 'transparent' }]}><Icon name="settings" size={19} color={c.muted} /><Text style={s.muted}>Settings</Text></Pressable></View>
      </View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {!wide && <View style={styles.mobileHeader}><Brand small /><View style={s.row}>{!online && <Icon name="wifi-off" size={17} color={c.muted} />}<IconButton name="settings" label="Settings" onPress={() => go('Settings')} /></View></View>}
        <View style={{ flex: 1, minHeight: 0 }}>
          {tab === 'Collection' ? <Collection downloadSession={downloadSession} onOpenDownload={jobId => { if (downloadSession && (!jobId || jobId === downloadSession.jobId)) setDialog('add'); else go('Transfers'); }} player={player} onAdd={() => setDialog('add')} onTrackOptions={trackOptions} onFavorite={favorite} onNewPlaylist={newPlaylist} selectedPlaylist={selectedPlaylist} onSelectPlaylist={setPlaylistId} onPlaylistOptions={p => { setPlaylistId(p.id); setName(p.name); setDialog('playlist'); }} /> : tab === 'Transfers' ? <Transfers onAdd={() => setDialog('add')} /> : tab === 'Discover' ? <Discover onAdd={() => setDialog('add')} /> : <Settings onReset={() => setDialog('confirmReset')} />}
        </View>
      </View>
      {inspector && player.current && <View style={styles.inspector}><View style={s.spread}><Text style={s.section}>On the turntable</Text><IconButton name="maximize-2" label="Expand player" onPress={() => setDialog('player')} /></View><View style={{ alignItems: 'center', marginTop: 22, marginBottom: 24 }}><Sleeve name={player.current.album === 'Unknown album' ? player.current.title : player.current.album} size={218} record /></View><Text style={s.section}>{player.current.title}</Text><Text style={[s.muted, { marginTop: 7, marginBottom: 24 }]}>{player.current.artist}</Text><Controls player={player} full /><View style={{ marginTop: 36, gap: 14 }}><View style={s.spread}><Text style={s.label}>Up next</Text><Button quiet label="View queue" onPress={() => setDialog('queue')} /></View>{player.queue.slice(player.status.currentIndex + 1, player.status.currentIndex + 4).map(t => <Pressable key={t.id} accessibilityRole="button" onPress={() => void player.playTracks(player.queue.map(q => q.id), player.queue.indexOf(t))} style={[s.row, { gap: 10 }]}><Sleeve name={t.title} size={40} /><View style={{ flex: 1 }}><Text style={s.label} numberOfLines={1}>{t.title}</Text><Text style={s.muted} numberOfLines={1}>{t.artist}</Text></View></Pressable>)}</View></View>}
    </View>
    {notice && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.spread, { backgroundColor: c.ink, paddingLeft: 18, paddingRight: 5, paddingVertical: 4 }]}><Text style={[s.text, { color: c.surface, flex: 1 }]}>{notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => libraryStore.notify(null)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" color={c.surface} size={18} /></Pressable></View>}
    {showDownloadDock && dockDownload && <DownloadDock download={dockDownload} onOpen={() => { if (downloadSession) setDialog('add'); else go('Transfers'); }} />}
    <PlayerDock player={player} onExpand={() => setDialog('player')} onQueue={() => setDialog('queue')} />
    {!wide && <View style={styles.bottomNav}>{navigation.map(item => <Pressable key={item.tab} accessibilityRole="tab" accessibilityLabel={item.tab} accessibilityState={{ selected: tab === item.tab }} onPress={() => go(item.tab)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 64 }}><Icon name={item.icon} color={tab === item.tab ? c.accent : c.muted} size={21} /><Text style={{ fontSize: 11, fontWeight: '600', color: tab === item.tab ? c.accent : c.muted }}>{item.tab}{item.tab === 'Transfers' && activeJobs ? ` (${activeJobs})` : ''}</Text></Pressable>)}</View>}

    <AddMusic visible={dialog === 'add'} onClose={close} onTransfers={() => go('Transfers')} onDownloadUpdate={setDownloadSession} playlistId={selectedPlaylist?.id} />
    <NowPlaying visible={dialog === 'player'} player={player} onClose={close} onQueue={() => setDialog('queue')} onFavorite={() => player.current && favorite(player.current.id)} />
    {dialog === 'queue' && <Queue player={player} onClose={close} />}
    {dialog === 'confirmReset' && <Sheet title="Reset your local library?" onClose={close}><Text style={s.text}>All music saved in Lilt, playlists, favorites, and transfer history on this device will be removed. Your original imported files stay untouched.</Text><Button label="Remove all Lilt data" icon="trash-2" loading={saving} onPress={() => void submit(async () => { player.engine.pause(); await libraryStore.reset(); setPlaylistId(undefined); setTab('Collection'); })} /><Button secondary label="Keep my library" onPress={close} />{formError && <Text accessibilityRole="alert" style={{ color: c.danger }}>{formError}</Text>}</Sheet>}
    {dialog === 'newPlaylist' && <Sheet title="A new playlist" onClose={close}><Text style={s.muted}>Give your next soundtrack a name.</Text><TextInput accessibilityLabel="Playlist name" autoFocus value={name} onChangeText={setName} placeholder="Sunday kind of feeling" placeholderTextColor={c.muted} maxLength={100} style={s.input} /><Button label="Create playlist" loading={saving} icon="plus" onPress={() => void submit(async () => { if (!name.trim()) throw new Error('Give your playlist a name.'); const id = uid(); await libraryStore.mutate(l => ({ ...l, playlists: [...l.playlists, { id, name: name.trim(), trackIds: [], createdAt: Date.now() }] })); setTab('Collection'); setPlaylistId(id); })} />{formError && <Text accessibilityRole="alert" style={[s.text, { color: c.danger }]}>{formError}</Text>}</Sheet>}
    {dialog === 'track' && selectedTrack && <Sheet title="Song options" onClose={close}><View style={[s.row, { gap: 14 }]}><Sleeve name={selectedTrack.title} size={60} /><View style={{ flex: 1 }}><Text style={s.label}>{selectedTrack.title}</Text><Text style={s.muted}>{selectedTrack.artist} · {formatBytes(selectedTrack.size)}</Text></View></View><View>
      {option('Play next', 'skip-forward', () => { player.addQueue(selectedTrack.id, true); close(); })}
      {option('Add to queue', 'list', () => { player.addQueue(selectedTrack.id); close(); })}
      {option('Add to playlist', 'plus', () => setDialog('addToPlaylist'))}
      {option(selectedTrack.favorite ? 'Remove from favorites' : 'Add to favorites', 'heart', () => { favorite(selectedTrack.id); close(); })}
      {option('Edit song details', 'edit-2', () => { setName(selectedTrack.title); setArtist(selectedTrack.artist); setAlbum(selectedTrack.album); setDialog('editTrack'); })}
      {option('Export audio file', 'download', () => { void storage.exportTrack(selectedTrack).catch(libraryStore.report); close(); })}
      {selectedPlaylist && option('Remove from this playlist', 'minus-circle', () => { void libraryStore.mutate(l => ({ ...l, playlists: l.playlists.map(p => p.id === selectedPlaylist.id ? { ...p, trackIds: p.trackIds.filter(id => id !== selectedTrack.id) } : p) })).catch(libraryStore.report); close(); })}
      {selectedPlaylist && option('Move up in this playlist', 'arrow-up', () => { void libraryStore.mutate(l => ({ ...l, playlists: l.playlists.map(p => { if (p.id !== selectedPlaylist.id) return p; const ids = [...p.trackIds], i = ids.indexOf(selectedTrack.id); if (i > 0) [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; return { ...p, trackIds: ids }; }) })).catch(libraryStore.report); close(); })}
      {option('Delete from library', 'trash-2', () => setDialog('confirmTrack'), true)}
    </View></Sheet>}
    {dialog === 'editTrack' && selectedTrack && <Sheet title="Song details" onClose={close}>{[{ label: 'Title', value: name, set: setName }, { label: 'Artist', value: artist, set: setArtist }, { label: 'Album', value: album, set: setAlbum }].map(field => <View key={field.label} style={{ gap: 8 }}><Text style={s.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.set} style={s.input} maxLength={200} /></View>)}<Text style={s.muted}>These details apply in Lilt. The original audio file stays as it is.</Text><Button label="Save song details" loading={saving} onPress={() => void submit(async () => { if (!name.trim()) throw new Error('Enter a song title.'); await libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => t.id === selectedTrack.id ? { ...t, title: name.trim(), artist: artist.trim() || 'Unknown artist', album: album.trim() || 'Unknown album' } : t) })); })} />{formError && <Text accessibilityRole="alert" style={{ color: c.danger }}>{formError}</Text>}</Sheet>}
    {dialog === 'addToPlaylist' && selectedTrack && <Sheet title="Add to a playlist" onClose={close}>{!library.playlists.length && <Text style={s.muted}>Create your first playlist, then add this song from its options.</Text>}{library.playlists.map(p => option(`${p.name}${p.trackIds.includes(selectedTrack.id) ? ' · Already added' : ''}`, 'music', () => { void libraryStore.mutate(l => addToPlaylist(l, p.id, selectedTrack.id)).then(() => libraryStore.notify(`Added to ${p.name}.`)).catch(libraryStore.report); close(); }))}<Button secondary label="Create a playlist" icon="plus" onPress={newPlaylist} /></Sheet>}
    {dialog === 'playlist' && selectedPlaylist && <Sheet title="Playlist options" onClose={close}><Text style={s.label}>Playlist name</Text><TextInput accessibilityLabel="Rename playlist" value={name} onChangeText={setName} maxLength={100} style={s.input} /><Button label="Save playlist name" loading={saving} onPress={() => void submit(async () => { if (!name.trim()) throw new Error('Enter a playlist name.'); await libraryStore.mutate(l => ({ ...l, playlists: l.playlists.map(p => p.id === selectedPlaylist.id ? { ...p, name: name.trim() } : p) })); })} />{formError && <Text style={{ color: c.danger }}>{formError}</Text>}{option('Move playlist up', 'arrow-up', () => { void libraryStore.mutate(l => { const playlists = [...l.playlists], i = playlists.findIndex(p => p.id === selectedPlaylist.id); if (i > 0) [playlists[i - 1], playlists[i]] = [playlists[i], playlists[i - 1]]; return { ...l, playlists }; }).catch(libraryStore.report); close(); })}{option('Delete playlist', 'trash-2', () => setDialog('confirmPlaylist'), true)}</Sheet>}
    {(dialog === 'confirmTrack' || dialog === 'confirmPlaylist') && <Sheet title={dialog === 'confirmTrack' ? 'Delete this song?' : 'Delete this playlist?'} onClose={close}><Text style={s.text}>{dialog === 'confirmTrack' ? `“${selectedTrack?.title}” will be removed from Lilt and its playlists. The original file you imported stays untouched.` : `“${selectedPlaylist?.name}” will be removed. Its songs will stay in your library.`}</Text><Button label={dialog === 'confirmTrack' ? 'Delete song' : 'Delete playlist'} loading={saving} icon="trash-2" onPress={() => void submit(async () => { if (dialog === 'confirmTrack' && selectedTrack) { player.engine.pause(); await libraryStore.deleteTrack(selectedTrack.id); } else if (selectedPlaylist) { await libraryStore.mutate(l => ({ ...l, playlists: l.playlists.filter(p => p.id !== selectedPlaylist.id), jobs: l.jobs.map(j => j.playlistId === selectedPlaylist.id ? { ...j, playlistId: undefined } : j) })); setPlaylistId(undefined); } })} /><Button secondary label="Keep it" onPress={close} />{formError && <Text style={{ color: c.danger }}>{formError}</Text>}</Sheet>}
  </SafeAreaView>;
}
const createStyles = (c: ThemeColors) => StyleSheet.create({
  app: { flex: 1, backgroundColor: c.canvas },
  rail: { width: 228, backgroundColor: c.rail, borderRightWidth: 1, borderRightColor: c.line },
  navItem: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 13, marginHorizontal: 12, paddingHorizontal: 14, borderRadius: 9 },
  mobileHeader: { minHeight: 66, paddingLeft: 22, paddingRight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.line },
  bottomNav: { flexDirection: 'row', backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line },
  inspector: { width: 304, padding: 24, borderLeftWidth: 1, borderLeftColor: c.line, backgroundColor: c.inspector },
});
