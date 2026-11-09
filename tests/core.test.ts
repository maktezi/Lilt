import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, formatTime, matches, recoverLibrary, type Library, type Track } from '../src/core/model.ts';
import { inspectAudio } from '../src/core/metadata.ts';
import { parseBatch, parseSource, youtubeVideoLink } from '../src/core/sources.ts';
import { LibraryStore } from '../src/core/library-store.ts';
import { publicError } from '../src/core/errors.ts';
import type { Prepared, StorageAdapter } from '../src/platform/types.ts';

const track = (id: string): Track => ({ id, title: id, artist: 'Björk', album: 'Debut', filename: `${id}.wav`, hash: id, mime: 'audio/wav', size: 32044, duration: 2, favorite: false, available: true, addedAt: 1 });
function wave() {
  const bytes = new Uint8Array(32044), view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, i) => bytes[offset + i] = char.charCodeAt(0));
  text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, 32000, true); return bytes;
}
const pause = () => new Promise(resolve => setTimeout(resolve, 5));
test('YouTube handoff validates video URLs and removes tracking without losing the video ID', () => {
  const canonical = 'https://www.youtube.com/watch?v=qV-3UMfcWBc';
  for (const link of [canonical, `${canonical}&list=private&token=secret`, 'https://youtu.be/qV-3UMfcWBc?si=tracking', 'https://m.youtube.com/watch?v=qV-3UMfcWBc', 'https://music.youtube.com/watch?v=qV-3UMfcWBc', 'https://youtube.com/shorts/qV-3UMfcWBc', 'https://youtube.com/live/qV-3UMfcWBc', 'https://www.youtube-nocookie.com/embed/qV-3UMfcWBc']) {
    assert.equal(youtubeVideoLink(link), canonical);
  }
  for (const link of ['', 'not a link', 'https://youtube.com/playlist?list=example', 'https://youtube.com/watch?v=invalid', 'https://youtube.com.evil.test/watch?v=qV-3UMfcWBc', 'https://evil.test/qV-3UMfcWBc', 'https://user:pass@youtube.com/watch?v=qV-3UMfcWBc', `file:///watch?v=qV-3UMfcWBc`, `${canonical}\n${canonical}`]) {
    assert.equal(youtubeVideoLink(link), null);
  }
  assert.throws(() => parseSource(canonical), /YouTube tab/);
});
async function until(check: () => boolean) {
  for (let i = 0; i < 300; i++) { if (check()) return; await pause(); }
  assert.fail('Expected asynchronous work did not finish');
}
function fakeAdapter(seed = emptyLibrary()) {
  let saved = structuredClone(seed), commitCount = 0, active = 0, maximum = 0;
  const files = new Map<string, Prepared>();
  const failures = new Set<string>();
  const adapter: StorageAdapter = {
    async load() { return structuredClone(saved); },
    async save(next) { saved = structuredClone(next); },
    async prepare(file) {
      if (file.name === 'bad.wav') throw new Error('Invalid audio');
      const prepared = { track: track(file.name), uri: file.uri }; return prepared;
    },
    async commit(next, prepared) { commitCount++; files.set(prepared.track.id, prepared); saved = structuredClone(next); },
    async remove(id, next) { files.delete(id); saved = structuredClone(next); },
    async reset(next) { files.clear(); saved = structuredClone(next); },
    async resolve(id) { return `file://${id}`; },
    release() {},
    async download(url, id, signal, progress) {
      active++; maximum = Math.max(maximum, active);
      try {
        const name = new URL(url).pathname.slice(1);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, name.startsWith('slow') ? 50 : 10);
          signal.addEventListener('abort', () => { clearTimeout(timeout); reject(new Error('Cancelled')); }, { once: true });
        });
        if (failures.has(name)) throw new Error('Network failure');
        progress(100, 100); return { name, uri: `file://${name}` };
      } finally { active--; }
    },
    async cleanup() {}, async exportTrack() {}, async exportMetadata() {}, async storageInfo() { return {}; }, async requestPersistence() { return true; },
  };
  return { adapter, files, failures, get saved() { return saved; }, get commits() { return commitCount; }, get maximum() { return maximum; } };
}

test('audio inspection verifies signatures and extracts WAV duration', () => {
  const metadata = inspectAudio(wave(), 'Morning.wav');
  assert.equal(metadata.duration, 2); assert.equal(metadata.title, 'Morning'); assert.equal(metadata.mime, 'audio/wav');
  assert.throws(() => inspectAudio(new TextEncoder().encode('<html>This is not an audio file, even if its extension is mp3.</html>'), 'fake.mp3'), /header/);
  const invalidId3 = new Uint8Array(44); invalidId3.set([73, 68, 51]);
  assert.throws(() => inspectAudio(invalidId3, 'fake.mp3'), /header/);
});
test('source review rejects unsupported providers and redacts private query strings', () => {
  for (const url of ['https://www.youtube.com/playlist?list=123', 'https://youtu.be/x', 'https://open.spotify.com/playlist/x', 'file:///etc/passwd', 'https://user:secret@example.com/song.mp3']) assert.throws(() => parseSource(url));
  const parsed = parseSource('https://audio.example/song.mp3?token=secret#private');
  assert.equal(parsed.safeUrl, 'https://audio.example/song.mp3'); assert.equal(parsed.needsLink, true);
  assert.equal(parseBatch('https://a.test/song.mp3\nhttps://a.test/song.mp3').length, 1);
  assert.throws(() => parseBatch(''), /Paste/);
});
test('restart recovery marks unfinished transfers retryable without losing library data', () => {
  const state = emptyLibrary(); state.tracks.push(track('existing'));
  state.jobs.push({ id: 'job', batchId: 'batch', name: 'song', source: 'https://a.test/song', state: 'downloading', needsLink: false, received: 200, total: 1000, order: 0, createdAt: 1 });
  const recovered = recoverLibrary(state);
  assert.equal(recovered.jobs[0].state, 'failed'); assert.equal(recovered.jobs[0].received, 0); assert.equal(recovered.tracks.length, 1);
  assert.throws(() => recoverLibrary({ version: 2 }), /could not be read/);
});
test('imports skip exact duplicates and failed files while preserving good files', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init();
  await store.importFiles([{ name: 'one.wav', uri: 'one' }, { name: 'one.wav', uri: 'one' }, { name: 'bad.wav', uri: 'bad' }]);
  assert.equal(store.getSnapshot().library.tracks.length, 1); assert.equal(fake.commits, 1); assert.match(store.getSnapshot().notice!, /1 duplicates skipped/); assert.match(store.getSnapshot().notice!, /1 failed/);
});
test('a converter result downloads, validates, saves, and joins the requested playlist automatically', async () => {
  const seed = emptyLibrary(); seed.playlists.push({ id: 'youtube', name: 'YouTube songs', trackIds: [], createdAt: 1 });
  const fake = fakeAdapter(seed), store = new LibraryStore(fake.adapter); await store.init();
  await store.enqueue('https://cdn.example.com/result?token=secret', 'youtube', 'Converted song.mp3');
  await until(() => store.getSnapshot().library.jobs[0].state === 'completed');
  assert.equal(fake.commits, 1);
  assert.equal(fake.saved.tracks[0].title, 'Converted song.mp3');
  assert.deepEqual(fake.saved.playlists[0].trackIds, [fake.saved.tracks[0].id]);
  assert.equal(fake.saved.jobs[0].source, 'https://cdn.example.com/result');
  assert.equal(fake.saved.jobs[0].needsLink, true);
});
test('download screen waits for the durable commit and reports saving before completion', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init();
  const states: string[] = [];
  await store.downloadAndWait('https://audio.test/song.wav', 'Song.wav', undefined, new AbortController().signal, job => states.push(job.state));
  assert.ok(states.includes('downloading')); assert.ok(states.includes('verifying'));
  assert.equal(states.at(-1), 'completed'); assert.equal(fake.commits, 1);
});
test('cancelling the download screen cancels its job and never saves the track', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init();
  const controller = new AbortController();
  const task = store.downloadAndWait('https://audio.test/slow-song.wav', 'Song.wav', undefined, controller.signal, job => { if (job.state === 'downloading') controller.abort(); });
  await assert.rejects(task, /Cancelled/);
  await pause(); assert.equal(fake.commits, 0); assert.equal(store.getSnapshot().library.jobs[0].state, 'cancelled');
});
test('download screen receives transfer failures instead of showing a saved state', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init(); fake.failures.add('bad.wav');
  await assert.rejects(store.downloadAndWait('https://audio.test/bad.wav', 'Song.wav', undefined, new AbortController().signal, () => {}), /Network failure/);
  assert.equal(fake.commits, 0);
});
test('batch completion order does not change playlist source order; concurrency is bounded', async () => {
  const seed = emptyLibrary(); seed.playlists.push({ id: 'playlist', name: 'Mix', trackIds: [], createdAt: 1 });
  const fake = fakeAdapter(seed), store = new LibraryStore(fake.adapter); await store.init();
  await store.enqueue('https://audio.test/slow-first.wav\nhttps://audio.test/second.wav\nhttps://audio.test/third.wav', 'playlist');
  await until(() => store.getSnapshot().library.jobs.every(j => j.state === 'completed'));
  assert.deepEqual(store.getSnapshot().library.playlists[0].trackIds, ['slow-first.wav', 'second.wav', 'third.wav']);
  assert.equal(fake.maximum, 2); assert.equal(fake.commits, 3);
});
test('partial failures can retry without redownloading completed items or duplicating tracks', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); fake.failures.add('fail.wav'); await store.init();
  await store.enqueue('https://audio.test/good.wav\nhttps://audio.test/fail.wav');
  await until(() => store.getSnapshot().library.jobs.every(j => ['completed', 'failed'].includes(j.state)));
  assert.equal(fake.commits, 1);
  const failed = store.getSnapshot().library.jobs.find(j => j.state === 'failed')!;
  fake.failures.clear(); await store.retry(failed.id);
  await until(() => store.getSnapshot().library.jobs.every(j => j.state === 'completed'));
  assert.equal(fake.commits, 2); assert.equal(store.getSnapshot().library.tracks.length, 2);
});
test('cancelling a running transfer never commits it as a ready track', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init();
  await store.enqueue('https://audio.test/slow-song.wav');
  await until(() => store.getSnapshot().library.jobs[0].state === 'downloading');
  await store.cancel(store.getSnapshot().library.jobs[0].id); await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(fake.commits, 0); assert.equal(store.getSnapshot().library.jobs[0].state, 'cancelled');
});
test('failed storage commit leaves the visible and persisted library unchanged', async () => {
  const fake = fakeAdapter(), store = new LibraryStore({ ...fake.adapter, async commit() { throw new Error('Storage full'); } }); await store.init();
  await store.importFiles([{ name: 'song.wav', uri: 'song' }]);
  assert.equal(store.getSnapshot().library.tracks.length, 0); assert.equal(fake.saved.tracks.length, 0); assert.match(store.getSnapshot().notice!, /Storage full/);
});
test('reimport repairs a missing asset while preserving playlist references and favorites', async () => {
  const seed = emptyLibrary(); seed.tracks.push({ ...track('old-id'), hash: 'song.wav', title: 'My edited title', available: false, favorite: true });
  seed.playlists.push({ id: 'mix', name: 'Mix', trackIds: ['old-id'], createdAt: 1 });
  const fake = fakeAdapter(seed), store = new LibraryStore(fake.adapter); await store.init();
  await store.importFiles([{ name: 'song.wav', uri: 'song' }]);
  const next = store.getSnapshot().library;
  assert.equal(next.tracks.length, 1); assert.equal(next.tracks[0].id, 'old-id'); assert.equal(next.tracks[0].available, true); assert.equal(next.tracks[0].favorite, true); assert.equal(next.tracks[0].title, 'My edited title'); assert.deepEqual(next.playlists[0].trackIds, ['old-id']);
});
test('international local search and duration formatting handle edge cases', () => {
  assert.equal(matches(track('Jóga'), 'björk jóga'), true);
  assert.equal(matches(track('Jóga'), 'not saved'), false);
  assert.equal(formatTime(125.8), '2:05'); assert.equal(formatTime(NaN), '0:00');
});
test('persisted transfer errors do not expose signed URL query tokens or local paths', () => {
  const error = publicError(new Error('Failed https://example.test/song.mp3?token=secret#private at file:///private/user/music/song.mp3'));
  assert.equal(error.includes('secret'), false); assert.equal(error.includes('/private/user'), false); assert.match(error, /https:\/\/example.test\/song.mp3/);
});
test('reset cancels transfers and cannot resurrect their library records', async () => {
  const fake = fakeAdapter(), store = new LibraryStore(fake.adapter); await store.init();
  await store.importFiles([{ name: 'existing.wav', uri: 'existing' }]);
  await store.enqueue('https://audio.test/slow-download.wav');
  await until(() => store.getSnapshot().library.jobs[0].state === 'downloading');
  await store.reset(); await new Promise(resolve => setTimeout(resolve, 70));
  assert.deepEqual(store.getSnapshot().library, emptyLibrary()); assert.equal(fake.files.size, 0); assert.deepEqual(fake.saved, emptyLibrary());
});
