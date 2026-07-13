import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser, readJson } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  musicIds: z.array(z.string().min(1)).min(1).max(100),
})

interface MusicLikeRow {
  music_id: string
}

interface MusicLibraryRow {
  music_track_id: string
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const parsed = await readJson(request, bodySchema)
    if (!parsed.success) return parsed.response
    const musicIds = Array.from(new Set(parsed.data.musicIds))

    const [{ data: likes }, { data: library }] = await Promise.all([
      supabase
        .from("music_likes")
        .select("music_id")
        .eq("user_id", user.id)
        .in("music_id", musicIds),
      supabase
        .from("user_music_library")
        .select("music_track_id")
        .eq("buyer_user_id", user.id)
        .in("music_track_id", musicIds),
    ])

    const likedSet = new Set(((likes || []) as MusicLikeRow[]).map((row) => row.music_id))
    const librarySet = new Set(((library || []) as MusicLibraryRow[]).map((row) => row.music_track_id))

    const statuses: Record<string, { liked: boolean; inLibrary: boolean }> = {}
    for (const id of musicIds) {
      statuses[id] = {
        liked: likedSet.has(id),
        inLibrary: librarySet.has(id),
      }
    }

    return NextResponse.json({ data: statuses })
  } catch (error) {
    console.error("music social-status error", error)
    return jsonError({
      status: 500,
      code: "music_social_status_failed",
      message: "Failed to load social status",
      retryable: true,
    })
  }
}
