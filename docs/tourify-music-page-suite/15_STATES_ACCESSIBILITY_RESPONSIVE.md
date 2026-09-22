# 15 — States, Accessibility, and Responsive Behavior

## Objective

Ensure every page state is production-ready and the experience is usable across devices and assistive technologies.

## Loading states

Create layout-matched skeletons for:

- Music Home
- Library
- Discover
- Audius
- Playlists
- Search
- Track lists
- Release grids
- Artist cards
- Playlist cards

Do not use only a centered spinner inside a blank viewport.

## Empty states

Create distinct states for:

- Empty library
- No playlists
- Empty playlist
- No listening history
- No followed artists
- No search results
- No genre results
- No native releases
- No Audius results

Each state must provide one logical next action.

## Error states

Handle:

- Native data request failure
- Audius request failure
- Playback failure
- Save failure
- Playlist mutation failure
- Search failure
- Permission failure
- Authentication expiration
- Missing artwork
- Missing audio
- Deleted provider content

Use inline errors when only one section fails.

## Desktop

- Full metadata
- Multi-column grids
- Hover enhancements
- Sticky navigation when useful
- No unnecessary right-side panel

## Tablet

- Reduced columns
- Collapsed secondary metadata
- Preserved core actions
- No clipped menus

## Mobile

- Horizontally scrollable top navigation
- Stacked featured content
- One- or two-column artwork grids
- Simplified track rows
- Overflow menus for secondary actions
- No hover-only behavior
- 44px minimum touch targets
- No horizontal page overflow
- Compatibility with bottom player
- Safe-area spacing

## Accessibility requirements

- Semantic headings
- Accessible tabs or navigation
- Visible focus states
- Keyboard navigation
- ARIA labels for icon buttons
- Announcements for playback changes
- Accessible menus and dialogs
- Reduced-motion support
- Artwork alt text
- WCAG-conscious contrast
- No color-only status
- Accessible drag-and-drop fallback
- Proper form labels and errors
- Escape behavior in overlays
- Focus restoration after dialogs

## Accessibility test matrix

Test with:

- Keyboard only
- Screen-reader spot checks
- Reduced-motion preference
- 200% browser zoom
- Narrow mobile viewport
- High-contrast conditions where available

## Completion gate

This phase is complete when:

- Major states exist for every section.
- Keyboard users can operate core workflows.
- Touch users are not dependent on hover.
- No horizontal overflow exists.
- Focus is managed correctly.
- Playback changes are announced.
- Skeletons reduce layout shift.
