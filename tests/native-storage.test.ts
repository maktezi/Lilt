import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import * as model from '../src/core/model.ts';
import * as metadata from '../src/core/metadata.ts';
import * as audioFiles from '../src/core/audio-files.ts';
import type { StorageAdapter } from '../src/platform/types.ts';

const root = 'file:///documents/lilt/';
function wave() {
  const data = Buffer.alloc(16044);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(16000, 40);
  return new Uint8Array(data);
}
function nativeStorage(seed = model.emptyLibrary()) {
  const files = new Map<string, Uint8Array>(), probes: string[] = [];
  let saved = structuredClone(seed), decodeFails = false, saveFails = false, removedProbes = 0;
  const fs = {
    documentDirectory: 'file:///documents/', cacheDirectory: 'file:///cache/',
    async makeDirectoryAsync() {},
    async getInfoAsync(uri: string) { return { exists: files.has(uri), isDirectory: false, size: files.get(uri)?.length || 0 }; },
    async readDirectoryAsync(uri: string) { return [...new Set([...files.keys()].filter(key => key.startsWith(uri)).map(key => key.slice(uri.length).split('/')[0]))]; },
    async copyAsync({ from, to }: { from: string; to: string }) { assert.ok(files.has(from)); files.set(to, files.get(from)!.slice()); },
    async moveAsync({ from, to }: { from: string; to: string }) { assert.ok(files.has(from)); files.set(to, files.get(from)!); files.delete(from); },
    async deleteAsync(uri: string) { files.delete(uri); },
    async getFreeDiskStorageAsync() { return 1024 * 1024 * 1024; },
  };
  const modules: Record<string, unknown> = {
    'expo-sqlite': { async openDatabaseAsync() { return {
      async execAsync() {}, async getFirstAsync() { return { data: JSON.stringify(saved) }; },
      async runAsync(_sql: string, data: string) { if (saveFails) throw new Error('Disk full'); saved = JSON.parse(data); },
    }; } },
    'expo-file-system/legacy': fs,
    'expo-file-system': { File: class { private uri: string; constructor(uri: string) { this.uri = uri; } async bytes() { return files.get(this.uri)!; } } },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, async digest(_algorithm: string, bytes: Uint8Array) { return createHash('sha256').update(bytes).digest(); } },
    'expo-sharing': {},
    'expo-audio': { createAudioPlayer({ uri }: { uri: string }) {
      probes.push(uri);
      assert.ok(files.has(uri), 'Decoder must read the staged file');
      assert.match(uri, /\.wav$/, 'Detected WAV extension must survive an extensionless download or a misleading .mp3 name');
      return { isLoaded: false, duration: 1, remove() { removedProbes++; }, addListener(_event: string, callback: (status: object) => void) {
        queueMicrotask(() => callback(decodeFails ? { error: 'Invalid codec' } : { isLoaded: true, duration: 1 }));
        return { remove() {} };
      } };
    } },
    '../core/model': model, '../core/metadata': metadata, '../core/audio-files': audioFiles,
  };
  const source = readFileSync(new URL('../src/platform/storage.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { storage?: StorageAdapter } = {};
  runInNewContext(compiled, { exports, require(name: string) { assert.ok(name in modules, name); return modules[name]; }, setTimeout, clearTimeout, Uint8Array, Map, Set });
  return { storage: exports.storage!, files, probes, get saved() { return saved; }, get removedProbes() { return removedProbes; }, failDecode() { decodeFails = true; }, failSave() { saveFails = true; } };
}

test('native downloads are probed, committed, and resolved with the detected extension', async () => {
  const env = nativeStorage(); await env.storage.load();
  const source = `${root}partial/download-job`; env.files.set(source, wave());
  const prepared = await env.storage.prepare({ uri: source, name: 'Converter claims MP3.mp3' });
  assert.match(prepared.uri!, /\.wav$/);
  assert.equal(prepared.track.mime, 'audio/wav');
  assert.equal(prepared.track.duration, 1);
  const library = model.emptyLibrary(); library.tracks.push(prepared.track);
  await env.storage.commit(library, prepared);
  const uri = await env.storage.resolve(prepared.track.id);
  assert.equal(uri, `${root}${prepared.track.id}.wav`);
  assert.equal(env.files.get(uri)?.length, wave().length);
  assert.equal(env.removedProbes, 1);
  await env.storage.cleanup('download-job');
  assert.equal(env.files.has(source), false);
  await env.storage.remove(prepared.track.id, model.emptyLibrary());
  assert.equal(env.files.has(uri), false);
});
test('native loading migrates extensionless saved audio without changing track identity', async () => {
  const library = model.emptyLibrary();
  library.tracks.push({ ...metadata.inspectAudio(wave(), 'Song.wav'), id: 'legacy-id', hash: 'hash', filename: 'Song.wav', size: wave().length, addedAt: 1, favorite: true, available: true });
  library.playlists.push({ id: 'list', name: 'Saved', createdAt: 1, trackIds: ['legacy-id'] });
  const env = nativeStorage(library); env.files.set(`${root}legacy-id`, wave());
  const loaded = await env.storage.load();
  assert.equal(loaded.tracks[0].available, true);
  assert.equal(loaded.tracks[0].favorite, true);
  assert.equal(loaded.playlists[0].trackIds[0], 'legacy-id');
  assert.equal(env.files.has(`${root}legacy-id`), false);
  assert.equal(await env.storage.resolve('legacy-id'), `${root}legacy-id.wav`);
});
test('native validation still rejects damaged audio and cleans up its staged file', async () => {
  const env = nativeStorage(); await env.storage.load();
  env.files.set('file:///incoming', wave()); env.failDecode();
  await assert.rejects(env.storage.prepare({ uri: 'file:///incoming', name: 'Song.wav' }), /damaged|unsupported codec/);
  assert.equal([...env.files.keys()].some(uri => uri.startsWith(`${root}partial/`)), false);
  assert.equal(env.removedProbes, 1);
});
test('failed native commits remove the typed audio file and leave the library unchanged', async () => {
  const env = nativeStorage(); await env.storage.load(); env.files.set('file:///incoming', wave());
  const prepared = await env.storage.prepare({ uri: 'file:///incoming', name: 'Song.wav' });
  env.failSave();
  const library = model.emptyLibrary(); library.tracks.push(prepared.track);
  await assert.rejects(env.storage.commit(library, prepared), /Disk full/);
  assert.equal(env.files.has(`${root}${prepared.track.id}.wav`), false);
  assert.equal(env.saved.tracks.length, 0);
});
