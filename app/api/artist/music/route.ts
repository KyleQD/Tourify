import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "100"), 1), 300)
    const { data, error } = await supabase
      .from("artist_music")
      .select("id, title, genre, cover_art_url, file_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Failed to fetch artist tracks", error)
      return jsonError({
        status: 500,
        code: "artist_tracks_query_failed",
        message: "Failed to fetch artist tracks",
        retryable: true,
      })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected artist tracks GET error", error)
    return jsonError({
      status: 500,
      code: "artist_tracks_internal_error",
      message: "Unexpected artist tracks error",
      retryable: true,
    })
  }
}
