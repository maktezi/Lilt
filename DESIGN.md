---
name: Lilt
description: A warm, collection-first music player for personal offline listening.
colors:
  canvas: "#F5F1E8"
  surface: "#FCFAF5"
  rail: "#EDE8DC"
  ink: "#292E27"
  muted: "#687062"
  line: "#DADACE"
  accent: "#A74325"
  accent-soft: "#F1DED2"
  green: "#486449"
  green-soft: "#E4EADF"
  danger: "#A33226"
  white: "#FFFFFF"
  record: "#30372F"
typography:
  title:
    fontSize: "36px"
    lineHeight: "44px"
    letterSpacing: "-0.7px"
  section:
    fontSize: "23px"
    lineHeight: "30px"
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
rounded:
  button: "10px"
  input: "12px"
  sheet: "16px"
  icon-button: "24px"
  track: "6px"
spacing:
  small: "8px"
  row: "12px"
  medium: "16px"
  large: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "13px 16px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
---

# Design System: Lilt

## Overview

**Creative North Star: "Record sleeve"**

Lilt uses the warmth of a personal record collection: ivory surfaces, dark green ink, burnt-orange actions, serif headings, and compact song rows. The sleeve metaphor shapes typography, material color, and geometric artwork placeholders; playback and navigation retain familiar controls.

The implemented system serves React Native on iOS and Android and React Native Web. This document records source-derived values and behavior, not a rendered acceptance review. Platform defaults supply body fonts and native text scaling.

**Key Characteristics:**
- Warm ivory surfaces with ink text and selective burnt-orange emphasis.
- Serif headings paired with practical system body text.
- Flat tonal layers, fine dividers, and gently rounded controls.
- Native safe areas and adaptive navigation around a persistent player dock.
- Deterministic geometric sleeve placeholders and truthful empty states.

## Colors

The palette combines warm paper neutrals with earthy action and status colors; exact values live in the frontmatter.

### Primary
- **Burnt orange** (`accent`): primary actions, active collection tabs, active compact navigation, playback progress, and favorite states.
- **Pale terracotta** (`accent-soft`): selected icon-control backgrounds and web text selection.

### Secondary
- **Library green** (`green`): local-storage reassurance and completed-transfer icons.
- **Pale sage** (`green-soft`): completed-transfer badges and explanatory feature containers.
- **Error red** (`danger`): failed-transfer messages, errors, and destructive option labels. Communicate the error in text as well.

### Neutral
- **Ivory canvas** (`canvas`): application background.
- **Warm paper** (`surface`): player dock, dialogs, form fields, and foreground text on orange buttons.
- **Shelf ivory** (`rail`): desktop navigation, search background, secondary buttons, and hover feedback.
- **Green ink** (`ink`): headings and primary text.
- **Sage gray** (`muted`): secondary text, metadata, and inactive icons.
- **Paper seam** (`line`): dividers, input outlines, progress tracks, and structural borders.
- **Record ink** (`record`): the disc inside sleeve placeholders.
- **White** (`white`): retained source palette constant; not a replacement for the warm surfaces.

**The Warm Paper Rule.** Use canvas, surface, and rail to establish hierarchy before adding decoration.

## Typography

**Display Font:** Source Serif 4 loaded as `CollectionSerif` on web; Georgia on iOS; platform serif on Android. **Body Font:** platform default sans serif. Font-family values are platform-selected in `src/ui/theme.ts`; no single cross-platform family token is asserted.

The shared hierarchy uses title, section, text, muted, and label roles from the frontmatter. Titles and sections use the display serif. Labels use semibold system text. Maintain these roles rather than introducing a separate marketing type system into utility screens.

The wordmark is supplied as a brand image. Track titles truncate to one line, secondary artist text follows below, and durations use tabular numerals. The collection's first-import illustration has a larger local heading; it is a surface-specific expression rather than a new global display token.

## Layout

The application fills its viewport inside safe areas on all four edges. Below (900 units), a compact header and bottom tabs surround content; the player dock stays above the tabs. At and above (900 units), a left rail (228 units) replaces the compact navigation. At and above (1360 units), a listening inspector (304 units) appears when a current track exists.

Collection gutters expand from (22 units) to (40 units) at the wide breakpoint; collection top padding expands from (22 units) to (42 units). Utility pages use their existing (28-unit) padding. These are observed component values, not an imposed universal grid. Row gaps commonly use the spacing steps in the frontmatter, with smaller optical adjustments in controls.

Track rows have a minimum height of (72 units). Buttons and icon buttons provide at least (48-unit) targets. Navigation and form layouts wrap where implemented. Keep flex children shrinkable so long metadata can truncate without pushing controls offscreen.

Sheets are bottom-aligned on native and centered on web, constrained to (92%) viewport height. Standard sheets cap at (540 units), with a wide variant at (680 units). The keyboard-avoiding container and sheet safe areas protect native form access.

## Elevation & Depth

The system uses no cast shadows. Tonal surface changes, one-unit borders, and spacing establish depth. Dialogs use a translucent dark scrim and a fade animation. Web text fields receive an inset accent focus treatment; this is a focus indicator, not a raised-surface style. No duration or easing token is established by the source.

## Shapes

Rectangular controls are softly rounded, with the component-specific radii in the frontmatter. Icon buttons are circular. Collection tabs use an underline instead of pill containers. Track rows use subtle rounding plus bottom dividers; they are not individual floating cards.

Sleeves use a square, softly rounded backing and concentric record circles. A stable name hash selects among five muted sleeve colors. This is a decorative placeholder, not imported album art. Its large variant has slightly tighter corners than the small variant. Brand renders `assets/brand/logo.png` as a contained Image at (30 units) high in compact headers and (38 units) otherwise, preserving its (285:114) aspect ratio; it exposes the image role and accessible label “Lilt”.

## Components

### Buttons

Primary buttons combine burnt orange and warm-paper text; secondary buttons use shelf ivory and ink; quiet buttons have transparent backgrounds. All share semibold labels, centered horizontal contents, and optional line icons. Hover reduces opacity to (0.88), press to (0.7), and disabled to (0.45). Loading replaces the leading icon with an activity indicator and disables the action.

Icon buttons use a circular (48-unit) target. Active state uses pale terracotta with an orange icon; hover or press uses shelf ivory. Disabled icon controls use (0.4) opacity. Web keyboard focus uses an accent outline (2px) with (3px) offset.

### Inputs / Fields

Standard fields use warm paper, a one-unit paper-seam border, inset padding, and a minimum height of (50 units). Collection search is a separate shelf-ivory composition with a search icon, a (48-unit) text field, and an optional clear button. Web inputs show an inset orange focus stroke. Error copy appears beneath the related form or action in error red; do not imply success before persistence completes.

### Navigation

The desktop rail uses icon-and-label rows, with a sage-tinted active background. Compact tabs use orange text and icons when active. Collection filters use muted labels at rest, semibold orange text and a two-unit orange underline when selected. Settings remains in the compact header and the rail footer.

### Containers and sheets

Containers remain flat and use tonal fills selectively for introductory or explanatory content. Sheet headers pair a serif section title with a labeled close icon. Sheet bodies scroll and use generous vertical spacing; do not convert every list row into a card.

### Track rows and player

Rows combine an optional numeric index, geometric sleeve, title and artist, duration, favorite, and overflow controls. A selected row receives a pale sage fill and orange title. The dock remains visible even when empty, stating that nothing is playing and disabling playback. On wide layouts it includes the seek bar and transport controls; compact layouts retain play and queue actions. The expanded player uses a large sleeve and circular orange play control.

### Empty states and sleeve placeholders

Empty states pair a muted line icon on a circular shelf-ivory backing with a serif title, short practical explanation, and a relevant action. First import may use the larger sleeve composition. Show real library metadata after import; never fabricate songs, artists, cover art, provider connections, or successful transfers.

## Do's and Don'ts

### Do:
- **Do** preserve the ivory, ink, and burnt-orange identity across native and web surfaces.
- **Do** use the shared typography roles and platform display-font selection.
- **Do** retain safe areas, labeled controls, scalable text, and at least 48-unit action targets.
- **Do** use truthful empty states and explicit unavailable, loading, error, and saved states.
- **Do** carry the same deterministic sleeve treatment through lists, dock, and expanded player.

### Don't:
- **Don't** replace the approved identity with a Spotify-style visual theme.
- **Don't** fabricate artists, songs, artwork, connected providers, or transfer success.
- **Don't** add cast shadows or floating cards as the default hierarchy treatment.
- **Don't** promote one surface's welcome composition or oversized heading into a universal screen template.
- **Don't** treat this source-derived document as evidence of rendered or physical-device acceptance.
