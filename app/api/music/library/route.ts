import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || "50"), 1), 200)
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0)

    const { data, error } = await supabase
      .from("user_music_library")
      .select(`
        id,
        created_at,
        source,
        listing_id,
        music_track_id,
        seller_user_id,
        marketplace_listings:listing_id (
          id,
          title,
          cover_image_url,
          base_price,
          currency
        ),
        artist_music:music_track_id (
          id,
          title,
          genre,
          duration,
          cover_art_url,
          file_url,
          user_id
        )
      `)
      .eq("buyer_user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Failed to load music library", error)
      return jsonError({
        status: 500,
        code: "music_library_query_failed",
        message: "Failed to load music library",
        retryable: true,
      })
    }

    await supabase.from("achievement_progress_events").insert({
      user_id: user.id,
      metric_key: "music_library_views_total",
      event_type: "music_library_viewed",
      event_value: 1,
      event_source: "api_music_library_get",
      event_data: {
        returned_count: data?.length || 0,
        limit,
        offset,
      },
    })

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected music library GET error", error)
    return jsonError({
      status: 500,
      code: "music_library_internal_error",
      message: "Unexpected music library error",
      retryable: true,
    })
  }
}
