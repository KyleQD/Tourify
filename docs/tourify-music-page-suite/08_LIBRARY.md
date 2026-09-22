# 08 — Library

## Objective

Build a complete saved-music management experience.

## Supported content types

Use actual available models. Recommended categories:

- All
- Tracks
- Releases or Albums
- Artists
- Playlists
- Downloads only if true offline/download functionality exists

## Core controls

### Search within library

- Debounced
- Case-insensitive where appropriate
- Searches title, artist, release, and playlist names
- Does not issue excessive requests
- Clear button
- Empty-results state

### Sort

Recommended options:

- Recently added
- Recently played
- Artist
- Title
- Release date where supported

### Filters

Recommended:

- Provider
- Content type
- Genre when reliable
- Availability
- Saved by user versus owned by user when relevant

### View mode

- Grid for visual collections
- List for dense track management
- Persist preference when appropriate

## Saved-track behavior

Saving a track must:

- Be permission-aware
- Use optimistic UI only with rollback
- Prevent duplicate save records
- Preserve provider identity
- Show mutation loading state
- Handle provider track deletion
- Work from every track appearance

Unsaving must:

- Confirm only when the action has broader consequences
- Remove the item consistently across views
- Not interrupt playback
- Roll back on failure

## Empty library state

Required content:

- Heading: “Build your music library”
- Brief explanation
- Primary action: “Discover music”
- Secondary action: “Explore Audius”
- Optional recommendation preview

The empty state should occupy the page intentionally but must not leave a blank viewport.

## Unavailable items

When a saved provider track is no longer available:

- Keep the record visible when useful
- Mark it unavailable
- Disable playback
- Offer remove-from-library
- Preserve playlist integrity
- Do not crash rendering

## Pagination and large libraries

Use:

- Pagination
- Infinite loading
- Virtualization

Choose the approach that best matches existing architecture.

Do not render thousands of track rows at once.

## Completion gate

The Library phase is complete when:

- Saved tracks load correctly.
- Save and unsave work with rollback.
- Search, sort, and filters work.
- Empty and no-result states are distinct.
- Provider identity is preserved.
- Unavailable tracks are handled gracefully.
- Large result sets remain performant.
