# Lilt

A local-first music player for Android, iOS, and web, built with Expo SDK 58, React Native, and TypeScript. Lilt opens into a personal collection with warm ivory surfaces, ink typography, burnt-orange controls, and an expandable player.

## Run locally

Requires Node 22+, Bun, and the appropriate native development tools for device builds.

```sh
bun install --frozen-lockfile
npm run web
```

```sh
npm run android
npm run ios
```

Use installed development builds to verify native background playback and media controls. Production web offline launch requires the exported build, served from HTTPS or localhost:

```sh
npm run build
node scripts/serve.mjs
```

The static preview runs at `http://127.0.0.1:4173`. The generated service worker caches only Lilt's application shell. Audio is stored separately in IndexedDB. Development mode does not install the service worker.

## Implemented in this preview

- Multiple audio-file imports, header and decoder validation, SHA-256 duplicate detection, filename fallback, basic ID3 text metadata, and WAV duration parsing. MP3/M4A/WAV decoding depends on the device/browser. Per-track limit: 100 MB.
- Durable native document storage with SQLite metadata; transactional browser metadata/audio storage in IndexedDB. Reimporting a missing file restores its identity, favorites, and playlist references.
- Songs, albums, artists, playlists, favorites, local search, sorting, metadata overrides, individual export, and confirmed library deletion/reset.
- Playlist creation, renaming, track membership, and moving tracks upward in source order.
- Play/pause, seek, previous/next, queue editing, shuffle, and repeat. Native playback uses Expo's OS playlist engine; web resolves and releases one audio asset at a time.
- Persistent queue/position restored paused. Native background-playback configuration and lock-screen integration are included; installed-device verification is still required.
- Reviewed batches of direct HTTP(S) audio links, two concurrent transfers, progress, cancel, retry, partial failure, ordered playlist insertion, temporary file cleanup, and interrupted-job recovery. Retry restarts a file; byte-range resume is not implemented.
- Metadata JSON export, individual audio export/share, storage usage, and browser persistence requests.
- Collection, Transfers, Discover availability, and Settings screens, with responsive navigation and a player dock. Discover reports unconnected providers honestly.

Core playback requires no account or backend. Audio stays on the device; submitted links connect directly to their audio host. Query tokens are kept in session memory and omitted from persisted transfer URLs. Signed links must be pasted again after restart.

## Checks and evidence

```sh
npm run typecheck
npm test
npm run build
npm run test:ui
```

Core tests exercise invalid audio, source validation, token redaction, recovery, duplicates, bounded concurrency, playlist ordering, partial failures/retry, cancellation, failed commits, and missing-file repair. Playwright coverage is included for imports, favorites, playlists, browser reload/offline playback, source switching, unsupported links, and responsive widths.

During implementation, typechecking, core tests, web export, Android/iOS JavaScript bundle exports, and Android native-project generation passed. The workspace sandbox prevented loopback listeners, CoreSimulator access, and ADB startup. Consequently browser UI tests, screenshots, installed native builds, and physical-device audio behavior have **not** been verified. Bundle exports are not APK/IPA files. See [docs/VALIDATION.md](docs/VALIDATION.md) for remaining acceptance checks.

## Packaging

`eas.json` follows CorGo's internal preview distribution and remote versioning setup, with explicit Android APK output. It also includes iOS device and simulator profiles. With the EAS CLI installed and signed in:

```sh
npm run build:android:preview
bunx eas-cli build --platform ios --profile preview
```

The Android script supports this workspace without Git. The first online run can prompt to create/link Lilt's own EAS project and generate Android signing credentials. Do not use CorGo's EAS project ID. `.easignore` excludes generated native folders so cloud builds regenerate them from `app.json`, including the approved logo.

The submission attempt could not reach `api.expo.dev` from the workspace sandbox, so no cloud build or APK was created. The Android JavaScript bundle and native config introspection passed. Offline dependency validation recommends patch updates for `expo-sharing` (58.0.22) and `expo-sqlite` (58.0.15); the installed versions remain pinned in the lockfile. Package identifiers are provisional: `app.lilt.player`.

## Remaining product phases

YouTube playlist acquisition, Spotify discovery/matching, and charts require provider access and authorization. No extraction service or fake provider results are included. Encrypted `.liltmusic` storage and seekable protected playback remain a native feasibility task; this preview stores normal audio files in app/browser storage and supports export. Accounts, cloud sync, subscriptions, artwork extraction, localization, and validated dark mode are still pending.

Full requirements and delivery gates remain in [PRD.md](PRD.md). Current implementation lives in `src/`; no cloud backend is scaffolded.
