/**
 * app/api/music/providers/audius/trending/route.ts
 *
 * GET /api/music/providers/audius/trending?time=week
 *
 * Returns the top 20 trending tracks from Audius for the given time range.
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

const trendingLimiter = createRateLimiter({
  namespace: "audius:trending",
  limit: 30,
  windowSec: 60,
})

const VALID_TIME_RANGES = ["week", "month", "allTime"] as const
type TimeRange = (typeof VALID_TIME_RANGES)[number]

export async function GET(request: NextRequest) {
  if (!isAudiusEnabled()) {
    return jsonError({ status: 403, code: "FEATURE_DISABLED", message: "Audius integration is not enabled.", retryable: false })
  }

  const { searchParams } = request.nextUrl
  const timeParam = searchParams.get("time") ?? "week"
  const time: TimeRange = (VALID_TIME_RANGES as readonly string[]).includes(timeParam)
    ? (timeParam as TimeRange)
    : "week"

  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown"
  const rl = await trendingLimiter.check(ip)
  if (!rl.success) {
    return jsonError({ status: 429, code: "PROVIDER_RATE_LIMITED", message: "Too many requests. Please slow down.", retryable: true })
  }

  // Resolve optional authenticated user for analytics
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const tracks = await audiusAdapter.getTrending(time)

    // Fire-and-forget analytics event
    void Promise.resolve(
      supabase.from("music_engagement_events").insert({
        music_id: "00000000-0000-0000-0000-000000000000",
        artist_user_id: null,
        actor_user_id: user?.id ?? null,
        event_type: "play",
        source: "api_audius_trending",
        metadata: {
          event_label: "music_provider_trending_fetched",
          provider: "audius",
          time_range: time,
          result_count: tracks.length,
        },
      })
    ).catch(() => {})

    return NextResponse.json({
      data: tracks,
      meta: { time, total: tracks.length },
      error: null,
    })
  } catch (err) {
    if (err instanceof TourifyMusicError) {
      const status = err.code === "FEATURE_DISABLED" ? 403
        : err.code === "PROVIDER_TIMEOUT" ? 504
        : 502
      return jsonError({ status, code: err.code, message: err.message, retryable: err.retryable })
    }
    console.error("[audius trending] unexpected error", err)
    return jsonError({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred.", retryable: true })
  }
}
