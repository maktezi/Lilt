import type { StorageAdapter, PickedFile, Prepared } from './types';
import { MAX_BYTES, recoverLibrary, uid, type Library, type Track } from '../core/model';
import { inspectAudio } from '../core/metadata';
let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('lilt-library', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('state'); request.result.createObjectStore('audio'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage could not open. Allow site storage, then reload.'));
    request.onblocked = () => reject(new Error('Close other Lilt tabs and reload to update storage.'));
  });
}
function get<T>(database: IDBDatabase, store: string, key: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function transaction(library: Library, prepared?: Prepared, removeId?: string) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction(['state', 'audio'], 'readwrite');
    tx.objectStore('state').put(library, 'library');
    if (prepared) tx.objectStore('audio').put(prepared.blob, prepared.track.id);
    if (removeId) tx.objectStore('audio').delete(removeId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'Browser storage is full. Free space and retry.' : 'Could not save your library. Check available storage.'));
    tx.onabort = () => reject(new Error('The save was interrupted. Your existing library is unchanged.'));
  });
}
const objectUrls = new Map<string, string>();
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export const storage: StorageAdapter = {
  async load() {
    const database = await db(), library = recoverLibrary(await get(database, 'state', 'library'));
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = database.transaction('audio').objectStore('audio').getAllKeys();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const present = new Set(keys);
    library.tracks = library.tracks.map(t => ({ ...t, available: present.has(t.id) }));
    await transaction(library); return library;
  },
  save: transaction,
  async prepare(file: PickedFile) {
    const blob = file.file || await (await fetch(file.uri)).blob();
    if (blob.size > MAX_BYTES) throw new Error('This file exceeds the 100 MB per-track limit.');
    const bytes = new Uint8Array(await blob.arrayBuffer()), metadata = inspectAudio(bytes, file.name);
    const probe = new Audio(), probeUrl = URL.createObjectURL(blob);
    try {
      metadata.duration = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('This audio file could not be decoded. Try another file.')), 12_000);
        probe.onloadedmetadata = () => { clearTimeout(timer); resolve(Number.isFinite(probe.duration) ? probe.duration : metadata.duration); };
        probe.onerror = () => { clearTimeout(timer); reject(new Error('This audio file could not be decoded. Try another file.')); };
        probe.preload = 'metadata'; probe.src = probeUrl;
      });
    } finally { probe.removeAttribute('src'); probe.load(); URL.revokeObjectURL(probeUrl); }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    const track: Track = { ...metadata, id: uid(), hash, filename: file.name, size: bytes.length, addedAt: Date.now(), favorite: false, available: true };
    return { track, blob: new Blob([bytes], { type: metadata.mime }) };
  },
  commit: transaction,
  async remove(id, library) {
    await transaction(library, undefined, id);
    const url = objectUrls.get(id); if (url) URL.revokeObjectURL(url); objectUrls.delete(id);
  },
  async resolve(id) {
    if (objectUrls.has(id)) return objectUrls.get(id)!;
    const blob = await get<Blob | undefined>(await db(), 'audio', id);
    if (!blob) throw new Error('This audio file is missing from browser storage. Import it again.');
    const url = URL.createObjectURL(blob); objectUrls.set(id, url); return url;
  },
  async reset(library) {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(['state', 'audio'], 'readwrite');
      tx.objectStore('audio').clear(); tx.objectStore('state').put(library, 'library');
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Could not reset the library. Try again.')); tx.onabort = () => reject(new Error('Library reset was interrupted. Try again.'));
    });
    for (const url of objectUrls.values()) URL.revokeObjectURL(url); objectUrls.clear();
  },
  release(id) { const url = objectUrls.get(id); if (url) URL.revokeObjectURL(url); objectUrls.delete(id); },
  async download(url, id, signal, onProgress) {
    let response: Response;
    try { response = await fetch(url, { signal, credentials: 'omit' }); }
    catch { if (signal.aborted) throw new Error('Cancelled'); throw new Error('Could not reach this audio link. Check the connection and whether the server permits browser downloads (CORS).'); }
    if (!response.ok) throw new Error(`The audio server returned HTTP ${response.status}. Check the link and retry.`);
    const total = Number(response.headers.get('content-length')) || 0;
    if (total > MAX_BYTES) throw new Error('This file exceeds the 100 MB per-track limit.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('This browser cannot stream downloads. Import the file instead.');
    const chunks: Uint8Array<ArrayBuffer>[] = []; let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        received += value.length;
        if (received > MAX_BYTES) { await reader.cancel(); throw new Error('This file exceeds the 100 MB per-track limit.'); }
        chunks.push(value); onProgress(received, total);
      }
    } finally { reader.releaseLock(); }
    if (signal.aborted) throw new Error('Cancelled');
    let filename = 'Audio download'; try { filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || filename); } catch { /* Use fallback. */ }
    const file = new File(chunks, filename, { type: response.headers.get('content-type') || 'application/octet-stream' });
    return { name: filename, uri: '', file, size: received };
  },
  async cleanup() {},
  async exportTrack(track) {
    const blob = await get<Blob>(await db(), 'audio', track.id);
    if (!blob) throw new Error('This file is missing. Import it again before exporting.');
    saveBlob(blob, track.filename);
  },
  async exportMetadata(library) { saveBlob(new Blob([JSON.stringify({ version: 1, tracks: library.tracks, playlists: library.playlists }, null, 2)], { type: 'application/json' }), 'lilt-library.json'); },
  async storageInfo() {
    const estimate = await navigator.storage?.estimate();
    return { used: estimate?.usage, quota: estimate?.quota, persistent: await navigator.storage?.persisted?.() };
  },
  async requestPersistence() { return await navigator.storage?.persist?.() || false; },
};
