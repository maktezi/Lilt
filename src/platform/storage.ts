import * as SQLite from 'expo-sqlite';
import * as FS from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { createAudioPlayer } from 'expo-audio';
import type { StorageAdapter, PickedFile } from './types';
import { MAX_BYTES, recoverLibrary, uid, type Library, type Track } from '../core/model';
import { inspectAudio } from '../core/metadata';
import { audioExtension, audioFilename, audioFileCandidates } from '../core/audio-files';
const root = `${FS.documentDirectory}lilt/`;
const audioPaths = new Map<string, string>();
let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  return database ??= (async () => {
    await FS.makeDirectoryAsync(root, { intermediates: true });
    await FS.makeDirectoryAsync(`${root}partial/`, { intermediates: true });
    const result = await SQLite.openDatabaseAsync('lilt.db');
    await result.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS library (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);');
    return result;
  })();
}
async function save(library: Library) {
  const database = await db();
  await database.runAsync('INSERT INTO library(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', JSON.stringify(library));
}
export const storage: StorageAdapter = {
  async load() {
    const database = await db(), record = await database.getFirstAsync<{ data: string }>('SELECT data FROM library WHERE id=1');
    const library = recoverLibrary(record ? JSON.parse(record.data) : null);
    audioPaths.clear();
    library.tracks = await Promise.all(library.tracks.map(async t => {
      const uri = `${root}${audioFilename(t)}`, legacy = `${root}${t.id}`;
      if (!(await FS.getInfoAsync(uri)).exists && (await FS.getInfoAsync(legacy)).exists) await FS.moveAsync({ from: legacy, to: uri });
      const available = (await FS.getInfoAsync(uri)).exists;
      if (available) audioPaths.set(t.id, uri);
      return { ...t, available };
    }));
    const known = new Set(library.tracks.map(audioFilename));
    for (const path of await FS.readDirectoryAsync(root)) {
      if (path !== 'partial' && !known.has(path)) await FS.deleteAsync(`${root}${path}`, { idempotent: true });
    }
    for (const path of await FS.readDirectoryAsync(`${root}partial/`)) await FS.deleteAsync(`${root}partial/${path}`, { idempotent: true });
    await save(library); return library;
  },
  save,
  async prepare(file: PickedFile) {
    if ((file.size || 0) > MAX_BYTES) throw new Error('This file exceeds the 100 MB per-track limit.');
    const info = await FS.getInfoAsync(file.uri);
    if (!info.exists || info.isDirectory) throw new Error('This file is no longer available. Select it again.');
    if (info.size > MAX_BYTES) throw new Error('This file exceeds the 100 MB per-track limit.');
    const bytes = await new File(file.uri).bytes();
    const metadata = inspectAudio(bytes, file.name);
    // AVFoundation uses the local path's extension to select its media reader.
    // Downloads and document-provider URIs may have no (or a misleading) extension.
    const id = uid(), staged = `${root}partial/${id}.${audioExtension(metadata.mime)}`;
    if (await FS.getFreeDiskStorageAsync() < bytes.length + 1024 * 1024) throw new Error('Device storage is full. Free some space and retry.');
    try {
      await FS.copyAsync({ from: file.uri, to: staged });
      const probe = createAudioPlayer({ uri: staged });
      try {
        metadata.duration = await new Promise<number>((resolve, reject) => {
          const timer = setTimeout(() => { subscription.remove(); reject(new Error('Audio validation timed out. Retry the download or try the fallback.')); }, 12_000);
          const subscription = probe.addListener('playbackStatusUpdate', status => {
            if (status.error || status.isLoaded) {
              clearTimeout(timer); subscription.remove();
              if (status.error) reject(new Error('The downloaded audio is damaged or uses an unsupported codec. Retry or try the fallback.'));
              else resolve(status.duration);
            }
          });
          if (probe.isLoaded) { clearTimeout(timer); subscription.remove(); resolve(probe.duration); }
        });
      } finally { probe.remove(); }
      const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
      const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
      const track: Track = { ...metadata, id, hash, filename: file.name, size: bytes.length, addedAt: Date.now(), favorite: false, available: true };
      return { track, uri: staged };
    } catch (error) { await FS.deleteAsync(staged, { idempotent: true }).catch(() => {}); throw error; }
  },
  async commit(library, prepared) {
    const uri = `${root}${audioFilename(prepared.track)}`;
    await FS.moveAsync({ from: prepared.uri!, to: uri });
    try { await save(library); audioPaths.set(prepared.track.id, uri); }
    catch (error) { await FS.deleteAsync(uri, { idempotent: true }); throw error; }
  },
  async remove(id, library) {
    await save(library); audioPaths.delete(id);
    await Promise.all(audioFileCandidates(id).map(name => FS.deleteAsync(`${root}${name}`, { idempotent: true }).catch(() => {})));
  },
  async reset(library) {
    await save(library);
    audioPaths.clear();
    for (const filename of await FS.readDirectoryAsync(root)) if (filename !== 'partial') await FS.deleteAsync(`${root}${filename}`, { idempotent: true }).catch(() => {});
  },
  async resolve(id) {
    const cached = audioPaths.get(id);
    if (cached && (await FS.getInfoAsync(cached)).exists) return cached;
    for (const filename of audioFileCandidates(id)) {
      const uri = `${root}${filename}`;
      if ((await FS.getInfoAsync(uri)).exists) { audioPaths.set(id, uri); return uri; }
    }
    throw new Error('This audio file is missing. Import it again.');
  },
  release() {},
  async download(url, id, signal, onProgress) {
    await db();
    const destination = `${root}partial/${id}`;
    let oversized = false;
    const task = FS.createDownloadResumable(url, destination, {}, progress => {
      onProgress(progress.totalBytesWritten, progress.totalBytesExpectedToWrite);
      if (progress.totalBytesWritten > MAX_BYTES || progress.totalBytesExpectedToWrite > MAX_BYTES) {
        oversized = true; void task.cancelAsync();
      }
    });
    const abort = () => { void task.cancelAsync().catch(() => {}); };
    signal.addEventListener('abort', abort);
    try {
      if (signal.aborted) throw new Error('Cancelled');
      const result = await task.downloadAsync();
      if (oversized) throw new Error('This file exceeds the 100 MB per-track limit.');
      if (signal.aborted || !result) throw new Error('Cancelled');
      if (result.status < 200 || result.status >= 300) throw new Error(`The audio server returned HTTP ${result.status}. Check the link and retry.`);
      const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Audio download');
      return { name, uri: result.uri };
    } finally { signal.removeEventListener('abort', abort); }
  },
  async cleanup(id) { await Promise.all(audioFileCandidates(id).map(name => FS.deleteAsync(`${root}partial/${name}`, { idempotent: true }))); },
  async exportTrack(track) {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable on this device.');
    const source = await storage.resolve(track.id), name = track.filename.replace(/[^a-zA-Z0-9._ -]/g, '_');
    const target = `${FS.cacheDirectory}${name}`;
    await FS.copyAsync({ from: source, to: target });
    try { await Sharing.shareAsync(target, { mimeType: track.mime }); } finally { await FS.deleteAsync(target, { idempotent: true }); }
  },
  async exportMetadata(library) {
    const uri = `${FS.cacheDirectory}lilt-library.json`;
    await FS.writeAsStringAsync(uri, JSON.stringify({ version: 1, tracks: library.tracks, playlists: library.playlists }, null, 2));
    try { await Sharing.shareAsync(uri, { mimeType: 'application/json' }); } finally { await FS.deleteAsync(uri, { idempotent: true }); }
  },
  async storageInfo() { return { quota: await FS.getTotalDiskCapacityAsync(), used: (await FS.getTotalDiskCapacityAsync()) - (await FS.getFreeDiskStorageAsync()), persistent: true }; },
  async requestPersistence() { return true; },
};
