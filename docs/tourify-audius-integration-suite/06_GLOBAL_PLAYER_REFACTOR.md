# 06 — Global Player Refactor

## Objective

Refactor the existing global player only as much as required to support provider-neutral queue items and server-resolved playback descriptors. Preserve current behavior, keyboard controls, media session behavior, route persistence, and native music playback.

## Mandatory audit

Locate and document:

- Global player component and mounting point.
- Player context/store and persistence strategy.
- Queue, repeat, shuffle, previous/next logic.
- Current audio element or media library.
- Route transitions and layout boundaries.
- Existing native track shape.
- Analytics hooks.
- Mobile and mini-player variants.
- Autoplay handling.

## Target player state

```ts
interface PlayerState {
  queue: QueueItem[];
  currentIndex: number;
  status: 'idle' | 'resolving' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  currentTimeMs: number;
  durationMs: number | null;
  volume: number;
  muted: boolean;
  repeatMode: 'off' | 'one' | 'all';
  shuffleEnabled: boolean;
  playbackSessionId: string | null;
  error: PlayerError | null;
}
```

Queue items should contain canonical track identity and display metadata, not temporary stream URLs.

## Playback sequence

1. User requests play.
2. Player places/selects canonical queue item.
3. Store enters `resolving`.
4. Client requests playback descriptor.
5. Store validates that response still matches the selected item.
6. Audio source is assigned.
7. Store enters `loading`, then `playing` after media events.
8. Analytics are emitted once per state transition using deduplication guards.

## Concurrency controls

- Abort prior resolution requests when the selected track changes.
- Ignore stale responses using request sequence IDs.
- Prevent double-play from rapid repeated clicks.
- Do not auto-advance twice after duplicate `ended` events.
- Reset provider-specific errors when a new track begins.

## Persistence

Persist only safe player state:

- Queue identifiers and normalized display metadata.
- Current index.
- Volume, mute, repeat, shuffle.

Do not persist:

- Temporary playback URLs.
- Provider credentials.
- Unbounded raw metadata.

If session restoration attempts to play an unavailable provider track, show a non-blocking error and allow skip/remove.

## UI states

- Resolving source.
- Loading media.
- Playing/paused.
- Provider unavailable.
- Track unavailable.
- Network failure with retry.
- Authentication/permission failure when applicable.

## Browser integration

- Preserve Media Session API behavior where already supported.
- Update media metadata from normalized track information.
- Handle autoplay rejection as a normal paused state.
- Maintain accessible keyboard and screen-reader controls.
- Test Safari, Chrome, Firefox, and supported mobile browsers.

## Likely file targets

The agent must replace these examples with actual audited paths.

```text
components/player/global-player.tsx
components/player/player-controls.tsx
components/player/mini-player.tsx
contexts/player-context.tsx
stores/player-store.ts
hooks/use-player.ts
lib/music/playback-client.ts
app/layout.tsx
```

## Acceptance criteria

- Native Tourify tracks behave exactly as before.
- Audius tracks can enter the same queue and use the same controls.
- Route navigation does not stop playback unless current behavior intentionally does so.
- Stale resolution responses cannot replace the active track.
- Temporary URLs are never persisted.
- Analytics are not duplicated by retries or rerenders.
