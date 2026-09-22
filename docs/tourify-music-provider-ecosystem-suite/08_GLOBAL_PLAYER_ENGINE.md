# 08 — Global Player Engine

## Core refactor

The global player becomes an orchestrator, not a single `<audio>` implementation. It owns queue state and delegates playback to one active runtime.

## Queue item

```ts
interface MusicQueueItem {
  queueId: string
  canonicalTrackId?: string
  canonicalReleaseId?: string
  provider: MusicProviderId
  playbackMode: PlaybackMode
  title: string
  artist: string
  artworkUrl?: string
  providerReferenceId: string
  sourceSurface: MusicSourceSurface
}
```

Do not store stream URLs or access tokens in queue entries.

## Player state machine

```text
idle
 -> resolving
 -> loading
 -> ready
 -> playing <-> paused
 -> ended
 -> transitioning
 -> error

Special states:
blocked_by_autoplay
provider_auth_required
provider_unavailable
external_action_required
```

## Runtime interface

```ts
interface PlaybackRuntime {
  mount(host: HTMLElement): Promise<void>
  load(descriptor: PlaybackDescriptor): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek?(seconds: number): Promise<void>
  setVolume?(value: number): Promise<void>
  destroy(): Promise<void>
  subscribe(listener: RuntimeEventListener): () => void
}
```

Optional methods correspond to provider capabilities. Generic controls disable gracefully when unsupported.

## Runtime behaviors

### Native audio

Full seek, progress, volume, Media Session, and analytics.

### Audius resolved stream

Resolve on current-item activation. Abort stale requests and refresh when expired.

### SoundCloud Widget

Host official iframe, initialize Widget API, map READY/PLAY/PAUSE/PLAY_PROGRESS/FINISH/ERROR events, and preserve visible attribution/provider link.

### Bandcamp embed

Render sanitized approved iframe parameters. Capabilities may be limited; the shell may show queue context while the embed owns playback controls. The orchestrator must still stop/hide prior runtimes and avoid simultaneous audio.

## Concurrency protection

- One runtime token/version per load.
- Abort controller for resolver calls.
- Ignore events from inactive runtimes.
- Destroy prior iframe/runtime before activating next where required.
- Debounce rapid next/previous.
- Ensure `ended` advances once.

## Persistence

Safe to persist:

- canonical queue references
- current queue index
- volume/mute/repeat/shuffle
- source surface

Never persist:

- playback URLs
- OAuth tokens
- provider iframe message payloads containing sensitive data

## UX rules

- Show provider source and creator attribution.
- Explain when controls are provider-limited.
- Allow retry, skip, or open in provider.
- Never autoplay Bandcamp or SoundCloud in a way that violates browser/provider behavior.
- Mobile and keyboard controls must remain consistent.

## Regression requirements

- Existing native music starts, pauses, seeks, queues, and survives route changes exactly as before.
- Mixed queue transitions never produce overlapping audio.
- Disabling a provider marks entries unavailable without corrupting the queue.

## Cross-cutting implementation guardrails

- **Audit first:** all file targets in this suite are candidates until confirmed against the live Tourify repository.
- **Additive only:** do not reset Supabase; do not drop, rename, truncate, or repurpose production columns or tables.
- **Preserve native playback:** Tourify-hosted audio remains a first-class provider and the fallback path.
- **Normalize at the boundary:** provider payloads are mapped into Tourify domain contracts before entering UI, queue, analytics, or persistence layers.
- **Resolve playback just in time:** expiring or provider-controlled playback URLs are never stored in Supabase, local storage, analytics, logs, or durable queues.
- **Feature-flag every provider:** discovery, connection, import, display, playback, sync, and commerce can be disabled independently.
- **Provider terms override product preference:** the common Tourify UX must adapt to each provider's permitted playback and attribution model.
- **No scraping:** do not scrape Bandcamp or SoundCloud pages, extract hidden stream URLs, bypass embeds, or reverse engineer provider controls.
- **Acting-account authorization:** all mutations must use Tourify's existing account/organization/artist authorization helpers.
- **Idempotency:** imports, links, syncs, analytics milestones, and webhook processing must be safe to retry.
- **Observability without leakage:** log request IDs, provider, operation, latency, and normalized error code; redact tokens, personal data, and playback URLs.
- **Rollback without data loss:** disable flags and detach provider execution paths; retain additive data for later recovery unless a user requests deletion.
