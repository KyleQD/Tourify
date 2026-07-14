import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
}

function resolveRange(range: string | null) {
  const key = range && RANGE_DAYS[range] ? range : "30d"
  const days = RANGE_DAYS[key]
  const sinceDate = new Date()
  sinceDate.setUTCHours(0, 0, 0, 0)
  sinceDate.setUTCDate(sinceDate.getUTCDate() - (days - 1))
  return { key, days, since: sinceDate.toISOString() }
}

function dayKey(value: string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function buildEmptySeries(days: number) {
  const points: Array<{
    date: string
    plays: number
    previewPlays: number
    fullPlays: number
    completedPlays: number
    saves: number
    profileFeatures: number
    shares: number
    likes: number
    comments: number
    purchases: number
    downloads: number
    revenue: number
  }> = []

  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + offset)
    points.push({
      date: date.toISOString().slice(0, 10),
      plays: 0,
      previewPlays: 0,
      fullPlays: 0,
      completedPlays: 0,
      saves: 0,
      profileFeatures: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      purchases: 0,
      downloads: 0,
      revenue: 0,
    })
  }

  return points
}

function incrementEventBucket(point: Record<string, any>, eventType: string, accessLevel?: string | null) {
  if (eventType === "preview_play" || (eventType === "play_started" && accessLevel === "preview")) {
    point.previewPlays += 1
    point.plays += 1
  } else if (eventType === "full_play" || (eventType === "play_started" && accessLevel === "full")) {
    point.fullPlays += 1
    point.plays += 1
  } else if (eventType === "play_completed") {
    point.completedPlays += 1
  } else if (eventType === "library_add") {
    point.saves += 1
  } else if (eventType === "profile_feature") {
    point.profileFeatures += 1
  } else if (eventType === "share") {
    point.shares += 1
  } else if (eventType === "like") {
    point.likes += 1
  } else if (eventType === "comment") {
    point.comments += 1
  } else if (eventType === "download") {
    point.downloads += 1
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { key: range, days, since } = resolveRange(request.nextUrl.searchParams.get("range"))

    const { data: tracks, error: tracksError } = await supabase
      .from("artist_music")
      .select("id, title, stats, access_mode, preview_mode, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (tracksError) {
      console.error("Music analytics tracks query failed", tracksError)
      return jsonError({
        status: 500,
        code: "music_analytics_tracks_failed",
        message: "Failed to load music analytics",
        retryable: true,
      })
    }

    const trackIds = (tracks || []).map((track: any) => track.id)
    const emptySeries = buildEmptySeries(days)
    const seriesByDate = new Map(emptySeries.map((point) => [point.date, point]))
    const totals = {
      plays: 0,
      previewPlays: 0,
      fullPlays: 0,
      completedPlays: 0,
      saves: 0,
      profileFeatures: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      purchases: 0,
      downloads: 0,
      revenue: 0,
    }

    const byTrack = new Map<string, any>()
    for (const track of tracks || []) {
      byTrack.set(track.id, {
        id: track.id,
        title: track.title,
        accessMode: track.access_mode || "free",
        previewMode: track.preview_mode || "full",
        createdAt: track.created_at,
        cachedStats: track.stats || {},
        events: {
          plays: 0,
          previewPlays: 0,
          fullPlays: 0,
          completedPlays: 0,
          saves: 0,
          profileFeatures: 0,
          shares: 0,
          likes: 0,
          comments: 0,
          purchases: 0,
          downloads: 0,
        },
        revenue: 0,
        unitsSold: 0,
      })
    }

    const [{ data: events, error: eventsError }, { data: orderItems, error: orderItemsError }] = await Promise.all([
      trackIds.length > 0
        ? supabase
            .from("music_engagement_events")
            .select("music_id, event_type, access_level, created_at")
            .eq("artist_user_id", user.id)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(20000)
        : Promise.resolve({ data: [], error: null }),
      trackIds.length > 0
        ? supabase
            .from("marketplace_order_items")
            .select("music_track_id, line_total, quantity, created_at, marketplace_orders!inner(payment_status, seller_user_id, created_at, currency)")
            .in("music_track_id", trackIds)
            .eq("marketplace_orders.seller_user_id", user.id)
            .eq("marketplace_orders.payment_status", "paid")
            .gte("created_at", since)
            .limit(10000)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (eventsError || orderItemsError) {
      console.error("Music analytics event/order query failed", { eventsError, orderItemsError })
      return jsonError({
        status: 500,
        code: "music_analytics_query_failed",
        message: "Failed to load music analytics",
        retryable: true,
      })
    }

    for (const event of events || []) {
      const point = seriesByDate.get(dayKey((event as any).created_at))
      if (point) incrementEventBucket(point, (event as any).event_type, (event as any).access_level)

      const track = byTrack.get((event as any).music_id)
      if (track) incrementEventBucket(track.events, (event as any).event_type, (event as any).access_level)
    }

    for (const point of seriesByDate.values()) {
      totals.plays += point.plays
      totals.previewPlays += point.previewPlays
      totals.fullPlays += point.fullPlays
      totals.completedPlays += point.completedPlays
      totals.saves += point.saves
      totals.profileFeatures += point.profileFeatures
      totals.shares += point.shares
      totals.likes += point.likes
      totals.comments += point.comments
      totals.purchases += point.purchases
      totals.downloads += point.downloads
    }

    for (const item of orderItems || []) {
      const musicId = (item as any).music_track_id
      const revenue = Number((item as any).line_total || 0)
      const quantity = Number((item as any).quantity || 1)
      const date = dayKey((item as any).created_at)
      const point = seriesByDate.get(date)
      if (point) {
        point.revenue += revenue
        point.purchases += quantity
      }

      totals.revenue += revenue
      totals.purchases += quantity

      const track = byTrack.get(musicId)
      if (track) {
        track.revenue += revenue
        track.unitsSold += quantity
        track.events.purchases += quantity
      }
    }

    const perTrack = Array.from(byTrack.values()).map((track) => {
      const previewPlays = track.events.previewPlays
      const saves = track.events.saves
      const purchases = track.events.purchases
      return {
        ...track,
        conversion: {
          previewToLibraryRate: previewPlays > 0 ? saves / previewPlays : 0,
          previewToPurchaseRate: previewPlays > 0 ? purchases / previewPlays : 0,
        },
      }
    })

    const topTracks = [...perTrack]
      .sort((a, b) => b.events.plays + b.revenue - (a.events.plays + a.revenue))
      .slice(0, 20)

    return NextResponse.json({
      data: {
        range,
        since,
        totals,
        timeSeries: emptySeries,
        topTracks,
        tracks: perTrack,
        conversion: {
          previewToLibraryRate: totals.previewPlays > 0 ? totals.saves / totals.previewPlays : 0,
          previewToPurchaseRate: totals.previewPlays > 0 ? totals.purchases / totals.previewPlays : 0,
          completionRate: totals.plays > 0 ? totals.completedPlays / totals.plays : 0,
        },
      },
    })
  } catch (error) {
    console.error("Unexpected music analytics error", error)
    return jsonError({
      status: 500,
      code: "music_analytics_internal_error",
      message: "Unexpected music analytics error",
      retryable: true,
    })
  }
}
