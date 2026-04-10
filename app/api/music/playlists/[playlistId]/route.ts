import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  visibility: z.enum(["private", "public", "unlisted"]).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
})

export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { playlistId } = await params
    const payload = updatePlaylistSchema.parse(await request.json())
    const updatePayload = {
      title: payload.title,
      description: payload.description,
      visibility: payload.visibility,
      cover_image_url: payload.coverImageUrl,
    }
    const cleaned = Object.fromEntries(Object.entries(updatePayload).filter(([, value]) => value !== undefined))

    const { data, error } = await supabase
      .from("music_playlists")
      .update(cleaned)
      .eq("id", playlistId)
      .eq("owner_user_id", user.id)
      .select("*")
      .single()

    if (error) {
      console.error("Failed to update playlist", error)
      return NextResponse.json({ error: "Failed to update playlist" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid playlist payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected playlist PATCH error", error)
    return NextResponse.json({ error: "Unexpected playlist update error" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { playlistId } = await params
    const { error } = await supabase.from("music_playlists").delete().eq("id", playlistId).eq("owner_user_id", user.id)

    if (error) {
      console.error("Failed to delete playlist", error)
      return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected playlist DELETE error", error)
    return NextResponse.json({ error: "Unexpected playlist delete error" }, { status: 500 })
  }
}
