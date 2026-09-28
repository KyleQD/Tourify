# 13 — Global Player and Queue

## Objective

Ensure all Music page playback uses the existing persistent Tourify player.

## Audit requirement

Document:

- Player store
- Audio element ownership
- Queue state
- Current track
- Previous/next logic
- Shuffle
- Repeat
- Volume
- Seek
- persistence
- route transition behavior
- error handling
- provider stream resolution
- mobile player UI

## Core requirements

The Music page must support:

- Play
- Pause
- Resume
- Next
- Previous
- Queue
- Shuffle
- Repeat
- Volume
- Seek
- Track progress
- Artwork
- Artist navigation
- Track navigation
- Save
- Add to playlist
- Provider identity
- Persistent playback across routes

## Single-player rule

There must be one authoritative playback state.

Do not:

- create local audio elements in track cards,
- create a second player store,
- reset playback on tab change,
- maintain separate queues per component without integration.

## Queue behavior

Define and document queue sources:

- Track list
- Playlist
- Release
- Search results
- Trending section
- Continue listening

When a user starts playback:

- Current context should populate or update the queue.
- Duplicate handling must be predictable.
- Mixed-provider tracks should be supported when possible.
- Unavailable tracks should be skipped or surfaced clearly.
- Queue changes must not unexpectedly stop current playback.

## Current-track highlighting

Every appearance of the active track should reflect:

- current state,
- play/pause,
- progress if appropriate,
- accessible “currently playing” label.

## Provider resolution

Native and Audius tracks may resolve audio differently.

Provider resolution must:

- occur behind an adapter or service,
- handle expired URLs,
- avoid storing secrets,
- recover from provider failures,
- expose actionable errors.

## Error behavior

Handle:

- missing source
- expired source
- provider outage
- unsupported format
- browser autoplay restriction
- network interruption
- removed content

Errors should not corrupt the queue.

## Accessibility

- Announce playback changes.
- Provide labels for all player controls.
- Support keyboard operation.
- Respect reduced motion.
- Do not rely on icon shape alone without labels.
- Ensure seek and volume controls are accessible.

## Completion gate

The player phase is complete when:

- All page play actions use the global player.
- Playback survives section and route changes.
- Current-track highlighting is consistent.
- Native and Audius playback work.
- Queue actions are stable.
- Errors do not corrupt playback state.
