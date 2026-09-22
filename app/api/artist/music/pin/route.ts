import { NextRequest, NextResponse } from "next/server"
import { requireArtistMusicUser } from "@/lib/artist/artist-music-auth"

interface TogglePinBody {
  musicId: string
  isPinned: boolean
}

export async function POST(request: NextRequest) {
  const authResult = await requireArtistMusicUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const userId = user.id

  let body: TogglePinBody
  try {
    body = (await request.json()) as TogglePinBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body?.musicId) return NextResponse.json({ error: "Missing musicId" }, { status: 400 })

  const { data: trackRow, error: trackError } = await supabase
    .from("artist_music")
    .select("id, user_id")
    .eq("id", body.musicId)
    .single()

  if (trackError || !trackRow) return NextResponse.json({ error: "Track not found" }, { status: 404 })
  if (trackRow.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error: updateError } = await supabase
    .from("artist_music")
    .update({ is_pinned: Boolean(body.isPinned) })
    .eq("id", body.musicId)
    .eq("user_id", userId)

  if (updateError) {
    console.error("Error toggling music pin:", updateError)
    return NextResponse.json({ error: "Failed to update pin state" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
