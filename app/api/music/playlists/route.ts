import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const createPlaylistSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  visibility: z.enum(["private", "public", "unlisted"]).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
      return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected playlists GET error", error)
    return NextResponse.json({ error: "Unexpected playlists error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
      return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid playlist payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected playlists POST error", error)
    return NextResponse.json({ error: "Unexpected playlist create error" }, { status: 500 })
  }
}
