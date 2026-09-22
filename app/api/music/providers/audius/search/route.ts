/**
 * app/api/music/providers/audius/search/route.ts
 *
 * GET /api/music/providers/audius/search?q=...&limit=...
 *
 * Proxies a search query to the Audius adapter and returns normalized track summaries.
 * Authentication optional. Feature-gated on AUDIUS_ENABLED.
 */

import { NextRequest, NextResponse } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import { createRateLimiter } from "@/lib/utils/rate-limit"
import { isAudiusEnabled } from "@/lib/music/providers/audius/audius-config"
import { audiusAdapter } from "@/lib/music/providers/audius/audius-adapter"
import { TourifyMusicError } from "@/lib/music/providers/contracts"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const searchLimiter = createRateLimiter({
  namespace: "audius:search",
  limit: 30,
  windowSec: 60,
})

export async function GET(request: NextRequest) {
  if (!isAudiusEnabled()) {
    return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
  }

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim() ?? ""
  const limitParam = Number(searchParams.get("limit") ?? "20")

  if (!q || q.length < 2) {
    return jsonError({ status: 400, code: "INVALID_REQUEST", message: "Query must be at least 2 characters.", retryable: false })
  }
  if (q.length > 200) {
    return jsonError({ status: 400, code: "INVALID_REQUEST", message: "Query must be 200 characters or fewer.", retryable: false })
  }
  const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 20), 50)

  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown"
  const rl = await searchLimiter.check(ip)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many search requests. Please slow down.", retryable: true })
  }

  // Resolve optional authenticated user for logging
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const result = await audiusAdapter.searchTracks({ query: q, limit })

    // Fire-and-forget search analytics event
    void Promise.resolve(
      supabase.from("music_engagement_events").insert({
        music_id: "00000000-0000-0000-0000-000000000000",
        artist_user_id: null,
        actor_user_id: user?.id ?? null,
        event_type: "play",
        source: "api_audius_search",
        metadata: {
          event_label: "music_provider_search_completed",
          provider: "audius",
          query_length: q.length,
          result_count: result.tracks.length,
        },
      })
    ).catch(() => {})

    return NextResponse.json({
      data: result.tracks,
      meta: { query: q, limit, total: result.tracks.length },
      error: null,
    })
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "PROVIDER_RATE_LIMITED" ? 429
        : err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[audius search] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
