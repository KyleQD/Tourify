# 06 — Shared Component System

## Objective

Create or consolidate a reusable music component system that supports all page sections without duplication.

## Audit-first requirement

Before creating a component, search for an existing equivalent.

For each component, choose one:

- Reuse unchanged
- Reuse with extension
- Consolidate duplicates
- Create new
- Retire only after all consumers are migrated

## Suggested components

Adapt names to existing project conventions.

```txt
components/music/
  music-page-header.tsx
  music-primary-nav.tsx
  music-home.tsx
  music-library.tsx
  music-discover.tsx
  music-audius.tsx
  music-playlists.tsx
  music-search.tsx
  music-search-results.tsx
  track-row.tsx
  track-list.tsx
  release-card.tsx
  artist-card.tsx
  playlist-card.tsx
  genre-card.tsx
  featured-release.tsx
  continue-listening.tsx
  provider-badge.tsx
  music-empty-state.tsx
  music-section-error.tsx
  music-section-skeleton.tsx
  add-to-playlist-dialog.tsx
  create-playlist-dialog.tsx
```

## Track row contract

A reusable track row should support:

- Normalized track input
- Current-playing state
- Play/pause action
- Save/unsave action
- Add-to-playlist action
- Share action
- View artist action
- Provider badge
- Duration
- Optional release metadata
- Unavailable state
- Keyboard interaction
- Touch-safe menu
- Loading mutation state
- Error rollback

## Release card contract

Support:

- Artwork
- Release title
- Artist
- Release type
- Year
- Provider
- Play action
- Save action
- Overflow menu
- Loading state
- Unavailable state

## Artist card contract

Support:

- Artist image
- Name
- Genre or descriptor
- Location when available
- Follow state
- Play-top-track action
- View-profile action
- Honest metrics only

## Playlist card contract

Support:

- Cover or artwork mosaic
- Name
- Owner
- Track count
- Total duration
- Visibility
- Last updated
- Play action
- Context menu
- Editable state for owners

## State components

Create shared components for:

- loading skeleton
- inline error
- empty state
- provider unavailable
- permission denied
- unplayable track
- missing artwork

## Component quality requirements

- Typed props
- No `any` unless documented
- Semantic HTML
- Accessible labels
- Focus-visible styles
- Touch support
- Reduced-motion support
- No duplicate data fetching inside leaf components
- No direct provider-specific response handling in presentation components

## Completion gate

The shared component phase is complete when:

- Track, release, artist, and playlist presentation are reusable.
- Provider-specific logic is not embedded in UI components.
- Current-playing state works in all track appearances.
- Core components have loading and unavailable states.
- Components are responsive and keyboard operable.
