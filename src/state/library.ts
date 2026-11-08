import { useSyncExternalStore } from 'react';
import { storage } from '../platform/storage';
import { LibraryStore } from '../core/library-store';
export const libraryStore = new LibraryStore(storage);
export const useLibrary = () => useSyncExternalStore(libraryStore.subscribe, libraryStore.getSnapshot, libraryStore.getSnapshot);
