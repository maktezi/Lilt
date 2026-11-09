import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { libraryStore, useLibrary } from '../state/library';
import { storage } from '../platform/storage';
import { formatBytes } from '../core/model';
import { Button, Empty, Icon, IconButton, type IconName } from './components';
import { useTheme } from './theme';
function Page({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { colors: c, common: s } = useTheme();
  return <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 38, paddingBottom: 48, gap: 28 }}><View><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={[s.muted, { marginTop: 7 }]}>{description}</Text></View>{children}</ScrollView>;
}
export function Transfers({ onAdd }: { onAdd: () => void }) {
  const { colors: c, common: s } = useTheme();
  const { library } = useLibrary();
  const active = library.jobs.filter(j => ['queued', 'downloading', 'verifying'].includes(j.state));
  const batches = [...new Set(library.jobs.map(j => j.batchId))];
  return <Page title="Transfers" description="A little patience. A lot of music to keep.">
    <View style={s.spread}><Text style={s.label}>{active.length ? `${active.length} in progress` : `${library.jobs.length} transfers`}</Text><Button icon="plus" label="Add music" onPress={onAdd} /></View>
    {active.length > 0 && <View style={s.spread}><Text style={[s.muted, { flex: 1 }]}>Two transfers at a time. Your collection stays available.</Text><Button quiet label="Cancel remaining" onPress={() => void libraryStore.cancelAll().catch(libraryStore.report)} /></View>}
    {!library.jobs.length && <Empty icon="download" title="Ready when you are." detail="Add direct audio links to follow their progress here. Imported files appear straight in your collection." action={<Button label="Add an audio link" icon="plus" onPress={onAdd} />} />}
    {batches.map(batchId => {
      const jobs = library.jobs.filter(j => j.batchId === batchId).sort((a, b) => a.order - b.order);
      const completed = jobs.filter(j => j.state === 'completed').length;
      return <View key={batchId} style={{ gap: 10 }}><View style={s.spread}><Text style={s.section}>{jobs.length > 1 ? `${jobs.length}-track batch` : 'Audio download'}</Text><Text style={s.muted}>{completed} of {jobs.length} saved</Text></View>
        {jobs.map(job => <View key={job.id} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line, gap: 10 }}>
          <View style={[s.row, { gap: 13 }]}><View style={{ padding: 12, backgroundColor: job.state === 'completed' ? c.greenSoft : c.rail, borderRadius: 10 }}><Icon name={job.state === 'completed' ? 'check' : job.state === 'failed' ? 'alert-circle' : 'download'} color={job.state === 'failed' ? c.danger : c.green} /></View><View style={{ flex: 1 }}><Text style={s.label} numberOfLines={1}>{job.name}</Text><Text style={s.muted}>{({ queued: 'Waiting', downloading: 'Downloading', verifying: 'Checking audio', completed: 'Saved to collection', failed: 'Transfer failed', cancelled: 'Cancelled' })[job.state]}{job.received ? ` · ${formatBytes(job.received)}${job.total > 0 ? ` / ${formatBytes(job.total)}` : ''}` : ''}</Text></View>{['failed', 'cancelled'].includes(job.state) ? <IconButton name="refresh-cw" label={`Retry ${job.name}`} onPress={() => void libraryStore.retry(job.id).catch(libraryStore.report)} /> : ['queued', 'downloading', 'verifying'].includes(job.state) ? <IconButton name="x" label={`Cancel ${job.name}`} onPress={() => void libraryStore.cancel(job.id).catch(libraryStore.report)} /> : null}</View>
          {['downloading', 'verifying'].includes(job.state) && <View accessibilityRole="progressbar" accessibilityValue={job.total ? { min: 0, max: 100, now: Math.min(100, Math.round(job.received / job.total * 100)) } : { text: 'Downloading' }} style={{ height: 4, backgroundColor: c.line, borderRadius: 2 }}><View style={{ height: 4, width: `${job.total > 0 ? Math.min(100, job.received / job.total * 100) : 8}%`, backgroundColor: c.accent, borderRadius: 2 }} /></View>}
          {job.error && <Text style={[s.muted, { color: job.state === 'failed' ? c.danger : c.muted }]}>{job.error}</Text>}
        </View>)}
      </View>;
    })}
    {library.jobs.some(j => ['completed', 'cancelled', 'failed'].includes(j.state)) && <Button quiet label="Clear finished transfers" icon="trash-2" onPress={() => void libraryStore.mutate(l => ({ ...l, jobs: l.jobs.filter(j => ['queued', 'downloading', 'verifying'].includes(j.state)) })).catch(libraryStore.report)} />}
  </Page>;
}
export function Discover({ onAdd }: { onAdd: () => void }) {
  const { colors: c, common: s } = useTheme();
  return <Page title="Discover" description="A wider world of music, in time.">
    <View style={{ backgroundColor: c.greenSoft, padding: 28, borderRadius: 16, gap: 16 }}><Icon name="compass" size={36} color={c.green} /><Text style={s.section}>Good discoveries take a little care.</Text><Text style={[s.text, { maxWidth: 570 }]}>Playlist discovery and source matching are planned for Lilt. Import your own audio files or permitted direct links. For individual YouTube videos, open Add music and choose the YouTube tab.</Text><View style={{ alignItems: 'flex-start' }}><Button label="Add your music" icon="plus" onPress={onAdd} /></View></View>
    {([{ icon: 'list', name: 'Spotify playlists', detail: 'Discovery and track matching need an approved provider connection.' }, { icon: 'play-circle', name: 'YouTube playlists', detail: 'Playlist metadata and audio acquisition need separate provider authorization.' }, { icon: 'globe', name: 'PH & global charts', detail: 'Source, market, ranking period, and refresh time will be shown when chart access is connected.' }] as { icon: IconName; name: string; detail: string }[]).map(item => <View key={item.name} style={[s.row, { alignItems: 'flex-start', gap: 16, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: c.line }]}><Icon name={item.icon} color={c.muted} /><View style={{ flex: 1, gap: 6 }}><Text style={s.label}>{item.name}</Text><Text style={s.muted}>{item.detail}</Text><Text style={[s.muted, { color: c.accent, fontWeight: '600' }]}>Not connected</Text></View></View>)}
  </Page>;
}
export function Settings({ onReset }: { onReset: () => void }) {
  const { colors: c, common: s, preference, setPreference, ready: appearanceReady, error: appearanceError } = useTheme();
  const { library } = useLibrary();
  const [info, setInfo] = useState<{ used?: number; quota?: number; persistent?: boolean }>({});
  const [checking, setChecking] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const bytes = library.tracks.reduce((sum, t) => sum + t.size, 0);
  useEffect(() => { void storage.storageInfo().then(setInfo).catch(libraryStore.report); }, [bytes]);
  return <Page title="Settings" description="A few things to make yourself at home.">
    <View style={{ gap: 16 }}>
      <Text style={s.section}>Appearance</Text>
      <Text style={s.muted}>Choose a look, or let Lilt follow your device.</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ gap: 2 }}>
        {([{ value: 'system', label: 'Device default', icon: 'smartphone' }, { value: 'light', label: 'Light', icon: 'sun' }, { value: 'dark', label: 'Dark', icon: 'moon' }] as const).map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: preference === option.value, disabled: !appearanceReady || savingAppearance }} aria-checked={preference === option.value} disabled={!appearanceReady || savingAppearance} onPress={() => { setSavingAppearance(true); void setPreference(option.value).finally(() => setSavingAppearance(false)); }} style={({ pressed }) => [s.row, { gap: 14, minHeight: 56, paddingHorizontal: 14, borderRadius: 10, backgroundColor: preference === option.value ? c.accentSoft : pressed ? c.rail : 'transparent' }]}>
          <Icon name={option.icon} color={preference === option.value ? c.accent : c.muted} size={20} /><Text style={[s.label, { flex: 1 }]}>{option.label}</Text><Icon name={preference === option.value ? 'check-circle' : 'circle'} color={preference === option.value ? c.accent : c.muted} size={20} />
        </Pressable>)}
      </View>
      {appearanceError ? <Text accessibilityRole="alert" style={[s.muted, { color: c.danger }]}>{appearanceError}</Text> : null}
    </View><View style={s.divider} />
    <View style={{ gap: 18 }}><Text style={s.section}>On this device</Text><View style={s.spread}><Text style={s.text}>Saved music</Text><Text style={s.label}>{formatBytes(bytes)} · {library.tracks.length} tracks</Text></View><Text style={s.muted}>{Platform.OS === 'web' ? 'Music is stored in this browser. Clearing site data, private browsing, or browser eviction can remove it. Export files you want to keep elsewhere.' : 'Music is copied into persistent app storage. Uninstalling the app removes your library. Original imported files stay untouched.'}</Text>{info.quota ? <Text style={s.muted}>{formatBytes(info.used || 0)} of {formatBytes(info.quota)} {Platform.OS === 'web' ? 'browser storage' : 'device storage'} used</Text> : null}
      {Platform.OS === 'web' && <View style={{ gap: 12 }}><Text style={s.label}>{info.persistent ? 'Persistent browser storage granted' : 'Browser storage may be evicted'}</Text><Button secondary label="Request persistent storage" icon="shield" loading={checking} onPress={() => { setChecking(true); void storage.requestPersistence().then(granted => { libraryStore.notify(granted ? 'Persistent storage granted. Export backups before clearing site data.' : 'This browser did not grant persistence. Keep an exported copy of your music.'); return storage.storageInfo(); }).then(setInfo).catch(libraryStore.report).finally(() => setChecking(false)); }} /></View>}
    </View><View style={s.divider} />
    <View style={{ gap: 16 }}><Text style={s.section}>Take a copy</Text><Text style={s.muted}>Export your track details, favorites, and playlists as JSON. Audio files can be exported individually from each song’s options.</Text><Button secondary icon="download" label="Export library metadata" onPress={() => void storage.exportMetadata(library).catch(libraryStore.report)} /></View><View style={s.divider} />
    <View style={{ gap: 12 }}><Text style={s.section}>Simple by choice</Text><Text style={s.muted}>No account is needed for your local collection. Audio files and listening history are not uploaded to Lilt. Direct downloads connect to the audio host you choose. YouTube conversion uses third-party sites with their own privacy policies.</Text><Text style={s.muted}>Lilt 0.1.0 · Local player preview</Text></View><View style={s.divider} /><View style={{ gap: 12 }}><Text style={s.section}>Start fresh</Text><Text style={s.muted}>Remove Lilt’s saved music, playlists, favorites, and transfer history from this device.</Text><Button quiet label="Reset local library" icon="trash-2" onPress={onReset} /></View>
  </Page>;
}
