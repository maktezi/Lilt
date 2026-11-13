import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { YouTubePlaylist } from '../core/youtube-playlist';
import { providerForQuality, type AudioQuality } from '../core/converter';
import type { DownloadSummary } from '../core/download-status';
import { mergePlaylistOrder } from '../core/playlist-order';
import { libraryStore } from '../state/library';
import { Converter } from './Converter';
import { Button, Sheet } from './components';
import { useTheme } from './theme';

export function PlaylistDownload({ batch, quality, playlistId, visible, onMinimize, onClose, onUpdate }: {
  batch: YouTubePlaylist; quality: AudioQuality; playlistId: string; visible: boolean;
  onMinimize: () => void; onClose: () => void; onUpdate: (summary: DownloadSummary | null) => void;
}) {
  const { common: s } = useTheme();
  const [index, setIndex] = useState(0), [saved, setSaved] = useState(0), [skipped, setSkipped] = useState<number[]>([]);
  const [retry, setRetry] = useState<number[] | null>(null);
  const acquired = useRef(new Map<number, string>());
  const order = retry || batch.entries.map((_, i) => i);
  const entry = batch.entries[order[index]];
  const update = useCallback((summary: DownloadSummary | null) => onUpdate(summary ? { ...summary, title: `${index + 1}/${order.length} · ${summary.title}`, playlistId } : null), [index, order.length, onUpdate, playlistId]);
  useEffect(() => { if (!entry) onUpdate({ title: `${batch.title} · ${saved} songs saved`, phase: 'complete', percent: 100, received: 0, total: 0, error: null, playlistId }); }, [entry, saved, batch.title, playlistId, onUpdate]);
  if (!entry) return <Sheet visible={visible} title="Playlist download finished" onClose={onClose}>
    <Text style={s.section}>{batch.title}</Text>
    <Text style={s.text}>{saved} songs saved · {skipped.length} skipped · {batch.unavailable} unavailable</Text>
    <Text style={s.muted}>Saved songs are ready offline. Skipped songs can be retried. Keep Lilt open during a playlist download; closing the app ends the batch.</Text>
    {skipped.length > 0 && <Button secondary label={`Retry ${skipped.length} skipped songs`} icon="refresh-cw" onPress={() => { setRetry(skipped); setSkipped([]); setIndex(0); }} />}
    <Button label="Back to my music" icon="check" onPress={onClose} />
  </Sheet>;
  return <View style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'box-none' }}>
    <Converter key={`${retry ? 'retry' : 'initial'}-${index}-${order[index]}`} visible={visible} videoLink={entry.url} quality={quality} provider={providerForQuality(quality)} playlistId={playlistId}
      batchLabel={`${batch.title} · ${index + 1} of ${order.length}`} autoAdvance onSkip={() => { setSkipped(items => [...items, order[index]]); setIndex(i => i + 1); }}
      onMinimize={onMinimize} onClose={onClose} onUpdate={update} onDone={() => { setSaved(n => n + 1); setIndex(i => i + 1); }}
      onDownload={async (url, filename, signal, progress) => {
        let trackId: string | undefined;
        await libraryStore.downloadAndWait(url, entry.title === 'YouTube audio' ? filename : `${entry.title}.mp3`, playlistId, signal, job => {
          if (job.state === 'completed') trackId = job.trackId;
          progress({ phase: job.state === 'verifying' || job.state === 'completed' ? 'saving' : 'downloading', received: job.received, total: job.total, jobId: job.id });
        });
        if (trackId) {
          acquired.current.set(order[index], trackId);
          await libraryStore.mutate(l => ({ ...l, playlists: l.playlists.map(p => p.id === playlistId ? { ...p, trackIds: mergePlaylistOrder(p.trackIds, acquired.current) } : p) }));
        }
      }} />
  </View>;
}
