/**
 * app/api/music/playback/resolve/route.ts
 *
 * POST /api/music/playback/resolve
 *
 * Resolves a PlaybackDescriptor for a canonical Tourify track.
 * For Audius tracks: calls the adapter to get a temporary stream URL.
 * For native tracks: returns the stream path for the client to use directly.
 *
 * SECURITY: The resolved stream URL is returned with Cache-Control: private, no-store.
 * It is never logged or persisted.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, readJson, requireApiUser } from "@/lib/api/route-helpers"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

export const dynamic = "force-dynamic"

const resolveLimiter = createRateLimiter({
  namespace: "music:playback:resolve",
  limit: 60,
  windowSec: 60,
})

const ResolveBodySchema = z.object({
  trackId: z.string().uuid(),
  playbackSessionId: z.string().uuid().optional().nullable(),
  sourceSurface: z.string().max(100).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const bodyResult = await readJson(request, ResolveBodySchema)
  if (!bodyResult.success) return bodyResult.response
  const { trackId, playbackSessionId, sourceSurface } = bodyResult.data

  // Rate limit by user ID
  const rl = await resolveLimiter.check(user.id)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many playback requests. Please slow down.", retryable: true })
  }

  try {
    // Load the canonical track and its provider reference
    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, user_id, metadata, is_public, is_visible, moderation_status, rights_confirmed, access_mode")
      .eq("id", trackId)
      .single()

    if (trackError || !track) {
      return jsonError({ status: 404, code: "TRACK_NOT_FOUND", message: "Track not found.", retryable: false })
    }

    // Determine provider from metadata
    const provider = (track.metadata as Record<string, unknown>)?.provider as string | undefined

    if (provider === "audius") {
      if (!isAudiusEnabled()) {
        return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
      }

      // Look up the Audius external track ID from provider references
      const { data: ref } = await supabase
        .from("music_provider_references")
        .select("external_track_id")
        .eq("track_id", trackId)
        .eq("provider", "audius")
        .maybeSingle()

      const externalTrackId = (ref?.external_track_id as string | undefined)
        || ((track.metadata as Record<string, unknown>)?.provider_track_id as string | undefined)

      if (!externalTrackId) {
        return jsonError({ status: 404, code: "TRACK_NOT_FOUND", message: "No Audius track reference found.", retryable: false })
      }

      const descriptor = await audiusAdapter.resolvePlayback(externalTrackId, trackId)

      // SECURITY: never log descriptor.sourceUrl
      const response = NextResponse.json({
        data: {
          trackId,
          sourceType: descriptor.sourceType,
          sourceUrl: descriptor.sourceUrl,
          expiresAt: descriptor.expiresAt,
          provider: "audius",
          playbackSessionId: playbackSessionId ?? null,
        },
        error: null,
      })
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }

    // Native Tourify track — redirect client to stream endpoint
    // The stream endpoint handles access control and Supabase Storage signing.
    const response = NextResponse.json({
      data: {
        trackId,
        sourceType: "provider_proxy",
        sourceUrl: `/api/music/stream?trackId=${encodeURIComponent(trackId)}`,
        expiresAt: null,
        provider: "tourify",
        playbackSessionId: playbackSessionId ?? null,
      },
      error: null,
    })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "TRACK_NOT_FOUND" ? 404
        : err.code === "TRACK_UNAVAILABLE" ? 410
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : err.code === "PLAYBACK_RESOLUTION_FAILED" ? 502
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[playback resolve] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
