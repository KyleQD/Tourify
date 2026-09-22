# 03 — UX and Information Architecture

## Objective

Create a clear, scalable page structure that supports both passive listening and active music management.

## Recommended top-level navigation

- Home
- Library
- Discover
- Playlists
- Audius

Use semantic links or an accessible tab pattern.

Requirements:

- Preserve selection through refresh.
- Support direct linking.
- Maintain playback during section changes.
- Allow horizontal scrolling on mobile.
- Use a clear active state without a bright boxed outline.
- Include visible keyboard focus.
- Restore scroll position when appropriate.

## Page shell

### Compact header

Include:

- Small “Music” eyebrow
- “Your Music” title
- Brief supporting copy
- Search action
- Create Playlist action
- Upload or Manage Music action when authorized

Reduce decorative height. The header should not consume a large portion of the first viewport.

### Content container

- Use the Tourify shell width.
- Prefer approximately 1280–1440px maximum content width when compatible with the existing layout.
- Use 24–32px desktop gutters.
- Use 16–20px mobile gutters.
- Use 32–48px between major sections.
- Avoid placing every section inside a heavy bordered panel.

## Music Home

Recommended sequence:

1. Continue Listening
2. Recommended on Tourify
3. Trending on Tourify
4. From Artists You Follow
5. Explore by Genre
6. Upcoming Music Events or Music Near You
7. Audius Highlights

Sections should hide gracefully when unsupported or empty.

## Library information architecture

Primary filters:

- All
- Tracks
- Albums or Releases
- Artists
- Playlists
- Downloads only if real download support exists

Controls:

- Search within library
- Sort
- Provider filter
- Grid/list view
- Result count
- Clear filters

## Discover information architecture

Recommended sequence:

1. Featured release
2. Trending tracks
3. New releases
4. Artists to watch
5. Music near you
6. Browse genres
7. Browse moods or activities
8. Audius highlights

## Audius information architecture

Recommended sequence:

1. Provider heading and status
2. Audius search
3. Trending tracks
4. Trending playlists
5. Trending artists
6. Genre filters
7. Pagination or load-more behavior

## Playlists information architecture

Sections:

- Your Playlists
- Saved Playlists
- Recently Updated
- Suggested Playlists, only if real data exists

Primary actions:

- Create playlist
- Search playlists
- Sort
- Filter by ownership or visibility

## Search information architecture

Search across:

- Native tracks
- Audius tracks
- Artists
- Releases
- Playlists

Results should be grouped by type and provider.

## URL-state guidance

Prefer URL-backed state for:

- Current section
- Search query
- Genre filter
- Provider filter
- Library sort
- Library view mode when appropriate

Do not place high-frequency transient player state in the URL.

## Navigation completion gate

The information architecture is complete when:

- Every top-level section has a clear purpose.
- Empty sections do not produce blank pages.
- Navigation is keyboard accessible.
- Refresh preserves the active section.
- Playback remains uninterrupted.
- Mobile navigation does not overflow the page.
