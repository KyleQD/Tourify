/**
 * lib/music/providers/audius/audius-mappers.ts
 *
 * Maps Audius API response objects to Tourify NormalizedTrack.
 * No temporary stream URLs pass through here.
 */

import type { NormalizedTrack } from "../contracts"
import type { AudiusTrack } from "./audius-schemas"

/**
 * Pick the best available artwork URL from an Audius artwork object.
 * Prefers 480x480, then 1000x1000, then 150x150.
 */
function resolveArtworkUrl(artwork: AudiusTrack["artwork"]): string | null {
  if (!artwork) return null
  return artwork["480x480"] || artwork["1000x1000"] || artwork["150x150"] || null
}

/**
 * Build the canonical Audius permalink for attribution.
 * Falls back to a constructed URL if permalink is missing.
 */
function resolveCanonicalUrl(track: AudiusTrack): string | null {
  if (track.permalink) return track.permalink
  const handle = track.user?.handle
  if (handle && track.id) {
    return `https://audius.co/${handle}/${track.id}`
  }
  return null
}

/**
 * Determine track availability from Audius response flags.
 */
function resolveAvailability(
  track: AudiusTrack
): NormalizedTrack["availability"] {
  if (track.is_delete === true) return "unavailable"
  if (track.is_unlisted === true) return "unavailable"
  if (track.is_streamable === false) return "unavailable"
  if (track.is_streamable === true) return "available"
  // If is_streamable is absent, assume available (public tracks are streamable by default)
  return "available"
}

/**
 * Map an Audius track to a Tourify NormalizedTrack.
 *
 * The `id` field will be populated by the caller once the canonical
 * artist_music record is created or looked up.
 * Set to empty string here; always override before returning to clients.
 */
export function mapAudiusTrackToNormalized(
  track: AudiusTrack,
  canonicalId = ""
): NormalizedTrack {
  return {
    id: canonicalId,
    title: track.title || "Untitled",
    artistName: track.user?.name || track.user?.handle || "Unknown Artist",
    artistId: track.user?.id || null,
    artworkUrl: resolveArtworkUrl(track.artwork),
    durationMs: track.duration != null ? track.duration * 1000 : null,
    provider: "audius",
    providerTrackId: track.id,
    attribution: "via Audius",
    availability: resolveAvailability(track),
  }
}

/**
 * Build the metadata JSON snapshot stored in music_provider_references.
 * Never include stream URLs.
 */
export function buildAudiusMetadataSnapshot(track: AudiusTrack): Record<string, unknown> {
  return {
    title: track.title,
    artist_name: track.user?.name || track.user?.handle || null,
    artist_handle: track.user?.handle || null,
    external_artist_id: track.user?.id || null,
    artwork_url: resolveArtworkUrl(track.artwork),
    duration_ms: track.duration != null ? track.duration * 1000 : null,
    genre: track.genre || null,
    canonical_url: resolveCanonicalUrl(track),
    availability: resolveAvailability(track),
    synced_at: new Date().toISOString(),
  }
}
