export type Track = {
  id: string; title: string; artist: string; album: string; filename: string;
  mime: string; size: number; hash: string; addedAt: number; duration: number;
  favorite: boolean; available: boolean;
};
export type Playlist = { id: string; name: string; trackIds: string[]; createdAt: number };
export type JobState = 'queued' | 'downloading' | 'verifying' | 'completed' | 'failed' | 'cancelled';
export type Job = {
  id: string; batchId: string; name: string; source: string; needsLink: boolean;
  state: JobState; received: number; total: number; error?: string;
  playlistId?: string; order: number; trackId?: string; createdAt: number;
};
export type Library = {
  version: 1; tracks: Track[]; playlists: Playlist[]; jobs: Job[];
  playback: { queue: string[]; index: number; position: number; repeat: 'none' | 'all' | 'single'; shuffle: boolean };
};
export const emptyLibrary = (): Library => ({
  version: 1, tracks: [], playlists: [], jobs: [],
  playback: { queue: [], index: 0, position: 0, repeat: 'none', shuffle: false },
});
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
export const MAX_BYTES = 100 * 1024 * 1024;
export function recoverLibrary(input: unknown): Library {
  const value = input as Library | null;
  if (!value) return emptyLibrary();
  if (value.version !== 1 || !Array.isArray(value.tracks) || !Array.isArray(value.playlists) || !Array.isArray(value.jobs) || !value.playback) {
    throw new Error('This library could not be read. Your saved files have been kept.');
  }
  return { ...value, jobs: value.jobs.map(job => ['queued', 'downloading', 'verifying'].includes(job.state)
    ? { ...job, state: 'failed', error: 'Transfer interrupted. Retry to start again.', received: 0 } : job) };
}
export function matches(track: Track, query: string) {
  const haystack = `${track.title} ${track.artist} ${track.album}`.normalize('NFKD').toLocaleLowerCase();
  return query.normalize('NFKD').toLocaleLowerCase().trim().split(/\s+/).every(word => haystack.includes(word));
}
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function addToPlaylist(library: Library, playlistId: string, trackId: string): Library {
  return { ...library, playlists: library.playlists.map(p => p.id === playlistId && !p.trackIds.includes(trackId)
    ? { ...p, trackIds: [...p.trackIds, trackId] } : p) };
}
export function insertBatchTracks(library: Library, playlistId: string, batchId?: string): Library {
  const completed = library.jobs.filter(j => j.playlistId === playlistId && (!batchId || j.batchId === batchId) && j.trackId)
    .sort((a, b) => a.createdAt - b.createdAt || a.order - b.order).map(j => j.trackId!);
  return { ...library, playlists: library.playlists.map(p => p.id === playlistId
    ? { ...p, trackIds: [...new Set([...p.trackIds.filter(id => !completed.includes(id)), ...completed])] } : p) };
}
