# 05 — Technical Architecture

## Objective

Implement the redesign without duplicating or destabilizing the existing music ecosystem.

## Architecture principles

1. Reuse the existing global player.
2. Reuse or extend the existing normalized music model.
3. Isolate provider-specific logic behind adapters.
4. Separate server data fetching from client playback state.
5. Keep page sections independently recoverable.
6. Use route- or section-level loading boundaries.
7. Preserve playback across navigation.
8. Use additive migrations only.

## Normalized track model

If no existing equivalent exists, define a normalized model similar to:

```ts
export type MusicProvider = "tourify" | "audius";

export type NormalizedMusicTrack = {
  id: string;
  provider: MusicProvider;
  providerTrackId?: string;
  title: string;
  artistName: string;
  artistId?: string;
  artistSlug?: string;
  artworkUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  albumTitle?: string;
  releaseId?: string;
  genre?: string;
  isExplicit?: boolean;
  isPlayable: boolean;
  sourceUrl?: string;
  attribution?: {
    label?: string;
    href?: string;
  };
};
```

Do not introduce this if the codebase already has an equivalent type. Extend the existing type instead.

## Provider adapter interface

When compatible with the existing codebase:

```ts
export interface MusicProviderAdapter {
  provider: MusicProvider;
  normalizeTrack(input: unknown): NormalizedMusicTrack;
  searchTracks(query: string, options?: SearchOptions): Promise<SearchResult>;
  getTrendingTracks(options?: TrendingOptions): Promise<NormalizedMusicTrack[]>;
  resolvePlayback(track: NormalizedMusicTrack): Promise<PlaybackSource>;
  getArtwork(track: NormalizedMusicTrack): string | undefined;
}
```

## Data-fetching boundaries

Prefer:

- Server-side initial data where appropriate
- Client-side queries for interactive provider searches
- Cached provider responses
- Independent section fetches
- Abortable search requests
- No duplicate fetches caused by tab switching

## Error isolation

Each major section should have its own:

- loading state,
- error state,
- retry action,
- empty state.

Audius failure must not break native library or playlists.

## Persistence

Audit and preserve:

- Saved-track persistence
- Playlist persistence
- Listening-history persistence
- Player state persistence
- Queue persistence
- Search state
- Library filters
- Volume preference

## Analytics and telemetry

Use existing analytics infrastructure.

Track events only when approved by current conventions, such as:

- music_track_play
- music_track_pause
- music_track_complete
- music_track_save
- music_track_unsave
- playlist_create
- playlist_add_track
- playlist_remove_track
- music_search
- provider_error

Do not log sensitive tokens, audio URLs with private signatures, or personal data.

## Security

- Enforce ownership server-side.
- Do not rely only on hidden UI controls.
- Validate provider IDs.
- Sanitize user-entered playlist content.
- Validate artwork and audio URLs.
- Follow existing Supabase RLS patterns.
- Prevent cross-account playlist modification.
- Use signed URLs where required.
- Never expose private storage paths.

## Technical architecture completion gate

The architecture is ready when:

- Existing player and data architecture are documented.
- Provider normalization is defined.
- Duplicate models are avoided.
- Error boundaries are planned.
- Server-side permission enforcement is identified.
- Any required migrations are additive and reversible.
