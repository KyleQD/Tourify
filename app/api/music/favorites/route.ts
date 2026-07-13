import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { isTrackPubliclyPlayable } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const targetUserId = searchParams.get("userId")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const offset = parseInt(searchParams.get("offset") || "0")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const isSelf = !targetUserId || (user && targetUserId === user.id)
    const lookupUserId = targetUserId || user?.id

    if (!lookupUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: likes, error: likesError, count } = await supabase
      .from("music_likes")
      .select(
        `
        id,
        created_at,
        music_id,
        artist_music!inner (
          id,
          title,
          genre,
          duration,
          file_url,
          cover_art_url,
          user_id,
          is_public,
          is_visible,
          moderation_status,
          rights_confirmed,
          tags,
          stats
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", lookupUserId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (likesError) {
      console.error("Failed to fetch favorites:", likesError)
      return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
    }

    const artistIds = Array.from(
      new Set((likes || []).map((l: any) => l.artist_music?.user_id).filter(Boolean))
    )
    let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
    if (artistIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", artistIds)
      profileMap = (profiles || []).reduce(
        (acc: any, p: any) => ({ ...acc, [p.id]: { full_name: p.full_name, avatar_url: p.avatar_url } }),
        {}
      )
    }

    const tracks = (likes || [])
      .filter((l: any) => {
        const track = l.artist_music
        if (!track) return false
        if (!isSelf && !isTrackPubliclyPlayable(track)) return false
        return true
      })
      .map((l: any) => {
        const track = l.artist_music
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
          liked_at: l.created_at,
        }
      })

    return NextResponse.json({
      data: tracks,
      total: count ?? tracks.length,
    })
  } catch (error) {
    console.error("Favorites API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
