import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"
import type { MediaResolution, MediaResolverContext, TrackResolveRequest } from "../types"
import type { MediaResolver } from "../registry"
import { capabilitiesFor } from "../capabilities"

/**
 * Track resolver — delegates to the existing track/provider architecture and
 * preserves the exact response contract of /api/music/playback/resolve
 * (plan section 6, test-matrix items 1–3). No behavior change for tracks.
 */
export const trackResolver: MediaResolver<"track"> = {
  kind: "track",
  async resolve(
    request: TrackResolveRequest,
    ctx: MediaResolverContext
  ): Promise<MediaResolution> {
    const trackId = request.trackId

    const { data: track, error: trackError } = await ctx.supabase
      .from("artist_music")
      .select("id, user_id, metadata, is_public, is_visible, moderation_status, rights_confirmed, access_mode")
      .eq("id", trackId)
      .single()

    if (trackError || !track) {
      throw new TourifyMusicError("TRACK_NOT_FOUND", "Track not found.", false)
    }

    const provider = ((track.metadata as Record<string, unknown>) ?? {})?.provider as string | undefined

    if (provider === "audius") {
      if (!isAudiusEnabled()) {
        throw new TourifyMusicError("FEATURE_DISABLED", "Audius integration is not enabled.", false)
      }
      const { data: ref } = await ctx.supabase
        .from("music_provider_references")
        .select("external_track_id")
        .eq("track_id", trackId)
        .eq("provider", "audius")
        .maybeSingle()

      const externalTrackId =
        (ref?.external_track_id as string | undefined) ||
        (((track.metadata as Record<string, unknown>) ?? {})?.provider_track_id as string | undefined)

      if (!externalTrackId) {
        throw new TourifyMusicError("TRACK_NOT_FOUND", "No Audius track reference found.", false)
      }

      // Existing adapter contract: descriptor.sourceUrl must never be logged.
      const descriptor = await audiusAdapter.resolvePlayback(externalTrackId, trackId)
      return {
        identity: {
          id: `track:${trackId}`,
          kind: "track",
          title: "",
          canonicalTrackId: trackId,
          provider: "audius",
        },
        sourceType: descriptor.sourceType,
        sourceUrl: descriptor.sourceUrl,
        expiresAt: descriptor.expiresAt ?? null,
        capabilities: capabilitiesFor("track"),
        playbackSessionId: request.playbackSessionId ?? null,
      }
    }

    // Native Tourify track — stream endpoint handles access control + signing.
    return {
      identity: {
        id: `track:${trackId}`,
        kind: "track",
        title: "",
        canonicalTrackId: trackId,
        provider: "tourify",
      },
      sourceType: "provider_proxy",
      sourceUrl: `/api/music/stream?trackId=${encodeURIComponent(trackId)}`,
      expiresAt: null,
      capabilities: capabilitiesFor("track"),
      playbackSessionId: request.playbackSessionId ?? null,
    }
  },
}
