import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "100"), 1), 300)
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0")
    const genre = request.nextUrl.searchParams.get("genre")
    const isPublic = request.nextUrl.searchParams.get("is_public")

    let query = supabase
      .from("artist_music")
      .select(
        "id, title, description, genre, duration, file_url, cover_art_url, tags, type, is_public, is_featured, is_pinned, allow_downloads, stats, release_date, lyrics, spotify_url, apple_music_url, soundcloud_url, youtube_url, created_at, updated_at",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (genre) query = query.eq("genre", genre)
    if (isPublic === "true") query = query.eq("is_public", true)
    if (isPublic === "false") query = query.eq("is_public", false)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("Failed to fetch artist tracks", error)
      return jsonError({
        status: 500,
        code: "artist_tracks_query_failed",
        message: "Failed to fetch artist tracks",
        retryable: true,
      })
    }

    return NextResponse.json({ data: data || [], total: count ?? (data?.length || 0) })
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

const updateTrackSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  genre: z.string().max(50).nullable().optional(),
  type: z.enum(["single", "album", "ep", "mixtape"]).optional(),
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  allow_downloads: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  lyrics: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  cover_art_url: z.string().nullable().optional(),
  spotify_url: z.string().nullable().optional(),
  apple_music_url: z.string().nullable().optional(),
  soundcloud_url: z.string().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const payload = updateTrackSchema.parse(await request.json())
    const { id, ...updates } = payload

    if (Object.keys(updates).length === 0)
      return jsonError({ status: 400, code: "no_updates", message: "No fields to update", retryable: false })

    const { data: existing } = await supabase
      .from("artist_music")
      .select("id, user_id")
      .eq("id", id)
      .single()

    if (!existing)
      return jsonError({ status: 404, code: "track_not_found", message: "Track not found", retryable: false })
    if (existing.user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "You can only edit your own tracks", retryable: false })

    const { data, error } = await supabase
      .from("artist_music")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single()

    if (error) {
      console.error("Failed to update track", error)
      return jsonError({ status: 500, code: "track_update_failed", message: "Failed to update track", retryable: true })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 })
    console.error("Unexpected track PATCH error", error)
    return jsonError({ status: 500, code: "track_update_internal", message: "Unexpected error", retryable: true })
  }
}

const deleteTrackSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { id } = deleteTrackSchema.parse(await request.json())

    const { data: existing } = await supabase
      .from("artist_music")
      .select("id, user_id, file_url")
      .eq("id", id)
      .single()

    if (!existing)
      return jsonError({ status: 404, code: "track_not_found", message: "Track not found", retryable: false })
    if (existing.user_id !== user.id)
      return jsonError({ status: 403, code: "forbidden", message: "You can only delete your own tracks", retryable: false })

    const { error } = await supabase
      .from("artist_music")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to delete track", error)
      return jsonError({ status: 500, code: "track_delete_failed", message: "Failed to delete track", retryable: true })
    }

    if (existing.file_url) {
      try {
        const url = new URL(existing.file_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/artist-music\/(.+)/)
        if (pathMatch?.[1]) {
          await supabase.storage.from("artist-music").remove([decodeURIComponent(pathMatch[1])])
        }
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 })
    console.error("Unexpected track DELETE error", error)
    return jsonError({ status: 500, code: "track_delete_internal", message: "Unexpected error", retryable: true })
  }
}
