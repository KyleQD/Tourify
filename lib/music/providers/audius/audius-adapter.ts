/**
 * lib/music/providers/audius/audius-adapter.ts
 *
 * Implements MusicProviderAdapter for the Audius provider.
 * This is the ONLY place in Tourify that calls the Audius API.
 * All other code uses the provider registry or normalised domain types.
 *
 * Server-only — never import in client bundles.
 */

import type {
  MusicProviderAdapter,
  NormalizedTrack,
  PlaybackDescriptor,
  ProviderHealth,
  ProviderSearchResult,
  SearchTracksInput,
} from "../contracts"
import { TourifyMusicError } from "../contracts"
import { registerProvider } from "../registry"
import { isAudiusEnabled, getAudiusConfig } from "./audius-config"
import { audiusGet, resolveAudiusStreamUrl } from "./audius-client"
import { audiusSchemaError } from "./audius-errors"
import { checkAudiusHealth } from "./audius-health"
import { mapAudiusTrackToNormalized } from "./audius-mappers"
import {
  AudiusSearchResponseSchema,
  AudiusSingleTrackResponseSchema,
  AudiusTrendingResponseSchema,
} from "./audius-schemas"

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

class AudiusProviderAdapter implements MusicProviderAdapter {
  readonly id = "audius" as const

  private assertEnabled(): void {
    if (!isAudiusEnabled()) {
      throw new TourifyMusicError(
        "FEATURE_DISABLED",
        "Audius integration is currently disabled.",
        false
      )
    }
  }

  async getTrending(time: "week" | "month" | "allTime" = "week"): Promise<NormalizedTrack[]> {
    this.assertEnabled()
    const config = getAudiusConfig()

    const raw = await audiusGet("/v1/tracks/trending", { time }, { config })
    const parsed = AudiusTrendingResponseSchema.safeParse(raw)

    if (!parsed.success) {
      throw audiusSchemaError(parsed.error)
    }

    return (parsed.data.data ?? []).slice(0, 20).map((t) => mapAudiusTrackToNormalized(t))
  }

  async searchTracks(input: SearchTracksInput): Promise<ProviderSearchResult> {
    this.assertEnabled()
    const config = getAudiusConfig()

    const params: Record<string, string | number> = {
      query: input.query,
      limit: Math.min(input.limit ?? 20, 50),
    }

    const raw = await audiusGet("/v1/tracks/search", params, { config })
    const parsed = AudiusSearchResponseSchema.safeParse(raw)

    if (!parsed.success) {
      throw audiusSchemaError(parsed.error)
    }

    const tracks = (parsed.data.data ?? []).map((t) =>
      mapAudiusTrackToNormalized(t)
    )

    return { tracks }
  }

  async getTrack(externalTrackId: string): Promise<NormalizedTrack> {
    this.assertEnabled()
    const config = getAudiusConfig()

    const raw = await audiusGet(`/v1/tracks/${encodeURIComponent(externalTrackId)}`, {}, { config })
    const parsed = AudiusSingleTrackResponseSchema.safeParse(raw)

    if (!parsed.success || !parsed.data.data) {
      throw audiusSchemaError(parsed.success ? undefined : parsed.error)
    }

    return mapAudiusTrackToNormalized(parsed.data.data)
  }

  async resolvePlayback(
    externalTrackId: string,
    canonicalTrackId: string
  ): Promise<PlaybackDescriptor> {
    this.assertEnabled()
    const config = getAudiusConfig()

    // Fetch current metadata first (validates track still exists and is streamable)
    const raw = await audiusGet(`/v1/tracks/${encodeURIComponent(externalTrackId)}`, {}, { config })
    const parsed = AudiusSingleTrackResponseSchema.safeParse(raw)

    if (!parsed.success || !parsed.data.data) {
      throw audiusSchemaError(parsed.success ? undefined : parsed.error)
    }

    const track = parsed.data.data

    const normalizedTrack = mapAudiusTrackToNormalized(track, canonicalTrackId)

    if (normalizedTrack.availability === "unavailable") {
      throw new TourifyMusicError(
        "TRACK_UNAVAILABLE",
        "This Audius track is no longer available.",
        false
      )
    }

    // Resolve the temporary stream URL — never logged, never persisted
    const streamUrl = await resolveAudiusStreamUrl(externalTrackId, { config })

    // Expiry: Audius stream URLs typically expire in ~24h but we treat as short-lived
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    return {
      track: normalizedTrack,
      sourceType: "direct_url",
      sourceUrl: streamUrl,
      expiresAt,
    }
  }

  async getArtist(externalArtistId: string) {
    this.assertEnabled()
    const config = getAudiusConfig()

    const raw = await audiusGet(`/v1/users/${encodeURIComponent(externalArtistId)}`, {}, { config })
    const parsed = (raw as { data?: { id?: string; name?: string; handle?: string; profile_picture?: Record<string, string> | null } })?.data

    return {
      id: parsed?.id ?? externalArtistId,
      name: parsed?.name || parsed?.handle || "Unknown Artist",
      artworkUrl: parsed?.profile_picture?.["480x480"] || parsed?.profile_picture?.["150x150"] || null,
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!isAudiusEnabled()) {
      return {
        provider: "audius",
        status: "unavailable",
        checkedAt: new Date().toISOString(),
      }
    }
    return checkAudiusHealth()
  }
}

// ---------------------------------------------------------------------------
// Registration
// Only register when AUDIUS_ENABLED=true, so the registry stays clean at runtime
// when the feature is off.
// ---------------------------------------------------------------------------

export const audiusAdapter = new AudiusProviderAdapter()

if (isAudiusEnabled()) {
  registerProvider(audiusAdapter)
}
