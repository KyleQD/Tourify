import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

interface TogglePinBody {
  musicId: string
  isPinned: boolean
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

