import React, { useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { libraryStore, useLibrary } from '../state/library';
import { converters, parseBatch, youtubeVideoLink } from '../core/sources';
import { providerForQuality, type AudioQuality, type ConverterProvider } from '../core/converter';
import type { DownloadSummary } from '../core/download-status';
import { Converter } from './Converter';
import { Button, Icon, Sheet } from './components';
import { useTheme } from './theme';
export function AddMusic({ visible, onClose, onTransfers, onDownloadUpdate, playlistId }: { visible: boolean; onClose: () => void; onTransfers: () => void; onDownloadUpdate: (summary: DownloadSummary | null) => void; playlistId?: string }) {
  const { colors: c, common: s } = useTheme();
  const { importing, library } = useLibrary();
  const [mode, setMode] = useState<'files' | 'links' | 'youtube'>('files');
  const [input, setInput] = useState(''), [error, setError] = useState('');
  const [youtubeInput, setYoutubeInput] = useState(''), [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [converter, setConverter] = useState<ConverterProvider | null>(null), [quality, setQuality] = useState<AudioQuality>(320);
  const [converterPlaylistId, setConverterPlaylistId] = useState<string | undefined>();
  const [review, setReview] = useState<ReturnType<typeof parseBatch> | null>(null);
  const [busy, setBusy] = useState(false);
  const playlist = library.playlists.find(p => p.id === playlistId);
  const videoLink = youtubeVideoLink(youtubeInput);
  function editLinks(text: string) {
    setInput(text); setReview(null); setError('');
    if (youtubeVideoLink(text)) { setYoutubeInput(text); setMode('youtube'); setCopied(false); setOpened(null); }
  }
  async function copyVideoLink() {
    if (!videoLink) return;
    try {
      setError('');
      if (!await Clipboard.setStringAsync(videoLink)) throw new Error('Clipboard unavailable');
      setCopied(true);
    } catch { setError('Could not copy the link. Select and copy it from the field above, then paste it on the converter site.'); }
  }
  function openConverter(provider: keyof typeof converters) {
    setError('');
    if (Platform.OS !== 'web') { setConverterPlaylistId(playlistId); setConverter(provider); onClose(); return; }
    // Open directly from the press so browsers do not block a delayed popup.
    void Linking.openURL(converters[provider].url)
      .then(() => setOpened(converters[provider].name))
      .catch(() => setError(`Could not open ${converters[provider].name}. Try the other converter, or open ${converters[provider].url} in your browser.`));
  }
  async function pick() {
    try {
      setError('');
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'application/octet-stream'], multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) { await libraryStore.importFiles(result.assets, playlistId); onClose(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'The file picker could not open. Try again.'); }
  }
  async function start() {
    try { setBusy(true); await libraryStore.enqueue(input, playlistId); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start this batch.'); }
    finally { setBusy(false); }
  }
  if (converter && videoLink) return <Converter visible={visible} playlistId={converterPlaylistId} onMinimize={onClose} onUpdate={onDownloadUpdate} videoLink={videoLink} quality={quality} provider={converter} onClose={() => { setConverter(null); onClose(); }} onDone={() => { setConverter(null); onClose(); }} onDownload={async (url, filename, signal, progress) => {
    await libraryStore.downloadAndWait(url, filename, converterPlaylistId, signal, job => {
      progress({ phase: job.state === 'verifying' || job.state === 'completed' ? 'saving' : 'downloading', received: job.received, total: job.total, jobId: job.id });
    });
  }} />;
  return <Sheet visible={visible} title="Add music" onClose={onClose}>
    <Text style={s.muted}>{playlist ? `Add songs to “${playlist.name}”.` : 'Bring your own music. Keep it with you.'}</Text>
    <View style={[s.row, { backgroundColor: c.rail, padding: 4, borderRadius: 12 }]}>{(['files', 'links', 'youtube'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} aria-selected={mode === item} onPress={() => { setMode(item); setError(''); }} style={{ flex: 1, minHeight: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === item ? c.surface : 'transparent' }}><Text style={s.label}>{item === 'files' ? 'Import files' : item === 'links' ? 'Paste links' : 'YouTube'}</Text></Pressable>)}</View>
    {mode === 'files' ? <>
      <View style={{ alignItems: 'center', padding: 24, gap: 16, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed', borderRadius: 12 }}><Icon name="folder-plus" size={32} color={c.accent} /><Text style={[s.section, { textAlign: 'center' }]}>Make yourself at home.</Text><Text style={[s.muted, { textAlign: 'center' }]}>Choose MP3, M4A, or WAV files. Lilt saves its own copy and skips exact duplicates.</Text><Button label={importing ? 'Importing songs…' : 'Choose audio files'} icon="upload" onPress={() => void pick()} loading={importing} /></View>
      <Text style={s.muted}>Up to 100 MB per song. {Platform.OS === 'web' ? 'Files stay in this browser. Clearing site data removes them.' : 'Files stay in app storage. Uninstalling Lilt removes them.'}</Text>
    </> : mode === 'youtube' ? <>
      <View style={{ gap: 6 }}><Text style={s.section}>From link to library</Text><Text style={s.muted}>{Platform.OS === 'web' ? 'Copy your video link, convert it in your browser, then return here to import the MP3.' : 'Paste a video link, choose audio quality, and save the song to your collection.'}</Text></View>
      <View style={{ gap: 10 }}>
        <Text style={s.label}>YouTube video link</Text>
        <TextInput accessibilityLabel="YouTube video link" value={youtubeInput} onChangeText={text => { setYoutubeInput(text); setCopied(false); setOpened(null); setError(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://www.youtube.com/watch?v=…" placeholderTextColor={c.muted} style={s.input} />
        {youtubeInput.trim() && !videoLink ? <Text accessibilityRole="alert" style={[s.muted, { color: c.danger }]}>Paste one YouTube video link. Playlist links need an individual video.</Text> : null}
        {Platform.OS === 'web' ? <Button secondary label={copied ? 'Link copied — ready to paste' : 'Copy video link'} icon={copied ? 'check' : 'copy'} disabled={!videoLink} onPress={() => void copyVideoLink()} /> : null}
      </View>
      <View style={{ gap: 10 }}>
        {Platform.OS === 'web' ? <Text style={s.label}>Choose a converter</Text> : null}
        {Platform.OS === 'web' ? <Text style={s.muted}>{converters.flvto.quality}. For a smaller file, choose a lower bitrate.</Text> : <View style={{ gap: 10 }}><Text style={s.label}>MP3 quality</Text><View style={[s.row, { gap: 8, flexWrap: 'wrap' }]}>{([128, 192, 256, 320] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} kbps`} accessibilityState={{ checked: quality === value }} onPress={() => setQuality(value)} style={{ minHeight: 48, padding: 12, borderRadius: 10, backgroundColor: quality === value ? c.accent : c.rail }}><Text style={[s.label, { color: quality === value ? c.onAccent : c.ink }]}>{value} kbps</Text></Pressable>)}</View><Text style={s.muted}>Higher bitrates make larger files. If a source is unavailable, 192 kbps uses the alternate source directly.</Text></View>}
        <Button label={Platform.OS === 'web' ? 'Open Flvto' : 'Download audio'} icon={Platform.OS === 'web' ? 'external-link' : 'download'} disabled={Platform.OS !== 'web' && !videoLink} onPress={() => openConverter(Platform.OS === 'web' ? 'flvto' : providerForQuality(quality))} />
        {Platform.OS === 'web' ? <><Text style={s.muted}>Flvto unavailable? Try YTMP3. {converters.ytmp3.quality}.</Text><Button secondary label="Open YTMP3 fallback" icon="external-link" onPress={() => openConverter('ytmp3')} /></> : null}
      </View>
      {Platform.OS === 'web' ? <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 20 }}>
        <Text style={s.label}>Bring the MP3 back to Lilt</Text>
        <Text style={s.muted}>{opened ? `After downloading from ${opened}, ` : 'After downloading, '}choose the saved MP3 from your Downloads folder. It joins {playlist ? `“${playlist.name}”` : 'your collection'} for offline listening.</Text>
        <Button label={importing ? 'Importing songs…' : 'Import downloaded MP3'} icon="upload" loading={importing} onPress={() => void pick()} />
      </View> : null}
      <Text style={s.muted}>{Platform.OS === 'web' ? 'Converters open outside Lilt.' : 'Conversion is provided by third-party sites inside Lilt.'} Availability and output quality depend on the site and source audio. Convert content you have permission to download.</Text>
    </> : <>
      <Text style={s.label}>Direct audio links</Text>
      <TextInput accessibilityLabel="Direct audio links" value={input} onChangeText={editLinks} multiline autoCapitalize="none" autoCorrect={false} placeholder={'https://example.com/song.mp3\nOne link per line'} placeholderTextColor={c.muted} style={[s.input, { minHeight: 130, textAlignVertical: 'top' }]} />
      <Text style={s.muted}>Use direct audio links you have permission to download. For YouTube, use the YouTube tab. Spotify links are not supported.{Platform.OS === 'web' ? ' The audio server must also permit browser access (CORS).' : ''}</Text>
      {review && <View style={{ gap: 10, padding: 16, backgroundColor: c.rail, borderRadius: 12 }}><Text style={s.label}>{review.length} {review.length === 1 ? 'link' : 'links'} to check and download</Text>{review.slice(0, 5).map(source => <View key={source.url}><Text style={s.text} numberOfLines={1}>{source.name}</Text><Text style={s.muted} numberOfLines={1}>{new URL(source.safeUrl).hostname}</Text></View>)}{review.length > 5 && <Text style={s.muted}>And {review.length - 5} more</Text>}<Text style={s.muted}>Each file is validated before it joins your library. Unsupported links will appear as failed transfers.</Text></View>}
      <Button label={review ? `Download ${review.length === 1 ? 'audio' : `${review.length} files`}` : 'Review links'} icon={review ? 'download' : 'arrow-right'} loading={busy} onPress={() => { if (review) void start(); else try { setReview(parseBatch(input)); setError(''); } catch (e) { setError((e as Error).message); } }} />
    </>}
    {error ? <Text accessibilityRole="alert" style={[s.text, { color: c.danger }]}>{error}</Text> : null}
  </Sheet>;
}
