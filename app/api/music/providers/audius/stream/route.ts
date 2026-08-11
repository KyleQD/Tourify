/**
 * app/api/music/providers/audius/stream/route.ts
 *
 * POST /api/music/providers/audius/stream
 *
 * Resolves a temporary stream URL for an Audius track by its external track ID.
 * Used for playing tracks directly from Audius (e.g. trending) before they have
 * been imported into artist_music.
 *
 * SECURITY: Stream URL returned with Cache-Control: private, no-store.
 * Never logged or persisted.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, readJson } from "@/lib/api/route-helpers"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

export const dynamic = "force-dynamic"

const streamLimiter = createRateLimiter({
  namespace: "audius:stream",
  limit: 60,
  windowSec: 60,
})

const StreamBodySchema = z.object({
  externalTrackId: z.string().min(1).max(200),
  playbackSessionId: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  if (!isAudiusEnabled()) {
    return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
  }

  // Rate limit by IP (unauthenticated browse-and-play)
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown"
  const rl = await streamLimiter.check(ip)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many playback requests. Please slow down.", retryable: true })
  }

  const bodyResult = await readJson(request, StreamBodySchema)
  if (!bodyResult.success) return bodyResult.response
  const { externalTrackId, playbackSessionId } = bodyResult.data

  try {
    const descriptor = await audiusAdapter.resolvePlayback(externalTrackId, externalTrackId)

    const response = NextResponse.json({
      data: {
        externalTrackId,
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
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "TRACK_NOT_FOUND" ? 404
        : err.code === "TRACK_UNAVAILABLE" ? 410
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[audius stream] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
