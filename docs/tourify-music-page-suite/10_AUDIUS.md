# 10 — Audius Integration

## Objective

Integrate Audius as a first-class music provider inside the Tourify experience.

## Provider principles

- Audius content uses Tourify UI components.
- Audius identity remains visible through restrained provider badges and attribution.
- Audius API failures remain isolated.
- Audius tracks normalize into the shared track model.
- Audius playback uses the global Tourify player.
- Audius tracks can be saved and added to playlists when permitted.

## Required audit checks

Before implementation, confirm:

- Existing Audius API client
- App key or authentication model
- Host discovery
- Stream URL resolution
- Artwork URLs
- Search endpoints
- Trending endpoints
- Playlist endpoints
- Artist endpoints
- Rate limits
- Attribution requirements
- Current error handling
- Current caching
- Existing provider IDs in saved tracks and playlists

## Audius section requirements

### Provider heading

Include:

- Audius label
- Brief description
- Status indicator only when useful
- Retry action on provider failure

### Search

Support:

- Debounce
- Abort stale requests
- Loading state
- Empty results
- Rate-limit messaging
- Retry
- Categorized results if supported

### Trending tracks

Display through the shared track list.

### Trending playlists

Display through shared playlist cards with provider labels.

### Trending artists

Display through shared artist cards with provider identity.

### Genre filtering

Use Audius-supported genres or normalized mappings.

Do not silently map unsupported genres incorrectly.

## Playback requirements

- Resolve playable stream URL at the correct time.
- Avoid exposing secrets.
- Refresh expiring URLs where necessary.
- Handle unplayable or deleted tracks.
- Preserve provider attribution.
- Do not reset the queue when moving between tabs.
- Support next and previous across mixed-provider queues when architecture allows.

## Save-to-library requirements

Persist:

- Provider = Audius
- Audius track ID
- Display metadata snapshot
- Artwork
- Artist
- Duration
- Source URL or attribution
- Availability status when supported

Do not permanently store short-lived signed stream URLs.

## Playlist requirements

Audius tracks should be addable to Tourify playlists through the normalized track record or provider-reference model.

Handle:

- Deleted Audius tracks
- unavailable streams
- changed metadata
- missing artwork
- duplicate additions

## Failure states

Implement distinct states for:

- Network failure
- Rate limiting
- Empty results
- Invalid provider response
- Missing artwork
- Stream resolution failure
- Deleted content
- Provider outage

## Completion gate

Audius is complete when:

- Search works.
- Trending content works.
- Tracks play through the global player.
- Tracks can be saved.
- Tracks can be added to playlists.
- Provider attribution is visible.
- Provider failure does not break native sections.
- No secrets or transient playback URLs are persisted improperly.
