import type {
  MediaResolution,
  MediaResolverContext,
  WorldMediaKind,
  WorldMediaResolveRequest,
} from "../types"
import type { MediaResolver } from "../registry"
import { capabilitiesFor } from "../capabilities"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

const APPROVED_ASSET_RIGHTS = new Set([
  "owned",
  "public_domain",
  "cc_licensed",
  "partner",
  "licensed",
])

/**
 * World-media resolver for sound_guide / archive_audio / narration (plan
 * section 6). Published + rights-approved assets only; the private source
 * record is read through the privileged client and never returned wholesale.
 */
export function createWorldMediaResolver(kind: WorldMediaKind): MediaResolver<typeof kind> {
  return {
    kind,
    async resolve(
      request: WorldMediaResolveRequest,
      ctx: MediaResolverContext
    ): Promise<MediaResolution> {
      const { resolveWorldPlaybackFlags } = await import("../flags")
      const flags = await resolveWorldPlaybackFlags(ctx.supabase)
      if (!flags.world_music_enabled) {
        throw new TourifyMusicError("FEATURE_DISABLED", "World media playback is not enabled.", false)
      }

      const { data: asset, error: assetError } = await ctx.supabase
        .from("world_media_assets")
        .select("id, slug, title, creator_name, attribution_text, provider, media_kind, rights_status, review_status, publication_status, duration_ms")
        .eq("id", request.mediaAssetId)
        .single()

      if (assetError || !asset) {
        throw new TourifyMusicError("TRACK_NOT_FOUND", "Media asset not found.", false)
      }
      if (asset.media_kind !== kind) {
        throw new TourifyMusicError("INVALID_REQUEST", "Asset does not match requested media kind.", false)
      }
      if (asset.publication_status !== "published") {
        throw new TourifyMusicError("TRACK_UNAVAILABLE", "Media asset is not published.", false)
      }
      if (asset.review_status !== "verified") {
        throw new TourifyMusicError("TRACK_UNAVAILABLE", "Media asset has not passed editorial review.", false)
      }
      if (!APPROVED_ASSET_RIGHTS.has(String(asset.rights_status))) {
        throw new TourifyMusicError("FORBIDDEN", "Media asset rights do not permit playback.", false)
      }

      // Private source/storage record — trusted client only.
      const { data: sources } = await ctx.trustedSupabase
        .from("world_media_sources")
        .select("id, source_type, storage_bucket, storage_path, external_url, resolver_reference, health_status, availability_status, territory_rules")
        .eq("media_asset_id", request.mediaAssetId)

      const eligible = (sources ?? []).filter(
        (s: Record<string, unknown>) =>
          s.availability_status === "available" &&
          (s.health_status === "healthy" || s.health_status === "degraded") &&
          Object.keys((s.territory_rules ?? {}) as Record<string, unknown>).length === 0
      )
      if (!eligible || eligible.length === 0) {
        throw new TourifyMusicError("TRACK_UNAVAILABLE", "No approved playable source for this asset.", false)
      }
      const preferred = eligible[0]

      let sourceType: MediaResolution["sourceType"]
      let sourceUrl: string
      if (preferred.source_type === "storage") {
        // Rights-aware storage proxy mirrors native track streaming behavior.
        sourceType = "provider_proxy"
        sourceUrl = `/api/music/stream?worldMediaAssetId=${encodeURIComponent(request.mediaAssetId)}`
      } else if (preferred.source_type === "provider_proxy") {
        sourceType = "provider_proxy"
        sourceUrl = String(preferred.resolver_reference ?? "")
      } else if (preferred.source_type === "direct_url") {
        sourceType = "direct_url"
        sourceUrl = String(preferred.external_url ?? "")
      } else {
        sourceType = "external_redirect"
        sourceUrl = String(preferred.external_url ?? preferred.resolver_reference ?? "")
      }

      return {
        identity: {
          id: `${kind}:${String(asset.id)}`,
          kind,
          title: String(asset.title),
          creatorName: asset.creator_name ?? null,
          mediaAssetId: String(asset.id),
          provider: asset.provider ?? null,
          attribution:
            asset.attribution_text ??
            (asset.rights_status === "public_domain" ? "Public domain recording." : null),
          metadata: { slug: asset.slug, durationMs: asset.duration_ms ?? null },
        },
        sourceType,
        sourceUrl,
        expiresAt: null,
        capabilities: capabilitiesFor(kind),
        playbackSessionId: request.playbackSessionId ?? null,
      }
    },
  }
}

export const soundGuideResolver = createWorldMediaResolver("sound_guide")
export const archiveAudioResolver = createWorldMediaResolver("archive_audio")
export const narrationResolver = createWorldMediaResolver("narration")
