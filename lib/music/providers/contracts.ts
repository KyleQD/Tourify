/**
 * lib/music/providers/contracts.ts
 *
 * Provider-neutral domain contracts for the Tourify music provider layer.
 * All generic player and UI code must depend only on these types — never on
 * provider-specific response shapes.
 */

// ─────────────────────────────────────────────
// Provider identity
// ─────────────────────────────────────────────

export type MusicProviderId = "tourify" | "audius"

// ─────────────────────────────────────────────
// Core domain types
// ─────────────────────────────────────────────

export interface ProviderTrackReference {
  provider: MusicProviderId
  externalTrackId: string
  externalArtistId?: string | null
  canonicalUrl?: string | null
}

export interface NormalizedTrack {
  /** Tourify canonical track ID (artist_music.id) */
  id: string
  title: string
  artistName: string
  artistId?: string | null
  artworkUrl?: string | null
  /** Duration in milliseconds */
  durationMs?: number | null
  provider: MusicProviderId
  /** External provider track ID (e.g. Audius track id) */
  providerTrackId?: string | null
  /** Attribution text shown to users */
  attribution?: string | null
  availability: "available" | "unavailable" | "unknown"
}

export interface PlaybackDescriptor {
  track: NormalizedTrack
  sourceType: "direct_url" | "hls" | "provider_proxy"
  sourceUrl: string
  /** ISO 8601 expiry; browser should not cache beyond this */
  expiresAt?: string | null
  headers?: Record<string, string>
}

// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────

export interface SearchTracksInput {
  query: string
  limit?: number
  cursor?: string | null
}

export interface ProviderSearchResult {
  tracks: NormalizedTrack[]
  nextCursor?: string | null
}

// ─────────────────────────────────────────────
// Provider health
// ─────────────────────────────────────────────

export type ProviderHealthStatus = "healthy" | "degraded" | "unavailable"

export interface ProviderHealth {
  provider: MusicProviderId
  status: ProviderHealthStatus
  latencyMs?: number
  checkedAt: string
}

// ─────────────────────────────────────────────
// Stable Tourify error codes
// These are the only error codes that reach generic UI code.
// ─────────────────────────────────────────────

export type TourifyMusicErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "FEATURE_DISABLED"
  | "TRACK_NOT_FOUND"
  | "TRACK_UNAVAILABLE"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PLAYBACK_RESOLUTION_FAILED"
  | "IMPORT_CONFLICT"
  | "INTERNAL_ERROR"

export class TourifyMusicError extends Error {
  constructor(
    public readonly code: TourifyMusicErrorCode,
    message: string,
    public readonly retryable: boolean = false,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "TourifyMusicError"
  }
}

// ─────────────────────────────────────────────
// Provider adapter interface
// All providers implement this interface.
// ─────────────────────────────────────────────

export interface MusicProviderAdapter {
  readonly id: MusicProviderId
  searchTracks(input: SearchTracksInput): Promise<ProviderSearchResult>
  getTrack(externalTrackId: string): Promise<NormalizedTrack>
  resolvePlayback(externalTrackId: string, canonicalTrackId: string): Promise<PlaybackDescriptor>
  getArtist?(externalArtistId: string): Promise<{ id: string; name: string; artworkUrl?: string | null }>
  healthCheck(): Promise<ProviderHealth>
}
