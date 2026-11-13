---
name: Lilt
description: "A personal offline music library with a Spotify-style dark interface."
colors:
  canvas: "#000000"
  surface: "#121212"
  rail: "#1F1F1F"
  ink: "#FFFFFF"
  muted: "#B3B3B3"
  line: "#333333"
  accent: "#1ED760"
  on-accent: "#000000"
  accent-soft: "#153A22"
  green: "#1ED760"
  green-soft: "#153A22"
  danger: "#FF8C98"
  white: "#FFFFFF"
  record: "#181818"
  nav-active: "#2A2A2A"
  selected-track: "#24342A"
  welcome: "#1B2D23"
  sleeve-paper: "#284D36"
  inspector: "#121212"
  scrollbar: "#727272"
  overlay: "rgba(0,0,0,0.75)"
  light-canvas: "#F5F5F5"
  light-surface: "#FFFFFF"
  light-rail: "#EBEBEB"
  light-ink: "#121212"
  light-muted: "#575757"
  light-line: "#D7D7D7"
  light-accent: "#117537"
  light-on-accent: "#FFFFFF"
  light-accent-soft: "#D8F3E2"
  light-green: "#117537"
  light-green-soft: "#D8F3E2"
  light-danger: "#B42332"
  light-white: "#FFFFFF"
  light-record: "#181818"
  light-nav-active: "#DCDCDC"
  light-selected-track: "#D8F3E2"
  light-welcome: "#E5EBE7"
  light-sleeve-paper: "#CCD9D1"
  light-inspector: "#FFFFFF"
  light-scrollbar: "#A0A0A0"
  light-overlay: "rgba(0,0,0,0.6)"
typography:
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "36px"
    lineHeight: "44px"
    fontWeight: 800
    letterSpacing: "-0.7px"
  section:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "23px"
    lineHeight: "30px"
    fontWeight: 700
  text:
    fontSize: "15px"
    lineHeight: "23px"
  muted:
    fontSize: "14px"
    lineHeight: "22px"
  label:
    fontSize: "14px"
    lineHeight: "20px"
    fontWeight: 600
  button:
    fontSize: "14px"
    lineHeight: "20px"
    fontWeight: 700
rounded:
  track: "6px"
  cover-small: "7px"
  card: "8px"
  panel: "10px"
  input: "12px"
  sheet: "16px"
  icon: "24px"
  button: "26px"
spacing:
  panel-gutter: "8px"
  control-y: "12px"
  filter-x: "16px"
  control-x: "18px"
  compact-page: "22px"
  sheet-body: "24px"
  wide-page: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "13px 16px"
  filter-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.icon}"
    padding: "0px 16px"
  filter:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    rounded: "{rounded.icon}"
    padding: "0px 16px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    width: "540px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.icon}"
    width: "48px"
  track:
    textColor: "{colors.ink}"
    rounded: "{rounded.track}"
    padding: "0px 8px"
---

# Design System: Lilt

## Overview

**Creative North Star: "Your music, kept close"**

The November 2026 redesign follows the user's Spotify-style brief, superseding the earlier ivory, serif, and terracotta direction. Lilt retains its own name, logo, local library, offline playback, import tools, and converter integrations. Near-black inset panels, bold sans-serif hierarchy, green actions, rounded filters, and dense song rows make this an operating surface for choosing, organizing, downloading, and playing music.

Dark appearance is the default for new installations. Existing appearance preferences remain honored, including Device default and Light. The shared implementation serves React Native on iOS and Android and React Native Web.

**Key Characteristics:**

- Near-black panels and bright green playback actions.
- Bold sans-serif headings and practical, scalable body text.
- Flat tonal layering around a persistent player.
- Adaptive navigation and deterministic geometric sleeve placeholders.
- Truthful empty, downloading, failed, and saved states.

## Colors

The primary palette combines black and neutral panels with a vivid green action color. The frontmatter records the implemented dark values; `light-` tokens record the alternate appearance. Source of truth: `src/core/appearance.ts`.

### Primary

Use accent for playback, import actions, current-track titles, selected favorites, focus, and progress. Use on-accent for labels on solid accent buttons; accent-soft supports selected icon actions.

### Neutral

Canvas separates the inset surface panels. Rail provides neutral controls and hover fills; ink supplies primary text, muted supplies secondary text, and line supplies fine separators. Selected-track, nav-active, welcome, and sleeve-paper are contextual fills. Overlay dims the background behind sheets; inspector and scrollbar follow the active appearance. White and record support the shared artwork treatment. Danger marks errors and destructive actions, and is a semantic status color rather than another brand accent.

**The Shared Palette Rule.** Read colors from the active theme; pair every accent action with onAccent so both appearances remain readable.

Body, secondary, primary-button, and status text contrast are covered by automated tests. Do not infer that arbitrary combinations of palette tokens are accessible.

## Typography

Use the bold sans-serif hierarchy in the frontmatter. Web display headings use Arial/Helvetica; native display headings use the platform sans-serif. Body and label roles inherit platform defaults. Native font scaling remains enabled. No external font load blocks opening the library.

Page titles use title, section and sheet headings use section, explanatory text uses text, track artists and metadata use muted, and control or song labels use label. Shared button labels are heavier than label. Playlist headings adapt to compact (34/42) and desktop (42/50) layouts; these are contextual variants, not a new global scale. Durations use tabular numbers.

## Layout

Desktop starts at 900 logical units with a 264-unit library rail, a rounded main panel separated by an 8-unit canvas gutter, and a persistent player beneath the panels. A 304-unit now-playing inspector appears from 1360 units. Desktop collection content uses 40-unit horizontal padding; compact content uses 22.

Compact layouts use the existing safe-area header, horizontally scrollable library filters, search, player dock, and bottom navigation. Keep the first-import copy and action visible without an oversized illustration. Full-screen player content is centered within a maximum width of 560 units and remains scrollable.

Playlist covers form an adaptive two-to-five-column grid with a 16-unit gap. The count follows available content width: more than 520 units uses three columns, more than 740 uses four, and more than 1000 uses five. Keep dense song rows flat with a minimum 72-unit height.

## Elevation & Depth

Depth comes from tonal panels, canvas gutters, contextual fills, fine dividers, and modal overlays. The shared components do not use cast shadows as their hierarchy system. Web input focus adds an inset accent ring; keyboard focus uses a 2px accent outline with a 3px offset.

## Shapes

Rounded ends identify buttons, search, and filters. Panels and cards use smaller corners; sheets use a stronger curve. Icon actions retain a circular 48-unit target. Text fields retain explicit labels, a fine border, and the input radius. Deterministic sleeves use 5-unit corners above 100 units and 7-unit corners at smaller sizes; circular records and grooves sit inside. Their saturated muted backing palette comes from `src/ui/components.tsx` and is decorative, not fetched album artwork.

## Components

Primary buttons use accent, bold on-accent labels, and the shared pill shape. Secondary buttons use rail, quiet buttons stay transparent, and both use ink. Hover scales shared buttons to 1.035; press scales to 0.97 with 0.8 opacity; disabled buttons use 0.45 opacity. Web state transitions last 160ms with ease-out. Reduce Motion disables web decorative transitions.

Library filters use ink fills with surface labels when selected, and rail with ink otherwise. Search uses a rounded rail fill; forms use bordered surface fields. Song rows show source artwork placeholders, green current-track titles, favorite actions, duration, and overflow controls. Playlist cards reveal rail on hover and scale to 0.98 when pressed.

**The Persistent Playback Rule.** Keep playback available while navigating, and minimize the full-screen player without pausing.

Desktop transport controls sit above the seek bar with shuffle, previous, play/pause, next, and repeat. Compact playback remains in the persistent dock. The full-screen player slides in and minimizes without pausing. Reduce Motion switches its transition to a fade, disables artwork scaling and decorative playback animation, and makes seek progress immediate. Regular seek progress interpolates over 300ms; play-button feedback and artwork scaling use source-defined springs. Their precise settings are recorded in the sidecar.

Add music reviews all discovered pages of public YouTube playlists on native before starting. It creates a named local playlist unless a destination was selected, downloads sequentially, advances after durable commit, preserves source order including retries, offers retry/fallback/skip on failed conversions, and exposes progress in the existing minimized download dock. A finished batch lists saved, skipped, and unavailable entries and can retry skipped songs.

**The Durable Save Rule.** Show success only after the storage commit; progress and recovery actions must reflect application state.

Whole-playlist conversion requires the native app to remain open. Pending batches do not resume after process termination; saved songs and transfer history are durable. Web keeps manual converter handoff and multi-file imports and explicitly identifies native-only batches. Public page parsing and external converters remain upstream dependencies rather than an authenticated catalog integration.

Rendered web screenshots cover compact and desktop surfaces, populated playlists, full-screen playback, settings, and downloads. Unit coverage includes palette contrast, pagination, unavailable entries, duplicates, cancellation, partial-page failures, and source order after retries. Native JavaScript bundles passed, but no booted simulator was available. Browser evidence does not establish native hardware acceptance; live converter success remains unverified.

## Do's and Don'ts

- Do use the shared theme and typography roles across native and web.
- Do retain safe areas, scalable text, accessible labels, keyboard operation, and minimum 48-unit action targets.
- Do preserve collection order and truthful loading, error, unavailable, and saved states.
- Do identify deterministic sleeves as placeholders rather than fetched album artwork.

- Don't restore the superseded ivory, serif, and terracotta direction.
- Don't fabricate songs, artists, artwork, connected providers, or transfer success.
- Don't use browser screenshots as proof of native simulator or hardware acceptance.
- Don't promote the first-import welcome composition into a universal screen template.
