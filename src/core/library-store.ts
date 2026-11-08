import type { PickedFile, Prepared, StorageAdapter } from '../platform/types.ts';
import { emptyLibrary, insertBatchTracks, uid, type Library, type Job } from './model.ts';
import { parseBatch } from './sources.ts';
import { publicError } from './errors.ts';

type Snapshot = { library: Library; ready: boolean; error: string | null; notice: string | null; importing: boolean };
export class LibraryStore {
  private snapshot: Snapshot = { library: emptyLibrary(), ready: false, error: null, notice: null, importing: false };
  private listeners = new Set<() => void>();
  private serial: Promise<unknown> = Promise.resolve();
  private initTask?: Promise<void>;
  private active = new Map<string, AbortController>();
  private liveUrls = new Map<string, string>();
  private adapter: StorageAdapter;
  constructor(adapter: StorageAdapter) { this.adapter = adapter; }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private publish(update: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...update }; this.listeners.forEach(fn => fn()); }
  notify = (notice: string | null) => this.publish({ notice });
  report = (error: unknown) => this.publish({ notice: publicError(error) });
  init() {
    return this.initTask ??= (async () => {
      try { this.publish({ library: await this.adapter.load(), ready: true, error: null }); }
      catch (error) { this.publish({ error: error instanceof Error ? error.message : 'Could not open your saved library.' }); this.initTask = undefined; }
    })();
  }
  mutate(update: (library: Library) => Library, persist?: (next: Library) => Promise<void>) {
    const task = this.serial.then(async () => {
      if (!this.snapshot.ready) throw new Error('Wait for your library to open.');
      const next = update(this.snapshot.library);
      await (persist ? persist(next) : this.adapter.save(next));
      this.publish({ library: next });
    });
    this.serial = task.catch(() => {}); return task;
  }
  private async commit(prepared: Prepared, jobId?: string, playlistId?: string) {
    let duplicate = false;
    const stagedId = prepared.track.id;
    try {
      await this.mutate(library => {
        const job = library.jobs.find(j => j.id === jobId);
        if (job?.state === 'cancelled') throw new Error('Cancelled');
        const existing = library.tracks.find(t => t.hash === prepared.track.hash);
        duplicate = !!existing?.available;
        if (existing && !existing.available) prepared.track = { ...prepared.track, id: existing.id, title: existing.title, artist: existing.artist, album: existing.album, favorite: existing.favorite, addedAt: existing.addedAt };
        const track = duplicate ? existing! : prepared.track;
        let next = { ...library, tracks: duplicate ? library.tracks : existing ? library.tracks.map(t => t.id === existing.id ? track : t) : [...library.tracks, track],
          jobs: library.jobs.map(j => j.id === jobId ? { ...j, state: 'completed' as const, received: track.size, total: track.size, trackId: track.id, error: existing ? 'Duplicate skipped; existing track used.' : undefined } : j) };
        if (playlistId) {
          if (jobId) next = insertBatchTracks(next, playlistId, job?.batchId);
          else next = { ...next, playlists: next.playlists.map(p => p.id === playlistId && !p.trackIds.includes(track.id) ? { ...p, trackIds: [...p.trackIds, track.id] } : p) };
        }
        return next;
      }, next => duplicate ? this.adapter.save(next) : this.adapter.commit(next, prepared));
    } finally { await this.adapter.cleanup(stagedId).catch(() => {}); }
    return duplicate;
  }
  async importFiles(files: PickedFile[], playlistId?: string) {
    if (this.snapshot.importing) return;
    this.publish({ importing: true });
    let added = 0, duplicates = 0, failed = 0, lastError = '';
    for (const file of files) {
      let prepared: Prepared | undefined;
      try { prepared = await this.adapter.prepare(file); if (await this.commit(prepared, undefined, playlistId)) duplicates++; else added++; }
      catch (error) { failed++; lastError = publicError(error, 'Could not import file.'); }
      finally { if (prepared) await this.adapter.cleanup(prepared.track.id).catch(() => {}); }
    }
    this.publish({ importing: false, notice: `${added} ${added === 1 ? 'track' : 'tracks'} imported${duplicates ? ` · ${duplicates} duplicates skipped` : ''}${failed ? ` · ${failed} failed. ${lastError}` : ''}.` });
  }
  async enqueue(input: string, playlistId?: string) {
    const sources = parseBatch(input), batchId = uid();
    const jobs: Job[] = sources.map((source, order) => {
      const id = uid(); this.liveUrls.set(id, source.url);
      return { id, batchId, source: source.safeUrl, needsLink: source.needsLink, name: source.name, state: 'queued', received: 0, total: 0, playlistId, order, createdAt: Date.now() };
    });
    await this.mutate(library => ({ ...library, jobs: [...jobs, ...library.jobs] }));
    this.pump(); return jobs.length;
  }
  async retry(id: string) {
    const job = this.snapshot.library.jobs.find(j => j.id === id);
    if (!job) return;
    if (job.needsLink && !this.liveUrls.has(id)) throw new Error('This private link was not saved. Paste a fresh link in Add music.');
    await this.patchJob(id, { state: 'queued', error: undefined, received: 0, total: 0 }); this.pump();
  }
  async cancel(id: string) {
    this.active.get(id)?.abort();
    await this.mutate(library => ({ ...library, jobs: library.jobs.map(j => j.id === id && !['completed', 'failed'].includes(j.state) ? { ...j, state: 'cancelled', error: undefined } : j) }));
  }
  async cancelAll() {
    const ids = this.snapshot.library.jobs.filter(j => ['queued', 'downloading', 'verifying'].includes(j.state)).map(j => j.id);
    await Promise.all(ids.map(id => this.cancel(id)));
  }
  private patchJob(id: string, patch: Partial<Job>) {
    return this.mutate(library => ({ ...library, jobs: library.jobs.map(j => j.id === id && j.state !== 'cancelled' ? { ...j, ...patch } : j) }));
  }
  private pump() {
    for (const job of this.snapshot.library.jobs.filter(j => j.state === 'queued' && !this.active.has(j.id))) {
      if (this.active.size >= 2) break;
      const controller = new AbortController(); this.active.set(job.id, controller);
      void this.runJob(job, controller).finally(() => { this.active.delete(job.id); if (this.snapshot.library.jobs.find(j => j.id === job.id)?.state === 'completed') this.liveUrls.delete(job.id); this.pump(); });
    }
  }
  private async runJob(job: Job, controller: AbortController) {
    let prepared: Prepared | undefined, lastProgress = 0;
    const timeout = setTimeout(() => {
      controller.abort();
      void this.patchJob(job.id, { state: 'failed', error: 'The transfer timed out. Check your connection and retry.' }).catch(e => this.report(e));
    }, 120_000);
    try {
      await this.patchJob(job.id, { state: 'downloading' });
      if (controller.signal.aborted) return;
      const file = await this.adapter.download(this.liveUrls.get(job.id) || job.source, job.id, controller.signal, (received, total) => {
        if (Date.now() - lastProgress < 350 || controller.signal.aborted) return;
        lastProgress = Date.now();
        void this.patchJob(job.id, { received, total }).catch(() => {});
      });
      if (controller.signal.aborted) return;
      await this.patchJob(job.id, { state: 'verifying' });
      prepared = await this.adapter.prepare(file);
      if (controller.signal.aborted) return;
      await this.commit(prepared, job.id, job.playlistId);
    } catch (error) {
      if (!controller.signal.aborted) await this.patchJob(job.id, { state: 'failed', error: publicError(error, 'Transfer failed. Retry to start again.') }).catch(e => this.report(e));
    } finally {
      clearTimeout(timeout);
      await this.adapter.cleanup(job.id).catch(() => {});
      if (prepared) await this.adapter.cleanup(prepared.track.id).catch(() => {});
    }
  }
  async deleteTrack(id: string) {
    await this.mutate(library => {
      const queue = library.playback.queue.filter(t => t !== id), currentId = library.playback.queue[library.playback.index];
      return { ...library, tracks: library.tracks.filter(t => t.id !== id),
      playlists: library.playlists.map(p => ({ ...p, trackIds: p.trackIds.filter(t => t !== id) })),
      playback: { ...library.playback, queue, index: Math.max(0, queue.indexOf(currentId)), position: currentId === id ? 0 : library.playback.position },
      jobs: library.jobs.map(j => j.trackId === id ? { ...j, trackId: undefined } : j),
    }; }, next => this.adapter.remove(id, next));
  }
  async reset() {
    if (this.snapshot.importing) throw new Error('Wait for file imports to finish before resetting your library.');
    await this.cancelAll();
    await this.mutate(() => emptyLibrary(), next => this.adapter.reset(next));
    this.liveUrls.clear();
  }
}
