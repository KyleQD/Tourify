import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("item")?.trim() || ""
  if (!UUID_PATTERN.test(itemId)) return NextResponse.json({ error: "Invalid music item" }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("artist_music")
    .select("id, title, description, type, genre, release_date, cover_art_url, user_id")
    .eq("id", itemId)
    .eq("is_public", true)
    .eq("is_visible", true)
    .eq("rights_confirmed", true)
    .eq("moderation_status", "approved")
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: "Music item not found" }, { status: 404 })
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } })
}
