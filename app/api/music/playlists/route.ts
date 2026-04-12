import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fromZodError, jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { authenticateApiRequest } from "@/lib/auth/api-auth"

const createPlaylistSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  visibility: z.enum(["private", "public", "unlisted"]).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    const supabase = authResult?.supabase || (await createClient())
    const user = authResult?.user || null

    const searchParams = request.nextUrl.searchParams
    const ownerUserId = searchParams.get("ownerUserId")
    const includeItems = searchParams.get("includeItems") === "true"

    let query = supabase
      .from("music_playlists")
      .select(
        includeItems
          ? "*, music_playlist_items(*, artist_music(id, title, genre, duration, cover_art_url, file_url, user_id))"
          : "*"
      )
      .order("created_at", { ascending: false })

    if (ownerUserId) query = query.eq("owner_user_id", ownerUserId)
    else if (user?.id) query = query.eq("owner_user_id", user.id)
    else query = query.eq("visibility", "public")

    const { data, error } = await query
    if (error) {
      console.error("Failed to fetch playlists", error)
      return jsonError({
        status: 500,
        code: "playlists_query_failed",
        message: "Failed to fetch playlists",
        retryable: true,
      })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected playlists GET error", error)
    return jsonError({
      status: 500,
      code: "playlists_internal_error",
      message: "Unexpected playlists error",
      retryable: true,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const payload = createPlaylistSchema.parse(await request.json())
    const shareSlug = `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`
    const { data, error } = await supabase
      .from("music_playlists")
      .insert({
        owner_user_id: user.id,
        title: payload.title,
        description: payload.description || null,
        visibility: payload.visibility || "private",
        cover_image_url: payload.coverImageUrl || null,
        share_slug: shareSlug,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Failed to create playlist", error)
      return jsonError({
        status: 500,
        code: "playlist_create_failed",
        message: "Failed to create playlist",
        retryable: true,
      })
    }

    await supabase.from("achievement_progress_events").insert({
      user_id: user.id,
      metric_key: "music_playlists_created_total",
      event_type: "music_playlist_created",
      event_value: 1,
      event_source: "api_music_playlists_post",
      event_data: {
        playlist_id: data.id,
        visibility: data.visibility,
      },
    })

    return NextResponse.json({ data })
  } catch (error) {
    const zodError = fromZodError(error, "Invalid playlist payload")
    if (zodError) return zodError

    console.error("Unexpected playlists POST error", error)
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unexpected playlist create error",
      retryable: true,
    })
  }
}
