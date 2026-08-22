import type {
  MediaResolution,
  MediaResolver,
  MediaResolverContext,
  RadioResolveRequest,
} from "../types"
import { capabilitiesFor } from "../capabilities"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

/**
 * Radio resolver (plan section 6). Reads public station identity plus PRIVATE
 * operational stream records through the privileged server client. Server-only
 * source records are never returned wholesale; only a playable instruction is
 * produced. Directory metadata never implies rebroadcast rights — the
 * rights/health gates below fail closed.
 */
export const radioStreamResolver: MediaResolver<"radio_stream"> = {
  kind: "radio_stream",
  async resolve(request: RadioResolveRequest, ctx: MediaResolverContext): Promise<MediaResolution> {
    // Gate: world_music_radio_enabled (Phase 1 flag, disabled by default).
    const { resolveWorldPlaybackFlags } = await import("../flags")
    const flags = await resolveWorldPlaybackFlags(ctx.supabase)
    if (!flags.world_music_radio_enabled) {
      throw new TourifyMusicError("FEATURE_DISABLED", "Radio playback is not enabled.", false)
    }

    const { data: station, error: stationError } = await ctx.supabase
      .from("world_radio_stations")
      .select("id, slug, name, homepage_url, playback_status, review_status, publication_status, rights_status, metadata")
      .eq("id", request.stationId)
      .single()

    if (stationError || !station) {
      throw new TourifyMusicError("TRACK_NOT_FOUND", "Radio station not found.", false)
    }
    if (station.publication_status !== "published") {
      throw new TourifyMusicError("TRACK_UNAVAILABLE", "Station is not published.", false)
    }
    if (station.review_status !== "verified") {
      throw new TourifyMusicError("TRACK_UNAVAILABLE", "Station has not passed editorial review.", false)
    }
    if (station.playback_status !== "playable") {
      throw new TourifyMusicError("TRACK_UNAVAILABLE", "Station playback is not permitted.", false)
    }

    // Private operational stream records — trusted client only.
    const { data: streams } = await ctx.trustedSupabase
      .from("world_radio_streams")
      .select("id, endpoint_kind, stream_url, resolver_reference, health_status, rights_class, availability_status, territory_rules")
      .eq("station_id", request.stationId)

    const eligible = (streams ?? []).filter(
      (s: Record<string, unknown>) =>
        s.availability_status === "available" &&
        (s.health_status === "healthy" || s.health_status === "degraded") &&
        (s.rights_class === "direct_stream_allowed" ||
          s.rights_class === "partner" ||
          s.rights_class === "licensed")
    )

    if (!eligible || eligible.length === 0) {
      throw new TourifyMusicError("TRACK_UNAVAILABLE", "No approved healthy stream for this station.", false)
    }
    if (eligible.length > 1) {
      // Deterministic preference: licensed > partner > direct_stream_allowed,
      // then by stream id for stability.
      const rank: Record<string, number> = { licensed: 0, partner: 1, direct_stream_allowed: 2 }
      eligible.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.id).localeCompare(String(b.id))
      )
      eligible.sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          (rank[String(a.rights_class)] ?? 9) - (rank[String(b.rights_class)] ?? 9)
      )
    }
    const preferred = eligible[0]

    const territory = (preferred.territory_rules ?? {}) as Record<string, unknown>
    if (Object.keys(territory).length > 0) {
      // v0.1 cannot evaluate per-user territory server-side without more
      // context; restricted records fail closed rather than guess.
      throw new TourifyMusicError("FORBIDDEN", "Station stream has unresolved territory restrictions.", false)
    }

    if (preferred.endpoint_kind === "provider_resolver") {
      throw new TourifyMusicError(
        "PLAYBACK_RESOLUTION_FAILED",
        "Provider-resolved radio streams require an additional reviewed integration.",
        false
      )
    }

    return {
      identity: {
        id: `radio:${String(station.id)}`,
        kind: "radio_stream",
        title: String(station.name),
        stationId: String(station.id),
        provider: null,
        attribution:
          rightsAttribution(station.rights_status) ??
          (station.homepage_url ? `Source: ${station.name} (${station.homepage_url})` : null),
        metadata: {
          slug: station.slug,
          nowPlayingSupported: Boolean((station.metadata as any)?.now_playing_supported),
        },
      },
      sourceType: preferred.endpoint_kind === "hls" ? "hls" : "live_url",
      sourceUrl: String(preferred.stream_url ?? ""),
      expiresAt: null,
      capabilities: capabilitiesFor("radio_stream"),
      playbackSessionId: request.playbackSessionId ?? null,
    }
  },
}

function rightsAttribution(rightsStatus: unknown): string | null {
  switch (rightsStatus) {
    case "partner":
      return "Partner station stream."
    case "licensed":
      return "Licensed station stream."
    case "embedding_allowed":
      return "Streamed by permission of the broadcaster."
    case "directory_listed":
      return "Directory-listed station; streaming by broadcaster permission."
    default:
      return null
  }
}
