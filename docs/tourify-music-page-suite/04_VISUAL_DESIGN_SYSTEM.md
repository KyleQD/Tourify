# 04 — Visual Design System

## Objective

Elevate the page into a premium, mature, music-first experience while remaining visually consistent with Tourify.

## Visual direction

The page should feel:

- Premium
- Editorial
- Immersive
- Mature
- Music-first
- Modern
- Distinctly Tourify

## Color and surface guidance

Use the existing Tourify theme tokens whenever possible.

Recommended approach:

- Deep navy and near-black base surfaces
- Controlled purple and magenta accents
- Artwork-driven color
- Soft ambient glow behind featured content
- Restrained borders
- Clear selected states
- Strong text contrast
- Subtle elevation between layers

Avoid:

- excessive neon borders,
- repeated bright gradient cards,
- glassmorphism on every surface,
- purple-on-purple low contrast,
- heavy card outlines,
- generic AI-style decorative blobs,
- fake equalizer graphics used as decoration,
- excessive pills.

## Typography

Use the existing Tourify type system.

Hierarchy:

- Page title
- Section title
- Supporting description
- Track title
- Artist name
- Metadata
- Provider label
- Secondary action

Requirements:

- Track titles remain readable at narrow widths.
- Artist and provider metadata have distinct visual priority.
- Do not shrink important controls below accessible sizes.
- Use truncation with accessible full-value labels where necessary.

## Artwork

Artwork should be the primary visual source of color.

Requirements:

- Consistent aspect ratios
- Responsive image sizing
- Lazy loading
- Placeholder fallback
- Broken-image handling
- Accessible alt text
- No layout shift
- No distorted stretching
- Touch-safe play controls

## Cards

Use cards only when the content benefits from grouping.

Avoid wrapping track tables, navigation, and every section in separate bordered cards.

Recommended card types:

- Release card
- Artist card
- Playlist card
- Genre card
- Featured release

## Track rows

Recommended desktop height:

- Approximately 56–72px depending on metadata density

Track rows should support:

- Artwork
- Title
- Artist
- Release
- Duration
- Provider
- Play state
- Save state
- Overflow menu

Secondary controls should appear on hover or focus on pointer devices but remain accessible on touch.

## Active playback styling

The currently playing item should be identifiable through:

- Play/pause state
- Subtle active row treatment
- Animated waveform or equalizer respecting reduced motion
- “Now playing” screen-reader status
- No reliance on color alone

## Motion

Use subtle motion:

- 120–250ms transitions
- Small artwork scale
- Fade or slide for menus
- Smooth active-state transitions
- Reduced-motion support

Avoid:

- constant decorative animation,
- large parallax,
- motion that delays input,
- animation tied to every scroll event.

## Empty-state styling

Empty states should be visually intentional, not tiny placeholders.

Use:

- Clear headline
- Brief copy
- One primary next action
- Optional secondary action
- Relevant discovery preview below
- Restrained illustration or artwork cluster

## Design completion gate

The visual system is complete when:

- Contrast is acceptable.
- Artwork is consistent.
- Active and focus states are clear.
- Empty states are useful.
- The page no longer feels blank.
- The design remains coherent with the global Tourify shell.
- Mobile controls remain touch-safe.
