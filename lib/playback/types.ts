/**
 * lib/playback/types.ts
 *
 * Generic playable-media contracts (PLAYER_PROVIDER_CONTRACT_RFC_V0_2 /
 * PLAYBACK_RESOLVER_IMPLEMENTATION_PLAN_V0_1). Additive above the track
 * provider architecture; MusicProviderAdapter is untouched.
 */

export type PlayableMediaKind =
  | "track"
  | "radio_stream"
  | "sound_guide"
  | "archive_audio"
  | "narration"

export interface PlayableMediaIdentity {
  id: string
  kind: PlayableMediaKind
  title: string
  creatorName?: string | null
  artworkUrl?: string | null
  canonicalTrackId?: string | null
  stationId?: string | null
  mediaAssetId?: string | null
  provider?: string | null
  attribution?: string | null
  metadata?: Record<string, unknown>
}

/** Legacy request shape. Absent `kind` means `track`. */
export interface TrackResolveRequest {
  kind?: "track"
  trackId: string
  playbackSessionId?: string | null
  sourceSurface?: string | null
}

export interface RadioResolveRequest {
  kind: "radio_stream"
  stationId: string
  playbackSessionId?: string | null
  sourceSurface?: string | null
}

export type WorldMediaKind = "sound_guide" | "archive_audio" | "narration"

export interface WorldMediaResolveRequest {
  kind: WorldMediaKind
  mediaAssetId: string
  playbackSessionId?: string | null
  sourceSurface?: string | null
}

export type MediaResolveRequest =
  | TrackResolveRequest
  | RadioResolveRequest
  | WorldMediaResolveRequest

export interface MediaCapabilities {
  seek: boolean
  queue: boolean
  repeat: boolean
  shuffle: boolean
  musicLibrary: boolean
  nowPlaying: "track" | "station_metadata" | "static"
  live: boolean
}

export interface MediaResolution {
  identity: PlayableMediaIdentity
  /** Transient playable instruction. Never persisted, never logged. */
  sourceType: "direct_url" | "hls" | "provider_proxy" | "live_url" | "external_redirect"
  sourceUrl: string
  expiresAt?: string | null
  capabilities: MediaCapabilities
  playbackSessionId?: string | null
}

export interface MediaResolverContext {
  /** Authenticated server client for public reads. */
  supabase: any
  /**
   * Privileged server client for private operational records
   * (world_radio_streams / world_media_sources). Never exposed to clients.
   */
  trustedSupabase: any
  userId: string
}
