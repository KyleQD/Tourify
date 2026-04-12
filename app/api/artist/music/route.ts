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

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "100"), 1), 300)
    const { data, error } = await supabase
      .from("artist_music")
      .select("id, title, genre, cover_art_url, file_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Failed to fetch artist tracks", error)
      return NextResponse.json({ error: "Failed to fetch artist tracks" }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error("Unexpected artist tracks GET error", error)
    return NextResponse.json({ error: "Unexpected artist tracks error" }, { status: 500 })
  }
}
