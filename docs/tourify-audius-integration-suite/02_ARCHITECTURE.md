# 02 — Architecture

## Target architecture

Tourify should use a canonical internal track model with provider-specific references. UI components and the global player consume normalized playback descriptors instead of directly handling Audius response payloads.

```text
Tourify UI surfaces
  ├─ Artist profile
  ├─ Feed/post attachment
  ├─ Search/import modal
  ├─ Playlist/queue
  └─ Global player
          │
          ▼
Normalized Music Domain Layer
  ├─ TrackSummary
  ├─ PlaybackDescriptor
  ├─ ProviderReference
  ├─ QueueItem
  └─ PlayerEvent
          │
          ▼
Tourify Backend APIs / Server Actions
  ├─ search provider catalog
  ├─ import/link track
  ├─ fetch normalized metadata
  ├─ resolve playable source
  └─ record analytics
          │
          ▼
Music Provider Registry
  ├─ TourifyNativeProvider
  ├─ AudiusProvider
  └─ future providers
          │
          ▼
Audius API / discovery nodes
```

## Core domain contracts

```ts
export type MusicProviderId = 'tourify' | 'audius';

export interface ProviderTrackReference {
  provider: MusicProviderId;
  externalTrackId: string;
  externalArtistId?: string | null;
  canonicalUrl?: string | null;
}

export interface NormalizedTrack {
  id: string;
  title: string;
  artistName: string;
  artistId?: string | null;
  artworkUrl?: string | null;
  durationMs?: number | null;
  provider: MusicProviderId;
  providerTrackId?: string | null;
  attribution?: string | null;
  availability: 'available' | 'unavailable' | 'unknown';
}

export interface PlaybackDescriptor {
  track: NormalizedTrack;
  sourceType: 'direct_url' | 'hls' | 'provider_proxy';
  sourceUrl: string;
  expiresAt?: string | null;
  headers?: Record<string, string>;
}
```

The audit must adapt names and locations to the existing codebase. Do not introduce duplicate types if compatible types already exist.

## Provider registry

Use a registry or factory keyed by provider ID. Business logic calls a common interface.

```ts
export interface MusicProviderAdapter {
  id: MusicProviderId;
  searchTracks(input: SearchTracksInput): Promise<ProviderSearchResult>;
  getTrack(externalTrackId: string): Promise<ProviderTrack>;
  resolvePlayback(externalTrackId: string): Promise<ProviderPlaybackResult>;
  getArtist?(externalArtistId: string): Promise<ProviderArtist>;
  healthCheck(): Promise<ProviderHealth>;
}
```

## Runtime boundaries

- Provider API calls should run on the server.
- Browser code should not contain privileged provider configuration.
- Temporary stream URLs should be returned only when required for playback and should not be persisted.
- Metadata responses may be cached for a bounded duration.
- Playback resolution should use short caching or no caching depending on provider behavior.

## Suggested module boundaries

The agent must map these to actual repository conventions after audit.

```text
app/
  api/music/providers/audius/search/route.ts
  api/music/providers/audius/tracks/[trackId]/route.ts
  api/music/playback/resolve/route.ts
  api/music/import/route.ts
  api/music/events/route.ts
components/
  music/
  player/
lib/
  music/
    contracts.ts
    provider-registry.ts
    normalize-track.ts
    playback-policy.ts
    providers/
      audius/
        audius-client.ts
        audius-adapter.ts
        audius-mappers.ts
        audius-errors.ts
stores/ or contexts/
  player-store.ts
supabase/migrations/
```

## Data flow: search and attach

1. User opens Audius search/import UI.
2. Tourify calls a server endpoint.
3. Endpoint validates input, checks feature access, invokes `AudiusProvider.searchTracks`.
4. Adapter maps Audius data to normalized results.
5. User selects a result.
6. Import/link API upserts an additive provider reference and creates or links the canonical Tourify track record.
7. UI receives the Tourify canonical track ID.

## Data flow: playback

1. UI queues a canonical Tourify track.
2. Global player requests a playback descriptor using the canonical track ID.
3. Backend loads provider reference and permissions.
4. Provider registry selects Audius or native adapter.
5. Adapter resolves a playable source.
6. Player begins loading and emits analytics.
7. Errors are normalized and surfaced with retry/fallback actions.

## Resilience

- Timeouts and abort signals on provider calls.
- Limited retry with jitter for safe GET operations.
- Circuit-breaker or health state if repeated provider failures occur.
- No automatic retry loop for playback that duplicates analytics.
- Clear unavailable state for deleted, private, or regionally restricted tracks.
- Existing native playback remains independent from Audius health.

## Architectural acceptance criteria

- No UI component requires raw Audius payloads.
- Existing tracks can be represented without Audius fields.
- Provider selection is centralized.
- Temporary playback URLs are not stored in Supabase.
- Audius can be disabled through configuration without code removal.
- Future providers can implement the same interface.
