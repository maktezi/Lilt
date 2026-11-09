# Lilt

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

React Native, Expo, and TypeScript, as approved in the implementation plan. Android and iOS first; a shared web client follows.

## Users

International listeners managing a personal music collection, including people with intermittent connectivity.

## Product Purpose

Import music, organize it into playlists, and play it offline without an account.

## Operating Context

Listeners import existing audio files or permitted direct audio links. Library access and playback must survive app restart and network loss. Playlist discovery and acquisition are future integrations requiring provider access and authorization.

For individual YouTube videos, Add music uses Flvto’s public player inside the native app, with 128/256/320 kbps selection and automatic saving through the existing download queue. YTMP3 is an in-app fallback at an explicitly labeled 192 kbps. There is no Lilt backend. The web version opens converter sites in a separate tab and imports files manually. Conversion availability depends on the third-party sites; automatic provider switching is not enabled.

## Capabilities and Constraints

The approved plan and PRD.md specify local search, favorites, playlists, persistent downloads, playback queue, and mobile background audio. Encrypted seekable storage needs a native feasibility spike before adoption. No provider credentials, billing accounts, signing identities, or licensed music catalog were supplied. Do not simulate successful provider downloads.

## Brand Commitments

Keep the current Lilt name. Follow the approved collection-first ivory, ink, burnt-orange brief in PRD.md. Use an original interface rather than a Spotify theme.

## Evidence on Hand

PRD.md and README.md. There is no existing application, user library, or artwork collection. Empty states must reflect that fact.

## Product Principles

- Opening and searching a saved library never depends on network access.
- A downloaded track is ready only after durable storage and validation succeed.
- Preserve collection order independently of download completion order.
- Be clear about unavailable integrations and recoverable errors.

## Accessibility & Inclusion

Readable contrast, scalable text, labeled icons, keyboard operation on web, native safe areas, and minimum 48-unit action targets.

## Open Decisions

Provider access, encrypted storage and export policy, subscription pricing, signing setup, supported OS releases, and physical-device acceptance remain undecided.
