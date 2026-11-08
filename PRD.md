# Lilt — Product Requirements Document

Version: 1.1  
Date: November 8, 2026  
Status: Local player preview implemented; runtime acceptance and external integrations pending  
Platforms: Android, iOS, and web  
Technology direction: React Native, Expo, and TypeScript

## 1. Product overview

Lilt is a local-first music player for an international audience, with an original interface centered on personal collections and offline listening. Users import audio files or paste supported download links, save music into an on-device library, and listen offline. An account is optional for the core player. A future subscription adds playlist synchronization and other cloud features.

The core experience is: **Add music → save locally → organize → play offline.**

The original requested acquisition experience is: **Copy a YouTube link → paste → download audio → play offline.** This remains a requested capability with an unresolved provider authorization dependency. It must not be presented as a working, approved integration. The first release supports local imports and authorized direct audio downloads. A provider adapter can enable additional sources after permission and technical feasibility are established.

## 2. Goals and boundaries

### Goals

- Make importing, finding, and playing saved music simple.
- Keep core playback, search, favorites, and playlists usable without internet or sign-in.
- Share application logic and components across Android, iOS, and web.
- Establish an original Lilt identity through a collection-first library, expressive typography, clear track lists, and a compact expandable player.
- Preserve a user's library through app restarts and interrupted downloads.
- Establish a foundation for subscriptions, sync, and PH/global music discovery.

### Out of scope for the first release

- Windows and macOS desktop applications. Those users can use the web app.
- A mainstream licensed streaming catalog.
- An unrestricted YouTube-to-MP3 service or a third-party converter integration.
- Music recommendations, lyrics licensing, social feeds, collaborative playlists, casting, and equalizer.
- Automatic audio-file transfer between devices.
- Paid subscription launch and chart-provider integration; these are subsequent phases.

## 3. Audience and principal use cases

Initial audience: mobile and web listeners who want a personal offline library, including listeners with intermittent connectivity. The Philippines is an initial market of interest; the player is not country restricted.

1. A listener imports existing music and plays it in airplane mode.
2. A listener pastes an authorized audio URL, downloads it, and adds it to a playlist.
3. A listener pauses a track, closes the app, and resumes from the saved position later.
4. A listener uses headphones and lock-screen controls while the mobile app is in the background.
5. A web listener saves supported audio for offline use and can export it before clearing browser storage.

## 4. Platform behavior

| Capability | Android / iOS | Web |
| --- | --- | --- |
| Local import | System file picker; copy into app storage | Browser file picker; copy into browser storage |
| Link download | Authorized HTTP(S) sources | Authorized HTTP(S) sources permitting browser access through CORS |
| Offline audio | Persistent app documents storage | IndexedDB or OPFS, subject to quota and eviction |
| Offline app launch | Installed app | Service worker and cached application shell after initial load |
| Background playback | Native audio configuration and media controls | Best effort; depends on browser and OS |
| Background download | Native integration subject to OS scheduling | No guarantee after tab suspension or closure |
| Share link into app | Later enhancement requiring native share integration | Paste link initially |

An installed PWA is still subject to browser storage and lifecycle constraints. A browser download into the operating system's Downloads folder does not automatically become an offline item in the web library. App uninstall or clearing site data can remove stored music; show this in storage settings and offer export where supported.

## 5. MVP functional requirements

### FR-01: First use and access

- Open directly into a usable local library without mandatory registration.
- Show an empty state with “Import files” and “Add link” actions.
- Request permissions only when the relevant action requires them.
- Explain where imported files are stored and allow users to review storage usage.

### FR-02: File import

- Support single and multiple file selection.
- Baseline format: MP3. Validate AAC/M4A support on the target platform before exposing it as supported. Other codecs are optional and must be capability tested.
- Extract title, artist, album, duration, and embedded artwork when available.
- Fall back to filename, “Unknown artist,” and a neutral artwork placeholder.
- Validate that the file is playable; an extension alone is insufficient.
- Detect exact duplicates using a content hash and let the user skip or explicitly keep a copy.
- Commit the library record only after a successful file copy and validation.

### FR-03: Add link and download

- Accept a pasted HTTP(S) URL and identify its supported source adapter.
- For a supported direct audio link, show available metadata and a confirmation action before downloading.
- If metadata is unavailable, show the hostname and filename, then extract tags after download.
- Unsupported providers receive a clear explanation and an import-file alternative.
- Never label a link as downloadable until the adapter validates it.
- Display progress when content length is available; otherwise show indeterminate progress.
- Provide cancel, retry, and a clear failed state. Resume only when the source and download implementation support it; otherwise restart explicitly.
- Limit concurrency, check available storage where possible, and handle quota exhaustion.
- Download into a temporary location, validate, then move to persistent storage and commit the record atomically where supported.
- Recover pending queue records after restart; clean abandoned partial files.
- Network errors must not remove already downloaded songs.
- Downloads must produce durable library files; temporary playback caches are insufficient.

### FR-04: Local library and search

- Browse Songs, Albums, Artists, Playlists, and Favorites.
- Search locally by title, artist, and album while offline.
- Sort songs by title, artist, recently added, and duration.
- Display saved status and distinguish missing/unavailable files from ready tracks.
- Allow editing basic metadata overrides without rewriting the source file.
- Provide separate actions for removing a track from a playlist and deleting it from the library. Confirm destructive library deletion.

### FR-05: Audio playback

- Play, pause, seek, next, previous, shuffle, and repeat off/all/one.
- Display elapsed time, duration, artwork, title, and artist.
- Maintain a queue; allow play next, add to queue, remove, and reorder.
- Preserve queue, playback position, and settings locally. Restore paused after relaunch rather than autoplaying unexpectedly.
- Show a persistent mini-player when a track is selected.
- On mobile, support background playback and lock-screen/headphone controls through configured native integrations.
- Handle calls, audio focus changes, and headphone disconnects appropriately; pause when headphones disconnect.
- Skip or report missing/corrupt files without crashing or looping indefinitely.
- Web playback starts from user interaction and handles browser autoplay restrictions.

### FR-06: Playlists and favorites

- Create, rename, delete, and reorder playlists.
- Add, remove, and reorder local tracks inside a playlist.
- Toggle favorites from track rows and the player.
- Preserve playlist entries when a track becomes unavailable and provide an actionable missing-file state.
- All local playlist and favorite operations work offline.

### FR-07: Storage and settings

- Show library storage usage and allow deletion of selected downloads.
- Keep core library metadata separate from expendable artwork caches.
- Provide export of playlists/metadata and audio files where supported, with platform-specific share/save flows.
- Web: request persistent storage where available, handle refusal, and show quota/storage status.
- Allow local data reset with explicit confirmation.
- Never store the sole copy of a saved track in a temporary cache directory.

## 6. Interface requirements

Design direction: an original personal music collection, calm and tactile, built around the music a listener has saved. Lilt uses its own palette, typography, navigation, and player composition. Spotify is a possible discovery integration only, not a visual reference. Use original Lilt branding and authorized artwork. This is a proposed design brief to validate in the first prototype, not an implemented design system.

### Visual system

- Light default theme: warm ivory canvas, pale stone surfaces, ink primary text, slate secondary text, and burnt-orange primary actions. Choose final tokens after contrast testing.
- Optional dark theme: deep warm charcoal, soft ivory text, and amber accents. Honor system preference once both themes are validated.
- Treat playlists as personal collections: generous artwork, editorial collection headings, subtle dividers, and readable track lists. Avoid a generic streaming-service carousel as the home screen.
- Pair expressive collection headings with a highly legible sans-serif for controls and metadata. Support international characters, longer translated labels, and right-to-left layouts as localization expands.
- Large screen headings, clear section labels, compact metadata, and prominent play actions.
- Clear selected, pressed, loading, offline, disabled, and keyboard-focus states.
- Color must not be the sole indicator of download or favorite status.
- Respect reduced motion, native safe areas, dynamic text, and accessible contrast.

### Navigation and screens

| Screen | Required content and actions |
| --- | --- |
| Collection (default landing) | Saved playlists, recently added music, resume listening, offline readiness, and visible Add music action |
| Search | Local search results grouped by songs, albums, artists, and playlists |
| Your Library | Filters, sort, track rows, saved indicators, storage access |
| Add music | Import files or paste link; source feedback and validation |
| Downloads | Active queue, progress, retry/cancel, completed/failed states |
| Playlist / Album / Artist | Artwork/header, metadata, play/shuffle, track list |
| Now Playing | Artwork, transport, seek, favorite, queue, available output controls |
| Settings | Storage, playback preferences, export, future account/subscription access |

Mobile: open directly to Collection. Use Collection, Transfers, and Discover as the top-level destinations; defer Discover until online discovery is implemented. Keep local Search in the Collection header and Add music as a prominent action. Downloads belong to Transfers, including batch progress and partial failures. A compact player dock expands into Now Playing. Distinguish local search from online discovery in labels and states.

Wide web: use a collection workspace with a narrow navigation rail, a library canvas, and an optional listening inspector containing the current track and queue. Keep playback controls available when the inspector is closed. Narrow web follows mobile navigation and the compact player dock. Target verification widths include 360, 390, 768, and 1440 CSS pixels, plus mobile landscape.

Every screen needs an empty, loading, error, and offline state where applicable. Icon-only actions require accessible labels. Use at least 44-point touch areas on iOS and 48-dp targets on Android; web must support keyboard operation and visible focus.

## 7. Subscription and cloud phase

The product includes a planned subscription, but pricing and payment providers remain undecided. Do not charge users for unimplemented cloud features.

| Free | Proposed Pro |
| --- | --- |
| Local imports, authorized downloads, offline playback | Playlist and favorites sync |
| Local search, favorites, playlists, queue | Cross-device metadata and playback-state sync |
| Basic export and storage controls | Additional backup/organization features after cost validation |

- Subscription expiry must not block playback of the user's imported local files.
- Playlist sync transfers metadata and track references; it does not imply audio-file sync.
- Optional audio backup requires a separate storage, bandwidth, rights, and retention decision.
- Validate entitlements on the backend from verified payment events; support restore purchases.
- Review current store billing requirements before choosing mobile purchase flows.
- Provide a defined offline entitlement grace period for paid cloud-adjacent features. Duration is a pre-launch decision.

## 8. PH and global discovery phase

- Add a separate Discover surface only after selecting a chart provider and confirming commercial-use terms.
- Candidates: Last.fm country/overall charts and Apple Music storefront charts.
- Label source, geography, ranking period, and last refresh time.
- An overall Last.fm ranking must be labeled as Last.fm data; an Apple country storefront chart must not be called a global chart.
- Chart entries are discovery metadata, not downloadable audio entitlements.
- Provider links open a supported online experience; local playback is available only when a corresponding local track exists.
- Cache chart data only within provider rules; stale data must show its timestamp.

## 9. Technical architecture

### Client

- Expo + React Native + TypeScript, with Expo Router for navigation.
- `expo-audio` as the initial playback candidate. Validate queue behavior, interruptions, media controls, and background playback in real development builds before committing to it.
- `expo-file-system` for native download/storage operations.
- SQLite-backed native library; a browser repository backed by IndexedDB/OPFS for web. Final database packages require a compatibility spike.
- Browser audio and storage implementations behind shared interfaces; do not assume native filesystem APIs exist on web.
- Shared interfaces: AudioEngine, LibraryRepository, FileStore, DownloadManager, SourceAdapter, and later SyncService and EntitlementService.
- Keep provider-specific URL logic outside UI components.
- Build a service worker/application-shell caching strategy for offline web launch; Expo web output alone must not be assumed to provide it.
- Persist user actions locally before any optional synchronization.

### Backend, when needed

- No backend is required for local file playback and permitted direct downloads that work from the client.
- Add services for authentication, subscription verification, metadata sync, and authorized provider integrations.
- Store provider secrets only on the backend.
- A conversion/proxy service is a separate implementation and operational dependency, not something Expo supplies. It does not resolve provider permission requirements.
- Any backend that fetches submitted URLs must restrict protocols, revalidate redirects, block private/internal destinations, cap size/time, and prevent abuse.

### Suggested implementation layout

```text
Lilt/
  PRD.md
  README.md
  apps/player/           # Future Expo app: Android, iOS, web
  packages/core/         # Future domain types and business logic
  packages/platform/     # Future storage, audio, source adapters
  services/api/          # Future optional backend
```

The initial implementation now lives in `src/` at the project root, with Expo configuration, platform adapters, and tests. The multi-package layout above remains a future extraction option. No cloud backend is scaffolded.

## 10. Core data model

| Entity | Principal fields |
| --- | --- |
| Track | id, title, artist, album, duration, mimeType, byteSize, contentHash, artworkRef, createdAt |
| LocalAsset | trackId, deviceId, storageKey, availability, importedAt |
| SourceReference | trackId, provider, externalId, redactedSourceUrl, acquisitionType |
| Playlist | id, name, createdAt, updatedAt, deletedAt |
| PlaylistItem | id, playlistId, trackId, sortOrder, addedAt |
| Favorite | trackId, createdAt, deletedAt |
| DownloadJob | id, sourceRef, state, bytesReceived, totalBytes, tempStorageKey, errorCode |
| PlaybackState | queueTrackIds, currentIndex, position, shuffle, repeatMode, updatedAt |
| Entitlement (later) | accountId, plan, status, expiresAt, lastVerifiedAt |

Use stable IDs rather than file paths as track identity. Device-local paths never become shared cloud paths. Keep signed URLs ephemeral and redact credentials/query tokens from logs and durable source metadata. A later sync phase must define mutation IDs, tombstones, ordering, and conflict resolution before launch.

Download lifecycle: queued → validating → downloading → verifying → completed, with failed/cancelled branches. A completed job requires a usable persistent asset and committed library record.

## 11. Reliability, privacy, and performance

- No upload of audio or listening history by default. Sync is explicit and opt-in.
- Network requests cannot block opening or searching a local library.
- Use virtualized lists and thumbnail artwork to keep large libraries responsive.
- Proposed targets: local search completes within 300 ms for a 10,000-track fixture; local play starts within one second on agreed reference devices. Validate these targets during the prototype.
- A local library can contain 10,000 metadata records without requiring all audio bytes to be loaded into memory.
- Handle storage full, revoked file access, file corruption, invalid links, denied permissions, connection loss, and app interruption.
- Do not log raw submitted URLs containing access tokens or personal local paths.
- Persist only necessary playback and queue state; analytics, if introduced, must be explicitly documented.

## 12. Delivery plan and acceptance gates

### Phase 0: Technical validation

- Create the Expo app and prove audio import/playback on Android, iOS, and web.
- Validate native background audio/media controls using installed development builds and physical devices.
- Prove persistent native file storage and browser offline shell/audio storage across restart.
- Test authorized direct-link downloads, CORS behavior, cancellation, storage exhaustion, and interrupted download recovery.
- Record source-provider feasibility separately; YouTube support cannot be declared complete without resolving authorization and integration.

### Phase 1: Local player MVP

- Implement the original Lilt visual direction and collection-first screens described above.
- Deliver import, supported link download, library, search, queue, playlists, favorites, export, and storage settings.
- Pass the release acceptance checklist below on all three platforms, documenting explicit web limitations.

### Phase 2: Accounts and subscriptions

- Decide pricing, provider, paid feature boundaries, sync conflicts, and retention.
- Add opt-in metadata sync, verified subscriptions, restore purchases, and account/data deletion.
- Confirm offline access remains intact when a subscription ends.

### Phase 3: Discovery and more sources

- Add approved PH/global chart sources and authorized source adapters.
- Consider share-to-app, cloud audio backup, and further audio format support after validation.

## 13. MVP release acceptance checklist

- [ ] Import multiple valid files; metadata fallbacks and duplicate handling work.
- [ ] Download an authorized link into persistent storage and play it after restart without internet.
- [ ] Unsupported links produce an actionable message rather than a false download success.
- [ ] Cancel/retry works and incomplete files do not appear as completed songs.
- [ ] A connection loss or full disk/quota produces a recoverable failure.
- [ ] Play, pause, seek, queue, shuffle, repeat, favorites, and playlists work offline.
- [ ] Mobile playback works with screen locked and handles interruptions/headphone disconnects.
- [ ] Web relaunches offline after initial preparation and plays previously stored music.
- [ ] Web handles storage persistence refusal, CORS failure, and missing/evicted files.
- [ ] Library deletion does not silently modify the user's original external file.
- [ ] Export produces usable files/metadata through supported platform flows.
- [ ] UI works at the specified widths, with keyboard and screen-reader access.
- [ ] Core player requires neither an account nor a subscription.

## 14. Success measures and unresolved decisions

Measure activation through first successful import/download and first offline play. Track download completion rate, playback failures, library recovery failures, and recurring use only through an agreed privacy-conscious measurement design. Numeric adoption/revenue targets require a beta baseline.

Decisions before implementation: Lilt prototype layouts, final accessible palette, and typography, supported initial source domains, initial format matrix, and target OS/browser versions. These do not block drafting this PRD.

Decisions before paid launch: subscription price, payment processing, offline entitlement duration, sync conflict rules, backup costs, and account deletion/retention rules.

Requested YouTube audio acquisition remains unresolved. No promise of YouTube extraction, app-store approval, or unrestricted music downloads is made in the MVP scope.

## 15. Reference documentation

These references informed planning; recheck current versions and terms before implementation or launch.

- Expo audio: https://docs.expo.dev/versions/latest/sdk/audio/
- Expo filesystem: https://docs.expo.dev/versions/latest/sdk/filesystem/
- Browser storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- YouTube developer policies: https://developers.google.com/youtube/terms/developer-policies
- Last.fm country charts: https://www.last.fm/api/show/geo.getTopTracks
- Last.fm overall charts: https://www.last.fm/api/show/chart.getTopTracks
- Last.fm commercial-use terms: https://www.last.fm/api/tos
- Apple Music charts: https://developer.apple.com/documentation/applemusicapi/charts

## 16. Revised mobile-first playlist workflow

Planning revision: November 8, 2026. This section changes the requested product priority from individual-track acquisition to playlist acquisition. Android and iOS are the first delivery targets; web follows the mobile acceptance gates. Earlier provider restrictions remain in effect. Requested capabilities below must not be represented as working integrations before validation.

### Principal journeys

1. **YouTube playlist to local library:** paste a playlist URL, load accessible playlist metadata, review tracks in source order, select all or individual tracks, then bulk-download eligible audio into a local playlist. Display private, deleted, unavailable, duplicate, and unsupported items individually. Reading a playlist does not itself grant permission to download its audio.
2. **Spotify discovery to YouTube suggestions:** search accessible Spotify playlists and browse an explicitly sourced collection of popular playlists where provider access permits. Show playlist tracks only when the API and permitted use allow it. Suggest YouTube candidates for eligible track metadata, allow the listener to inspect and change matches, then bulk-download only sources authorized for acquisition. This cross-service workflow requires provider-policy validation before enabling it.
3. **Offline listening:** search downloaded songs, artists, albums, and playlists; play the saved playlist without a network connection. Online discovery and local-library search have separate states so network failure never blocks local search.

### Discovery and matching requirements

- Do not invent a Spotify-wide popularity ranking. Show the source, market, refresh time, and actual ranking method where a ranking exists; otherwise label results as search results or curated selections.
- Validate Spotify API availability and permitted cross-service use before promising access to editorial/top playlists. A fallback may support the user's own eligible playlists or an independently licensed discovery source; this is a product-scope change, not equivalent Spotify support.
- Match using title, artist, duration, and version indicators such as live, remix, cover, explicit, or clean. Display candidate confidence and allow manual correction. Never silently substitute a different recording.
- Use separate provider adapters for playlist metadata, candidate lookup, and authorized audio acquisition. Missing download permission must produce a clear unavailable state, not a false success.

### Bulk download and protected storage

- Persist a parent batch and individual track jobs, preserving playlist ordering independently of completion order.
- Support select all, selection count, duplicate skipping, per-track progress, aggregate progress, cancel remaining, and retry failed items. Bound concurrent downloads and provider requests; handle quota/rate limits and partial success.
- Create local playlist entries with explicit pending/failed/unavailable states; mark a track playable only after validation, protected storage, and library commit succeed.
- Proposed storage format: a versioned authenticated encrypted container, provisionally `.liltmusic`, with keys protected through platform secure storage. Renaming or transcoding MP3 alone is not a security control.
- Validate seekable encrypted playback through a native integration before committing to the format. Avoid whole-track JavaScript buffering and durable plaintext playback copies. Encryption protects stored bytes against casual extraction; it is not a guarantee against a compromised device or audio capture.
- Audio export policy remains undecided: the original export requirement must be reconciled with app-only playback before implementation.

### Delivery sequence and gates

1. Validate provider access/permissions and encrypted offline playback on Android and iOS. Record unavailable capabilities explicitly.
2. Build mobile Collection, online Discover/Search, playlist review/matching, bulk Transfers, and Now Playing using Lilt’s original collection-first direction from section 6.
3. Implement reliable local library, persistent batch queue, protected acquisition, playlist management, and offline search/playback.
4. Test interrupted batches, retry without duplicate downloads, mismatches, private/deleted entries, low storage, key loss, corrupted containers, seeking, lock-screen controls, and airplane-mode restart.
5. Deliver an Android APK for testing and iOS through signed device builds or TestFlight, subject to signing/account setup. Add web afterward with explicit browser storage and protection limitations.

Provider facts checked during this revision:

- YouTube API developer policies require prior written approval for downloading/storing audiovisual content and restrict audio separation: https://developers.google.com/youtube/terms/developer-policies
- Spotify's developer policy restricts cross-service data transfer, with an exception for the user's personal data or metadata of the user's playlists: https://developer.spotify.com/policy

Neither format conversion nor encryption resolves provider authorization. The requested full YouTube-playlist-download and Spotify-top-playlist-to-YouTube workflow remains a target with external integration dependencies, not a completed or approved MVP capability.


## 17. Brand revision

Lilt replaces the working name LocalBeat. The product serves an international audience; PH charts are an optional regional discovery feature. The visual identity follows section 6 rather than a Spotify theme. Existing provider integrations, playlist acquisition requirements, mobile-first delivery priority, protected storage proposal, and authorization dependencies remain unchanged by this branding revision.

Lilt is a working product name. Trademark, app-store, and domain availability have not been verified.

## 18. Implementation record

The first local-player preview includes Expo/React Native application source, file import and decoder validation, native SQLite/documents storage, browser IndexedDB storage, library/search/favorites/playlists, playback and queue controls, direct-link batch transfers, export/storage settings, and offline web-shell generation. See README.md for run commands and exact scope.

Typechecking, domain tests, web export, native JavaScript bundle exports, and Android native-project generation have been checked. Runtime acceptance checkboxes above remain unchecked: the session sandbox prevented browser preview and simulator/device access. No APK/IPA or installed playback acceptance is claimed.

YouTube/Spotify integrations, matching, charts, encrypted protected playback, accounts, synchronization, subscriptions, embedded artwork extraction, and native store delivery are not completed. Normal audio storage/export in this preview does not implement the proposed protected format. See docs/VALIDATION.md for verification and external prerequisites.
