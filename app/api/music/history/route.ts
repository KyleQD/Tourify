/**
 * app/api/music/history/route.ts
 *
 * GET /api/music/history?limit=12
 *
 * Returns the authenticated listener's most recently played tracks,
 * distinct per track, newest first. Powers "Continue Listening".
 *
 * Additive endpoint: reads existing music_plays + artist_music only.
 */

import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") || "12"), 1),
      50
    )

    // Fetch recent plays, newest first. Over-fetch so distinct-per-track
    // still yields `limit` rows.
    const { data: plays, error } = await supabase
      .from("music_plays")
      .select(
        "music_id, listen_seconds, completed, created_at, artist_music(id, title, genre, duration, cover_art_url, file_url, user_id, tags)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit * 5)

    if (error) {
      console.error("Failed to load listening history", error)
      return jsonError({
        status: 500,
        code: "music_history_query_failed",
        message: "Failed to load listening history",
        retryable: true,
      })
    }

    const seen = new Set<string>()
    const items: Array<Record<string, unknown>> = []
    const artistIds = new Set<string>()

    for (const play of plays ?? []) {
      const track = Array.isArray(play.artist_music)
        ? play.artist_music[0]
        : play.artist_music
      if (!track?.id || seen.has(track.id)) continue
      seen.add(track.id)
      if (track.user_id) artistIds.add(track.user_id)
      items.push({
        id: track.id,
        title: track.title,
        genre: track.genre,
        duration: track.duration,
        cover_art_url: track.cover_art_url,
        file_url: track.file_url,
        artist_user_id: track.user_id,
        listen_seconds: play.listen_seconds,
        completed: play.completed,
        last_played_at: play.created_at,
      })
      if (items.length >= limit) break
    }

    // Resolve artist display names from profiles (artist_music.user_id → auth user)
    if (artistIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", Array.from(artistIds))
      const nameById = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null; username: string | null }) => [
          p.id,
          p.full_name || p.username || null,
        ])
      )
      for (const item of items) {
        item.artist_name = nameById.get(item.artist_user_id as string) ?? null
      }
    }

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error("Unexpected music history error", error)
    return jsonError({
      status: 500,
      code: "music_history_unexpected",
      message: "Unexpected error loading listening history",
      retryable: true,
    })
  }
}
