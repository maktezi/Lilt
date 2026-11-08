import type { Library, Track } from '../core/model';
export type PickedFile = { name: string; uri: string; file?: globalThis.File; size?: number };
export type Prepared = { track: Track; blob?: Blob; uri?: string };
export interface StorageAdapter {
  load(): Promise<Library>;
  save(library: Library): Promise<void>;
  prepare(file: PickedFile): Promise<Prepared>;
  commit(library: Library, prepared: Prepared): Promise<void>;
  remove(id: string, library: Library): Promise<void>;
  reset(library: Library): Promise<void>;
  resolve(id: string): Promise<string>;
  release(id: string): void;
  download(url: string, id: string, signal: AbortSignal, onProgress: (received: number, total: number) => void): Promise<PickedFile>;
  cleanup(id: string): Promise<void>;
  exportTrack(track: Track): Promise<void>;
  exportMetadata(library: Library): Promise<void>;
  storageInfo(): Promise<{ used?: number; quota?: number; persistent?: boolean }>;
  requestPersistence(): Promise<boolean>;
}
