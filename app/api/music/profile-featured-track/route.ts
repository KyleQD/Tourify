import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { isTrackPubliclyPlayable, recordMusicEvent } from "@/lib/music/music-access"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = request.nextUrl
    const requestedUserId = searchParams.get("userId")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const targetUserId = requestedUserId || user?.id
    if (!targetUserId) {
      return jsonError({
        status: 401,
        code: "auth_required",
        message: "Sign in to view your featured track.",
        retryable: false,
      })
    }

    const { data, error } = await supabase
      .from("user_profile_featured_tracks")
      .select(`
        id,
        user_id,
        library_item_id,
        music_track_id,
        is_active,
        artist_music:music_track_id (
          id,
          title,
          genre,
          duration,
          cover_art_url,
          user_id,
          access_mode,
          preview_mode,
          allow_profile_feature,
          is_public,
          is_visible,
          moderation_status,
          rights_confirmed
        )
      `)
      .eq("user_id", targetUserId)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      console.error("Failed to load featured track", error)
      return jsonError({
        status: 500,
        code: "featured_track_query_failed",
        message: "Failed to load featured track",
        retryable: true,
      })
    }

    if (
      data &&
      (data as any).artist_music &&
      targetUserId !== user?.id &&
      !isTrackPubliclyPlayable((data as any).artist_music)
    ) {
      return NextResponse.json({ data: null })
    }

    const hydrated = data
      ? {
          ...data,
          artist_music: (data as any).artist_music
            ? {
                ...(data as any).artist_music,
                file_url: `/api/music/stream?trackId=${(data as any).music_track_id}`,
                stream_url: `/api/music/stream?trackId=${(data as any).music_track_id}`,
              }
            : (data as any).artist_music,
        }
      : null

    return NextResponse.json({ data: hydrated })
  } catch (error) {
    console.error("Unexpected featured track GET error", error)
    return jsonError({
      status: 500,
      code: "featured_track_internal_error",
      message: "Unexpected featured track error",
      retryable: true,
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { musicId } = await request.json()
    if (!musicId) {
      const { error } = await supabase
        .from("user_profile_featured_tracks")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)

      if (error) {
        return jsonError({
          status: 500,
          code: "featured_track_clear_failed",
          message: "Failed to clear featured track",
          retryable: true,
        })
      }

      return NextResponse.json({ data: null })
    }

    const { data: libraryItem } = await supabase
      .from("user_music_library")
      .select("id, music_track_id")
      .eq("buyer_user_id", user.id)
      .eq("music_track_id", musicId)
      .maybeSingle()

    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select(`
        id,
        user_id,
        is_public,
        is_visible,
        moderation_status,
        access_mode,
        allow_profile_feature,
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

    const isOwner = track.user_id === user.id
    if (!isOwner && !libraryItem) {
      return jsonError({
        status: 403,
        code: "library_track_required",
        message: "Add this track to your library before featuring it.",
        retryable: false,
      })
    }

    if (!isOwner && (!isTrackPubliclyPlayable(track) || track.allow_profile_feature === false)) {
      return jsonError({
        status: 403,
        code: "profile_feature_not_allowed",
        message: "This track cannot be featured on listener profiles.",
        retryable: false,
      })
    }

    const { data, error } = await supabase
      .from("user_profile_featured_tracks")
      .upsert(
        {
          user_id: user.id,
          library_item_id: libraryItem?.id || null,
          music_track_id: musicId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single()

    if (error) {
      console.error("Failed to set featured track", error)
      return jsonError({
        status: 500,
        code: "featured_track_update_failed",
        message: "Failed to set featured track",
        retryable: true,
      })
    }

    await recordMusicEvent({
      supabase,
      musicId,
      artistUserId: track.user_id,
      actorUserId: user.id,
      eventType: "profile_feature",
      accessLevel: "full",
      source: "api_music_profile_featured_track",
    })

    const { data: hydrated } = await supabase
      .from("user_profile_featured_tracks")
      .select(`
        id,
        user_id,
        library_item_id,
        music_track_id,
        is_active,
        artist_music:music_track_id (
          id,
          title,
          genre,
          duration,
          cover_art_url,
          user_id,
          access_mode,
          preview_mode,
          allow_profile_feature,
          is_public,
          is_visible,
          moderation_status,
          rights_confirmed
        )
      `)
      .eq("id", data.id)
      .maybeSingle()

    return NextResponse.json({
      data: hydrated
        ? {
            ...hydrated,
            artist_music: (hydrated as any).artist_music
              ? {
                  ...(hydrated as any).artist_music,
                  file_url: `/api/music/stream?trackId=${(hydrated as any).music_track_id}`,
                  stream_url: `/api/music/stream?trackId=${(hydrated as any).music_track_id}`,
                }
              : (hydrated as any).artist_music,
          }
        : data,
    })
  } catch (error) {
    console.error("Unexpected featured track PATCH error", error)
    return jsonError({
      status: 500,
      code: "featured_track_patch_internal_error",
      message: "Unexpected featured track error",
      retryable: true,
    })
  }
}
