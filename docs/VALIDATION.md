# Validation record

Date: November 8, 2026.

## Completed checks

- TypeScript strict compilation for app, platform adapters, core tests, and Playwright specifications.
- Domain tests: audio signatures/duration, unsupported URLs and query-token redaction, interrupted-job recovery, duplicate import, ordered playlist batches with a two-transfer bound, partial retry, cancellation without commit, storage failure atomicity, missing-file repair, and international local search.
- Production web export with versioned offline-shell generation.
- Android and iOS Metro/Hermes bundle exports. These validate module resolution/bundling, not installed runtime behavior.
- Android native-project generation with audio foreground service/background configuration.
- Source review fixed missing-file queue blocking, unintended substitution of an unavailable track, unbounded browser audio references, per-source browser readiness and repeat setup, native queue insertion after missing tracks, stale native seek completion, and keyboard avoidance.
- Mechanical design detector reported no findings. The TSX source check does not establish visual acceptance.

## Environment limits observed

The sandbox rejected a local preview server and Playwright's server with `listen EPERM` at 127.0.0.1:4173. CoreSimulator service access and ADB's local service startup were also unavailable. No browser or device screenshots were produced. No APK, IPA, signed build, cloud deployment, or provider authorization is claimed.

## Required before MVP acceptance

- Run Playwright on the exported web build, including 360/390/768/1440 widths and actual offline relaunch after the service worker is ready.
- Verify second and subsequent audio sources start, repeat-one survives source replacement, queue edits preserve the current item, and restoration stays paused.
- Install Android/iOS development builds and exercise screen-lock playback, native queue transitions, calls/audio focus, headphone disconnect, media buttons, and safe areas.
- Check iOS/Android large text, keyboard entry, system Back and sheet dismissal, screen readers, touch targets, and mobile landscape.
- Exercise actual SQLite/documents and IndexedDB commits across process termination, low storage, browser eviction/persistence refusal, invalid codecs, and corrupt files.
- Test a real permitted audio host with and without CORS, redirect errors, missing content length, quota exhaustion, cancel during verification, signed-link expiry, and batch interruption/retry.
- Validate export/share flows and confirm reset does not alter original external audio files.
- Measure local search and scrolling with 10,000 metadata records; profile hashing/import memory and native batches on reference devices.
- Decide encrypted seekable playback architecture and its export policy before introducing a protected container format.

## External prerequisites

Provider API credentials and approved use, chart licensing/access, production package/domain ownership, Expo/EAS association, mobile signing, subscription products, and backend retention/sync policies remain outstanding.
