import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { isTrackPubliclyPlayable, recordMusicEvent, syncMusicStats } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const searchParams = request.nextUrl.searchParams
    const musicId = searchParams.get("musicId")

    if (musicId) {
      const { data: membership, error: membershipError } = await supabase
        .from("user_music_library")
        .select("id")
        .eq("buyer_user_id", user.id)
        .eq("music_track_id", musicId)
        .maybeSingle()

      if (membershipError) {
        console.error("Failed to check music library membership", membershipError)
        return jsonError({
          status: 500,
          code: "music_library_query_failed",
          message: "Failed to check music library",
          retryable: true,
        })
      }

      return NextResponse.json({ inLibrary: Boolean(membership?.id) })
    }

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
          user_id,
          access_mode,
          preview_mode,
          preview_duration_seconds,
          allow_profile_feature,
          allow_downloads
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

    const rows = (data || []).map((item: any) => ({
      ...item,
      artist_music: item.artist_music
        ? {
            ...item.artist_music,
            file_url: `/api/music/stream?trackId=${item.music_track_id}`,
            stream_url: `/api/music/stream?trackId=${item.music_track_id}`,
          }
        : item.artist_music,
    }))

    return NextResponse.json({ data: rows })
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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { musicId } = await request.json()
    if (!musicId || typeof musicId !== "string") {
      return jsonError({
        status: 400,
        code: "music_id_required",
        message: "musicId is required",
        retryable: false,
      })
    }

    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select(`
        id,
        user_id,
        is_public,
        is_visible,
        moderation_status,
        access_mode,
        allow_library_add,
        rights_confirmed
      `)
      .eq("id", musicId)
      .single()

    if (trackError || !track) {
      return jsonError({
        status: 404,
        code: "track_not_found",
        message: "Track not found",
        retryable: false,
      })
    }

    if (track.user_id === user.id) {
      return jsonError({
        status: 400,
        code: "own_track_library_add_not_needed",
        message: "Your own tracks are already available to you.",
        retryable: false,
      })
    }

    if (!isTrackPubliclyPlayable(track) || track.allow_library_add === false) {
      return jsonError({
        status: 403,
        code: "library_add_not_allowed",
        message: "This track cannot be added to your library.",
        retryable: false,
      })
    }

    if ((track.access_mode || "free") !== "free") {
      const { data: existingEntitlement } = await supabase
        .from("user_music_library")
        .select("id, music_track_id, source, created_at")
        .eq("buyer_user_id", user.id)
        .eq("music_track_id", musicId)
        .maybeSingle()

      if (!existingEntitlement) {
        return jsonError({
          status: 402,
          code: "purchase_required",
          message: "Purchase this track before adding it to your library.",
          retryable: false,
        })
      }

      return NextResponse.json({ data: existingEntitlement })
    }

    const { data, error } = await supabase
      .from("user_music_library")
      .upsert(
        {
          buyer_user_id: user.id,
          order_item_id: null,
          entitlement_id: null,
          listing_id: null,
          music_track_id: musicId,
          seller_user_id: track.user_id,
          source: "free_add",
        },
        { onConflict: "buyer_user_id,music_track_id" }
      )
      .select("id, music_track_id, source, created_at")
      .single()

    if (error) {
      console.error("Failed to add track to library", error)
      return jsonError({
        status: 500,
        code: "music_library_add_failed",
        message: "Failed to add track to library",
        retryable: true,
      })
    }

    await recordMusicEvent({
      supabase,
      musicId,
      artistUserId: track.user_id,
      actorUserId: user.id,
      eventType: "library_add",
      accessLevel: "full",
      source: data.source || "free_add",
    })
    await syncMusicStats(supabase, musicId)

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Unexpected music library POST error", error)
    return jsonError({
      status: 500,
      code: "music_library_post_internal_error",
      message: "Unexpected music library error",
      retryable: true,
    })
  }
}
