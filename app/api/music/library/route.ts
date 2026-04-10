import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
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
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq("buyer_user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Failed to load music library", error)
      return NextResponse.json({ error: "Failed to load music library" }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected music library GET error", error)
    return NextResponse.json({ error: "Unexpected music library error" }, { status: 500 })
  }
}
