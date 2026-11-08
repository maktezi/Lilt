import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { libraryStore, useLibrary } from '../state/library';
import { parseBatch } from '../core/sources';
import { Button, Icon, Sheet } from './components';
import { colors as c, common as s } from './theme';
export function AddMusic({ onClose, onTransfers, playlistId }: { onClose: () => void; onTransfers: () => void; playlistId?: string }) {
  const { importing, library } = useLibrary();
  const [mode, setMode] = useState<'files' | 'links'>('files');
  const [input, setInput] = useState(''), [error, setError] = useState('');
  const [review, setReview] = useState<ReturnType<typeof parseBatch> | null>(null);
  const [busy, setBusy] = useState(false);
  const playlist = library.playlists.find(p => p.id === playlistId);
  async function pick() {
    try {
      setError('');
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*', 'application/octet-stream'], multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) { await libraryStore.importFiles(result.assets, playlistId); onClose(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'The file picker could not open. Try again.'); }
  }
  async function start() {
    try { setBusy(true); await libraryStore.enqueue(input, playlistId); onClose(); onTransfers(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start this batch.'); }
    finally { setBusy(false); }
  }
  return <Sheet title="Add music" onClose={onClose}>
    <Text style={s.muted}>{playlist ? `Add songs to “${playlist.name}”.` : 'Bring your own music. Keep it with you.'}</Text>
    <View style={[s.row, { backgroundColor: c.rail, padding: 4, borderRadius: 12 }]}>{(['files', 'links'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} onPress={() => { setMode(item); setError(''); }} style={{ flex: 1, minHeight: 48, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === item ? c.surface : 'transparent' }}><Text style={s.label}>{item === 'files' ? 'Import files' : 'Paste links'}</Text></Pressable>)}</View>
    {mode === 'files' ? <>
      <View style={{ alignItems: 'center', padding: 24, gap: 16, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed', borderRadius: 12 }}><Icon name="folder-plus" size={32} color={c.accent} /><Text style={[s.section, { textAlign: 'center' }]}>Make yourself at home.</Text><Text style={[s.muted, { textAlign: 'center' }]}>Choose MP3, M4A, or WAV files. Lilt saves its own copy and skips exact duplicates.</Text><Button label={importing ? 'Importing songs…' : 'Choose audio files'} icon="upload" onPress={() => void pick()} loading={importing} /></View>
      <Text style={s.muted}>Up to 100 MB per song. {Platform.OS === 'web' ? 'Files stay in this browser. Clearing site data removes them.' : 'Files stay in app storage. Uninstalling Lilt removes them.'}</Text>
    </> : <>
      <Text style={s.label}>Direct audio links</Text>
      <TextInput accessibilityLabel="Direct audio links" value={input} onChangeText={text => { setInput(text); setReview(null); setError(''); }} multiline autoCapitalize="none" autoCorrect={false} placeholder={'https://example.com/song.mp3\nOne link per line'} placeholderTextColor={c.muted} style={[s.input, { minHeight: 130, textAlignVertical: 'top' }]} />
      <Text style={s.muted}>Use links you have permission to download. YouTube and Spotify connections are not available yet.{Platform.OS === 'web' ? ' The audio server must also permit browser access (CORS).' : ''}</Text>
      {review && <View style={{ gap: 10, padding: 16, backgroundColor: c.rail, borderRadius: 12 }}><Text style={s.label}>{review.length} {review.length === 1 ? 'link' : 'links'} to check and download</Text>{review.slice(0, 5).map(source => <View key={source.url}><Text style={s.text} numberOfLines={1}>{source.name}</Text><Text style={s.muted} numberOfLines={1}>{new URL(source.safeUrl).hostname}</Text></View>)}{review.length > 5 && <Text style={s.muted}>And {review.length - 5} more</Text>}<Text style={s.muted}>Each file is validated before it joins your library. Unsupported links will appear as failed transfers.</Text></View>}
      <Button label={review ? `Download ${review.length === 1 ? 'audio' : `${review.length} files`}` : 'Review links'} icon={review ? 'download' : 'arrow-right'} loading={busy} onPress={() => { if (review) void start(); else try { setReview(parseBatch(input)); setError(''); } catch (e) { setError((e as Error).message); } }} />
    </>}
    {error ? <Text accessibilityRole="alert" style={[s.text, { color: c.danger }]}>{error}</Text> : null}
  </Sheet>;
}
