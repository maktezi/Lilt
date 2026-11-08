import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { libraryStore, useLibrary } from './library';
import { storage } from '../platform/storage';

/** Resolve only the current browser asset. Native uses the OS playlist engine. */
export function usePlayer() {
  const { library, ready } = useLibrary();
  const engine = useAudioPlayer(null, { updateInterval: 500 });
  const nativeStatus = useAudioPlayerStatus(engine);
  const [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const wantPlay = useRef(false), sourceReady = useRef(false), savedAt = useRef(0), loadedId = useRef<string | undefined>(undefined);
  const generation = useRef(0), endedHandled = useRef(false), restorePosition = useRef(0);
  const playback = library.playback;
  const currentId = playback.queue[playback.index];
  const current = library.tracks.find(t => t.id === currentId);
  const queue = playback.queue.map(id => library.tracks.find(t => t.id === id)).filter(t => !!t);
  const status = { ...nativeStatus, currentIndex: playback.index, trackCount: queue.length, loop: playback.repeat };

  useEffect(() => {
    if (!ready) return;
    const currentGeneration = ++generation.current;
    let subscription: ReturnType<typeof engine.addListener> | undefined;
    sourceReady.current = false; endedHandled.current = false; setError(null); setLoading(!!currentId);
    const resume = wantPlay.current || engine.playing;
    engine.pause();
    const previousId = loadedId.current;
    if (previousId) storage.release(previousId);
    loadedId.current = undefined;
    if (!currentId) { engine.replace(null); setLoading(false); return; }
    restorePosition.current = libraryStore.getSnapshot().library.playback.position;
    void storage.resolve(currentId).then(uri => {
      if (generation.current !== currentGeneration) { storage.release(currentId); return; }
      loadedId.current = currentId;
      wantPlay.current = resume;
      subscription = engine.addListener('playbackStatusUpdate', value => {
        if (generation.current !== currentGeneration) return;
        if (value.error) { engine.pause(); setError('This track could not be played. Import it again or choose another song.'); setLoading(false); wantPlay.current = false; return; }
        if (!value.isLoaded || sourceReady.current) return;
        sourceReady.current = true;
        const shouldResume = wantPlay.current; wantPlay.current = false;
        void engine.seekTo(Math.min(restorePosition.current, engine.duration || restorePosition.current))
          .then(() => { if (generation.current === currentGeneration) { setLoading(false); if (shouldResume) engine.play(); } })
          .catch(() => { if (generation.current === currentGeneration) { setLoading(false); setError('Playback could not resume. Press play to start again.'); } });
      });
      engine.replace({ uri });
      engine.loop = libraryStore.getSnapshot().library.playback.repeat === 'single';
    }).catch(e => {
      if (generation.current !== currentGeneration) return;
      setError(e.message); setLoading(false); wantPlay.current = false;
      void libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => t.id === currentId ? { ...t, available: false } : t) })).catch(libraryStore.report);
    });
    return () => { generation.current++; subscription?.remove(); };
  }, [currentId, ready, reload, engine]);
  useEffect(() => () => { engine.pause(); if (loadedId.current) storage.release(loadedId.current); }, [engine]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => { if (!sourceReady.current) { setLoading(false); setError('This track did not load. Try another song or import it again.'); } }, 15_000);
    return () => clearTimeout(timer);
  }, [loading, currentId]);
  useEffect(() => { engine.loop = playback.repeat === 'single'; }, [playback.repeat, engine]);
  useEffect(() => {
    if (current && nativeStatus.isLoaded) {
      try { engine.setActiveForLockScreen(true, { title: current.title, artist: current.artist, albumTitle: current.album }); } catch { /* Media Session is optional in browsers. */ }
    }
  }, [current?.id, current?.title, nativeStatus.isLoaded, engine]);
  const persist = useCallback(() => {
    if (!sourceReady.current || !loadedId.current) return;
    const id = loadedId.current, position = engine.currentTime;
    void libraryStore.mutate(l => l.playback.queue[l.playback.index] === id ? { ...l, playback: { ...l.playback, position } } : l).catch(libraryStore.report);
  }, [engine]);
  useEffect(() => {
    if (Date.now() - savedAt.current > 3000 || !nativeStatus.playing) { savedAt.current = Date.now(); persist(); }
  }, [nativeStatus.currentTime, nativeStatus.playing, persist]);
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') persist(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', persist);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', persist); };
  }, [persist]);
  useEffect(() => {
    if (current && nativeStatus.duration > 0 && Math.abs(current.duration - nativeStatus.duration) > 1) void libraryStore.mutate(l => ({ ...l, tracks: l.tracks.map(t => t.id === current.id ? { ...t, duration: nativeStatus.duration } : t) })).catch(libraryStore.report);
  }, [current?.id, nativeStatus.duration]);

  async function playTracks(ids: string[], index = 0) {
    const selected = library.tracks.find(t => t.id === ids[index]);
    if (!selected?.available) { libraryStore.notify('This audio file is missing. Import it again to play this song.'); return; }
    setError(null);
    if (selected.id === loadedId.current && sourceReady.current) { engine.play(); await libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, queue: ids, index, position: engine.currentTime } })); }
    else {
      wantPlay.current = true;
      try { await libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, queue: ids, index, position: 0 } })); if (selected.id === currentId) setReload(value => value + 1); }
      catch (e) { wantPlay.current = false; libraryStore.report(e); }
    }
  }
  function toggle() {
    if (!current) return;
    if (engine.playing) { engine.pause(); persist(); }
    else if (sourceReady.current) { setError(null); if (engine.currentTime >= engine.duration - 0.1) void engine.seekTo(0).then(() => engine.play()); else engine.play(); }
    else { wantPlay.current = true; setReload(value => value + 1); }
  }
  async function seek(seconds: number) { try { await engine.seekTo(Math.max(0, Math.min(seconds, engine.duration))); persist(); } catch { setError('Could not seek in this file. Try playback from the beginning.'); } }
  function next() {
    const saved = libraryStore.getSnapshot().library.playback;
    const candidates = saved.queue.map((id, index) => ({ id, index })).filter(item => libraryStore.getSnapshot().library.tracks.some(t => t.id === item.id && t.available));
    const nextIndex = candidates.find(item => item.index > saved.index)?.index ?? (saved.repeat === 'all' ? candidates[0]?.index : undefined);
    if (nextIndex !== undefined) void playTracks(saved.queue, nextIndex); else { engine.pause(); persist(); }
  }
  function previous() {
    if (engine.currentTime > 3) { void seek(0); return; }
    const saved = libraryStore.getSnapshot().library.playback;
    const previousIndex = saved.queue.map((id, index) => ({ id, index })).filter(item => item.index < saved.index && libraryStore.getSnapshot().library.tracks.some(t => t.id === item.id && t.available)).at(-1)?.index;
    if (previousIndex !== undefined) void playTracks(saved.queue, previousIndex); else void seek(0);
  }
  useEffect(() => {
    if (!nativeStatus.didJustFinish) { endedHandled.current = false; return; }
    if (endedHandled.current || playback.repeat === 'single') return;
    endedHandled.current = true; next();
  }, [nativeStatus.didJustFinish]);
  async function updateQueue(ids: string[]) {
    const saved = libraryStore.getSnapshot().library.playback, id = saved.queue[saved.index];
    await libraryStore.mutate(l => ({ ...l, playback: { ...l.playback, queue: ids, index: Math.max(0, ids.indexOf(id)), position: ids.includes(id) ? engine.currentTime : 0 } }));
  }
  function addQueue(id: string, playNext = false) {
    const saved = libraryStore.getSnapshot().library.playback, ids = [...saved.queue];
    if (ids.includes(id)) { libraryStore.notify('This track is already in your queue.'); return; }
    ids.splice(playNext ? saved.index + 1 : ids.length, 0, id);
    void updateQueue(ids).then(() => libraryStore.notify(playNext ? 'Track will play next.' : 'Added to queue.')).catch(libraryStore.report);
  }
  return { current, queue, status, loading, error, playTracks, toggle, next, previous, seek, addQueue, updateQueue, engine };
}
export type Player = ReturnType<typeof usePlayer>;
