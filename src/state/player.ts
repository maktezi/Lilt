import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus } from 'expo-audio';
import { libraryStore, useLibrary } from './library';
import { storage } from '../platform/storage';

export function usePlayer() {
  const { library, ready } = useLibrary();
  const engine = useAudioPlaylist({ updateInterval: 500 });
  const status = useAudioPlaylistStatus(engine);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wantPlay = useRef(false), syncing = useRef(false), lastSaved = useRef(0);
  const actualQueue = useRef<string[]>([]), loadGeneration = useRef(0);
  const queueKey = JSON.stringify(library.playback.queue);
  const queue = library.playback.queue.map(id => library.tracks.find(t => t.id === id)).filter(t => !!t);
  const current = library.tracks.find(t => t.id === actualQueue.current[status.currentIndex]) || queue[library.playback.index];

  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix', shouldRouteThroughEarpiece: false }).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    if (!ready) return;
    const generation = ++loadGeneration.current;
    syncing.current = true; setLoading(true); setError(null);
    const saved = libraryStore.getSnapshot().library.playback;
    const resume = wantPlay.current || engine.playing;
    engine.pause();
    void (async () => {
      const missing: string[] = [];
      const sources = (await Promise.all(saved.queue.map(async id => {
        try { return { id, uri: await storage.resolve(id) }; } catch { missing.push(id); return null; }
      }))).filter((source): source is { id: string; uri: string } => !!source);
      if (generation !== loadGeneration.current) return;
      if (missing.length) {
        setError(`${missing.length} queued audio ${missing.length === 1 ? 'file is' : 'files are'} missing. Import the missing files again; other tracks remain available.`);
        void libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => missing.includes(t.id) ? { ...t, available: false } : t) })).catch(libraryStore.report);
      }
      engine.clear(); actualQueue.current = sources.map(s => s.id);
      for (const source of sources) engine.add({ uri: source.uri });
      if (sources.length) {
        const currentId = saved.queue[saved.index];
        engine.skipTo(Math.max(0, actualQueue.current.indexOf(currentId)));
        if (!engine.isLoaded) await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { subscription.remove(); reject(new Error('This track could not be loaded. Import it again or select another song.')); }, 12_000);
          const subscription = engine.addListener('playlistStatusUpdate', value => { if (value.isLoaded) { clearTimeout(timer); subscription.remove(); resolve(); } });
          if (engine.isLoaded) { clearTimeout(timer); subscription.remove(); resolve(); }
        });
        if (generation !== loadGeneration.current) return;
        if (saved.position > 0 && !missing.includes(currentId)) await engine.seekTo(saved.position);
        if (generation !== loadGeneration.current) return;
        if (resume && !missing.includes(currentId)) engine.play();
      }
      wantPlay.current = false;
    })().catch(e => { if (generation === loadGeneration.current) { setError(e.message); engine.pause(); } })
      .finally(() => { if (generation === loadGeneration.current) { syncing.current = false; setLoading(false); } });
    return () => { loadGeneration.current++; };
  }, [queueKey, ready, engine]);

  useEffect(() => { engine.loop = library.playback.repeat; }, [engine, library.playback.repeat]);
  useEffect(() => {
    if (current && status.isLoaded) {
      try { engine.setActiveForLockScreen(true, { title: current.title, artist: current.artist, albumTitle: current.album }); }
      catch { /* Browser Media Session support varies; native controls are configured in app.json. */ }
    }
  }, [current?.id, current?.title, current?.artist, status.isLoaded, engine]);
  useEffect(() => {
    if (!actualQueue.current.length || status.isLoaded || loading) return;
    const timer = setTimeout(() => { if (!engine.isLoaded) { engine.pause(); setError('This track could not be loaded. Try another track or import the file again.'); } }, 15_000);
    return () => clearTimeout(timer);
  }, [current?.id, status.isLoaded, loading, engine]);

  const persist = useCallback(() => {
    if (syncing.current || !actualQueue.current.length) return;
    const currentId = actualQueue.current[engine.currentIndex], position = engine.currentTime;
    void libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, index: Math.max(0, l.playback.queue.indexOf(currentId)), position } })).catch(libraryStore.report);
  }, [engine]);
  useEffect(() => {
    if (syncing.current || !ready || !actualQueue.current.length) return;
    if (Date.now() - lastSaved.current > 5000 || library.playback.queue.indexOf(actualQueue.current[status.currentIndex]) !== library.playback.index || !status.playing) {
      lastSaved.current = Date.now(); persist();
    }
  }, [status.currentTime, status.playing, status.currentIndex]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') persist(); });
    if (typeof window !== 'undefined') window.addEventListener('pagehide', persist);
    return () => { subscription.remove(); if (typeof window !== 'undefined') window.removeEventListener('pagehide', persist); };
  }, [persist]);
  useEffect(() => {
    if (status.duration > 0 && current && Math.abs(current.duration - status.duration) > 1) {
      void libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => t.id === current.id ? { ...t, duration: status.duration } : t) })).catch(libraryStore.report);
    }
  }, [current?.id, status.duration]);

  async function playTracks(ids: string[], index = 0) {
    if (!library.tracks.some(t => t.id === ids[index] && t.available)) { libraryStore.notify('This audio file is missing. Import it again to play this song.'); return; }
    const available = ids.filter(id => library.tracks.some(t => t.id === id && t.available));
    const selected = ids[index];
    if (!available.length) { libraryStore.notify('Import music before starting playback.'); return; }
    const target = Math.max(0, available.indexOf(selected));
    setError(null);
    if (JSON.stringify(available) === JSON.stringify(actualQueue.current)) { engine.skipTo(target); engine.play(); persist(); }
    else {
      wantPlay.current = true;
      try { await libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, queue: available, index: target, position: 0 } })); }
      catch (e) { wantPlay.current = false; libraryStore.report(e); }
    }
  }
  function toggle() {
    try {
      if (engine.playing) { engine.pause(); persist(); }
      else if (actualQueue.current.length) { setError(null); if (engine.duration > 0 && engine.currentTime >= engine.duration - 0.1) void engine.seekTo(0).then(() => engine.play()); else engine.play(); }
      else void playTracks(library.tracks.filter(t => t.available).map(t => t.id));
    } catch (e) { libraryStore.report(e); }
  }
  async function seek(seconds: number) { try { await engine.seekTo(Math.max(0, Math.min(seconds, status.duration))); persist(); } catch (e) { libraryStore.report(e); } }
  function next() {
    if (library.playback.shuffle && actualQueue.current.length > 1) {
      const offset = 1 + Math.floor(Math.random() * (actualQueue.current.length - 1));
      engine.skipTo((engine.currentIndex + offset) % actualQueue.current.length);
    } else engine.next();
    persist();
  }
  function previous() { if (engine.currentTime > 3) void seek(0); else { engine.previous(); persist(); } }
  async function updateQueue(ids: string[]) {
    const currentId = actualQueue.current[engine.currentIndex];
    await libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, queue: ids, index: Math.max(0, ids.indexOf(currentId)), position: ids.includes(currentId) ? engine.currentTime : 0 } }));
  }
  function addQueue(id: string, playNext = false) {
    const ids = [...libraryStore.getSnapshot().library.playback.queue];
    if (ids.includes(id)) { libraryStore.notify('This track is already in your queue.'); return; }
    const currentIndex = ids.indexOf(actualQueue.current[engine.currentIndex]);
    ids.splice(playNext ? currentIndex + 1 : ids.length, 0, id);
    void updateQueue(ids).then(() => libraryStore.notify(playNext ? 'Track will play next.' : 'Added to queue.')).catch(libraryStore.report);
  }
  return { current, queue, status: { ...status, currentIndex: current ? library.playback.queue.indexOf(current.id) : 0 }, loading, error, playTracks, toggle, next, previous, seek, addQueue, updateQueue, engine };
}
export type Player = ReturnType<typeof usePlayer>;
