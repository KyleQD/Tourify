/**
 * lib/music/providers/native-adapter.ts
 *
 * Wraps the existing Tourify-native playback path behind the MusicProviderAdapter
 * interface so that native tracks can flow through provider-agnostic code.
 *
 * The native adapter is registered unconditionally — it is always available.
 * It does not expose any Audius-specific concerns.
 */

import type {
  MusicProviderAdapter,
  NormalizedTrack,
  PlaybackDescriptor,
  ProviderHealth,
  ProviderSearchResult,
  SearchTracksInput,
} from "./contracts"
import { TourifyMusicError } from "./contracts"
import { registerProvider } from "./registry"

export class TourifyNativeAdapter implements MusicProviderAdapter {
  readonly id = "tourify" as const

  /**
   * Search is not implemented for the native provider at this layer.
   * Native track discovery goes through artist-specific API routes.
   */
  async searchTracks(_input: SearchTracksInput): Promise<ProviderSearchResult> {
    throw new TourifyMusicError(
      "FEATURE_DISABLED",
      "Full-catalog search is not available for the native Tourify provider through this interface.",
      false
    )
  }

  /**
   * Native tracks use the canonical Tourify track ID. The adapter normalizes
   * the shape to NormalizedTrack so that mixed-provider code works uniformly.
   */
  async getTrack(externalTrackId: string): Promise<NormalizedTrack> {
    // The native provider's external ID is the same as the canonical Tourify ID.
    return {
      id: externalTrackId,
      title: "",
      artistName: "",
      provider: "tourify",
      providerTrackId: externalTrackId,
      availability: "unknown",
    }
  }

  /**
   * Playback resolution for native tracks defers to the stream API.
   * The caller should use /api/music/stream directly for native tracks
   * rather than this method — this stub is here for interface completeness.
   */
  async resolvePlayback(externalTrackId: string, canonicalTrackId: string): Promise<PlaybackDescriptor> {
    return {
      track: {
        id: canonicalTrackId,
        title: "",
        artistName: "",
        provider: "tourify",
        providerTrackId: externalTrackId,
        availability: "unknown",
      },
      sourceType: "provider_proxy",
      // The actual signed URL is resolved by /api/music/stream on the server.
      // The JukeboxContext routes native tracks there directly, not through this adapter.
      sourceUrl: `/api/music/stream?trackId=${encodeURIComponent(canonicalTrackId)}`,
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: "tourify",
      status: "healthy",
      checkedAt: new Date().toISOString(),
    }
  }
}

// Register the native adapter unconditionally.
export const nativeAdapter = new TourifyNativeAdapter()
registerProvider(nativeAdapter)
