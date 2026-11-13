# Lilt

A local-first music player for Android, iOS, and web, built with Expo SDK 58, React Native, and TypeScript. Lilt opens into a personal collection with Spotify-style dark surfaces, bold sans-serif typography, green controls, and an expandable player.

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
- YouTube in Add music: on iOS/Android, paste a single video link, select 128/192/256/320 kbps, and tap Download audio. Conversion runs behind a native Lilt screen using the bundled loading animation selected by the user. Its public embedded player handles conversion; completed audio URLs enter the existing validated download queue and save automatically. A fallback uses fixed 192 kbps, explicitly labeled before switching. Provider pages are not shown; native controls offer retry, fallback, and cancel. Connection and verification stalls time out after 20 seconds; unchanged active conversion progress times out after 60 seconds, with a four-minute total conversion limit. The loader follows the real transfer through validation and durable saving, and shows success only after commit. On web, converter sites open in a separate tab and files are imported manually. No Lilt backend is included. Converter availability and output are external dependencies; provider changes can break the page bridge.
- Metadata JSON export, individual audio export/share, storage usage, and browser persistence requests.
- Collection, Transfers, Discover availability, and Settings screens, with responsive navigation and a player dock. Discover reports unconnected providers honestly.

Core playback requires no account or backend. Audio stays on the device; submitted links connect directly to their audio host. Query tokens are kept in session memory and omitted from persisted transfer URLs. Signed links must be pasted again after restart.

Native converters run in `react-native-webview` behind an opaque native UI; conversion completion is observed through the public player response/function, without copying provider API keys or reimplementing their authentication. Download jobs keep signed URLs in session memory and persist redacted URLs. Bridge events validate the sending origin and reject local-network URLs. Duplicate completion events are ignored. A track is saved only after audio validation and durable commit. The web fallback uses `expo-clipboard` and manual file import. Rebuild existing native development clients after installing dependencies (`npm run ios` or `npm run android`).

Converter verification (November 9, 2026): typecheck, 18 unit/core tests, web export, 3 targeted browser tests, and the iOS simulator build passed. Controlled tests cover automatic conversion completion capture and queue-to-playlist commit. Live checks with the supplied video found a Flvto error and YTMP3 still extracting when the check timed out; a successful live conversion-to-library save is not yet verified. Android runtime conversion is also unverified.

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

Spotify discovery/matching and charts require provider access and authorization. Public YouTube playlist downloading is implemented in the native app; live upstream conversion remains a device acceptance check. No extraction service or fake provider results are included. Encrypted `.liltmusic` storage and seekable protected playback remain a native feasibility task; this preview stores normal audio files in app/browser storage and supports export. Accounts, cloud sync, subscriptions, artwork extraction, and localization are still pending.

Full requirements and delivery gates remain in [PRD.md](PRD.md). Current implementation lives in `src/`; no cloud backend is scaffolded.

The native download animation is loading by Bxh, sourced from https://lottiefiles.com/free-animation/loading-qjrg8ygl9S under the Lottie Simple License. Its JSON, source attribution, and license are bundled in assets/animations/. Reduce Motion pauses the animation.

Settings → Appearance offers Device default, Light, and Dark. The choice persists separately from library storage and responds to device appearance changes in System mode. The logo and download Lottie share the theme accent. iOS/Android native appearance is configured as automatic.

Selecting 192 kbps routes directly to YTMP3. Higher qualities use Flvto. A rejected verification response ends that attempt immediately and offers Continue at 192 kbps; source changes never silently alter the selected bitrate.

Now Playing expands from the mini-player into a full-screen view with a down-arrow minimize action. Minimizing leaves playback running. Entry/exit use a slide transition, playback artwork and controls use restrained spring motion, and seek progress is smoothed between status updates. Reduce Motion uses a fade and disables the decorative scaling.

Downloads auto-minimize into a compact circular progress indicator. Preparation workers remain mounted outside the download modal, so minimizing or navigating within Lilt does not cancel preparation, transfer, or saving. Cancel download remains a separate action. The destination playlist is captured when the download starts. Pending playlist entries show progress and become playable only after durable commit. When viewing that playlist, the bottom indicator is hidden to avoid showing the same download twice.

Song rows require a double-click/double-tap to play; playback buttons remain single-tap, and keyboard/screen-reader activation stays directly accessible. Playlists use a cover grid and a cover/title/action header; their large button pauses/resumes the current playlist. Repeat-one is badged inside its button. The selected player music Lottie animates only during playback and pauses with playback or Reduce Motion.

## Spotify-style interface and YouTube playlists

New installations open in Dark appearance. Existing theme preferences are preserved. The updated UI includes dark desktop panels, an adaptive library rail, rounded filters, responsive playlist covers, centered transport/seek controls, hover/press feedback, and the existing animated full-screen player with Reduce Motion support. All local-library, queue, metadata, export, and direct-link download tools remain available.

On iOS/Android, open Add music → YouTube and paste a public playlist URL (including a watch URL with a list parameter). Load full playlist reads all continuation pages, excludes unavailable videos, and reviews the total before downloading. Choose quality and download the playlist. Lilt creates a local destination unless you opened Add music within a playlist. Songs convert and save sequentially, with minimized progress, retry/fallback, skip, and retry-skipped controls. Original source order is preserved after retries. Exact duplicate videos are imported once. The batch stops at a failed conversion until you retry or skip it.

Keep the app open during the batch. Pending conversion batches are held in memory; they do not resume after app termination. Saved songs remain durable. The browser explains native-only automatic playlist downloads and supports importing multiple downloaded files. No backend, credentials, or new conversion provider is introduced. Public-page changes and provider availability can break acquisition; fixture-based pagination tests do not establish successful live YouTube conversion.
