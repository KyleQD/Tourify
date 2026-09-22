/**
 * app/api/music/providers/audius/tracks/[trackId]/route.ts
 *
 * GET /api/music/providers/audius/tracks/:trackId
 *
 * Returns normalized metadata + attribution for a single Audius track.
 * Does not return stream URLs.
 */

import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  if (!isAudiusEnabled()) {
    return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
  }

  const { trackId } = await params

  if (!trackId?.trim()) {
    return jsonError({ status: 400, code: "INVALID_REQUEST", message: "trackId is required.", retryable: false })
  }

  try {
    const track = await audiusAdapter.getTrack(trackId)
    return NextResponse.json({ data: track, error: null })
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "TRACK_NOT_FOUND" ? 404
        : err.code === "TRACK_UNAVAILABLE" ? 410
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[audius track metadata] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
