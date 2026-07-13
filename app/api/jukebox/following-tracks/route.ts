import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { isTrackPubliclyPlayable } from "@/lib/music/music-access"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const sortBy = searchParams.get("sortBy") || "recent"

    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)

    if (followsError)
      return NextResponse.json(
        { error: "Failed to load follows" },
        { status: 500 }
      )

    const followingIds = (follows || []).map((f) => f.following_id)
    if (followingIds.length === 0)
      return NextResponse.json({ data: [], total: 0 })

    let query = supabase
      .from("artist_music")
      .select(
        "id, title, genre, duration, file_url, cover_art_url, tags, created_at, user_id, is_public, is_visible, moderation_status, rights_confirmed, stats",
        { count: "exact" }
      )
      .eq("is_public", true)
      .neq("is_visible", false)
      .eq("moderation_status", "approved")
      .eq("rights_confirmed", true)
      .in("user_id", followingIds)

    switch (sortBy) {
      case "popular":
        query = query.order("created_at", { ascending: false })
        break
      case "recent":
      default:
        query = query.order("created_at", { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data: tracks, error: tracksError, count } = await query

    if (tracksError)
      return NextResponse.json(
        { error: "Failed to load tracks" },
        { status: 500 }
      )

    const artistIds = Array.from(new Set((tracks || []).map((t) => t.user_id)))
    let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {}

    if (artistIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", artistIds)

      profileMap = (profiles || []).reduce(
        (acc, p) => ({
          ...acc,
          [p.id]: { full_name: p.full_name, avatar_url: p.avatar_url },
        }),
        {} as Record<string, { full_name: string | null; avatar_url: string | null }>
      )
    }

    const data = (tracks || []).filter(isTrackPubliclyPlayable).map((track) => {
      const profile = profileMap[track.user_id]
      return {
        id: track.id,
        title: track.title,
        artist_name: profile?.full_name || "Artist",
        artist_id: track.user_id,
        artist_avatar_url: profile?.avatar_url || null,
        duration: track.duration,
        file_url: `/api/music/stream?trackId=${track.id}`,
        cover_art_url: track.cover_art_url,
        genre: track.genre,
        tags: track.tags,
        is_public: track.is_public,
      }
    })

    return NextResponse.json({ data, total: count ?? data.length })
  } catch (error) {
    console.error("Error in following-tracks API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
