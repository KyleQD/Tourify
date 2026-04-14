import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const addPlaylistItemSchema = z.object({
  musicTrackId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  note: z.string().max(400).optional().nullable(),
})

const reorderPlaylistItemSchema = z.object({
  itemId: z.string().uuid(),
  position: z.number().int().min(0),
})

export const dynamic = "force-dynamic"

async function ensurePlaylistOwnership({
  supabase,
  playlistId,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  playlistId: string
  userId: string
}) {
  const { data, error } = await supabase
    .from("music_playlists")
    .select("id, owner_user_id")
    .eq("id", playlistId)
    .single()

  if (error || !data) return { ok: false as const, status: 404 as const }
  if (data.owner_user_id !== userId) return { ok: false as const, status: 403 as const }
  return { ok: true as const }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { playlistId } = await params
    const ownership = await ensurePlaylistOwnership({ supabase, playlistId, userId: user.id })
    if (!ownership.ok) return NextResponse.json({ error: ownership.status === 404 ? "Playlist not found" : "Forbidden" }, { status: ownership.status })

    const payload = addPlaylistItemSchema.parse(await request.json())

    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, is_public, user_id")
      .eq("id", payload.musicTrackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    const isOwner = track.user_id === user.id
    const isPublic = track.is_public === true

    if (!isOwner && !isPublic) {
      const { data: libraryEntry } = await supabase
        .from("user_music_library")
        .select("id")
        .eq("buyer_user_id", user.id)
        .eq("music_track_id", payload.musicTrackId)
        .maybeSingle()

      if (!libraryEntry)
        return NextResponse.json({ error: "Track is private and not in your library" }, { status: 403 })
    }

    const { data, error } = await supabase
      .from("music_playlist_items")
      .insert({
        playlist_id: playlistId,
        music_track_id: payload.musicTrackId,
        added_by_user_id: user.id,
        position: payload.position ?? 0,
        note: payload.note || null,
      })
      .select("*, artist_music(id, title, genre, duration, cover_art_url, file_url)")
      .single()

    if (error) {
      console.error("Failed to add playlist item", error)
      return NextResponse.json({ error: "Failed to add playlist item" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid playlist item payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected playlist item POST error", error)
    return NextResponse.json({ error: "Unexpected playlist item error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { playlistId } = await params
    const ownership = await ensurePlaylistOwnership({ supabase, playlistId, userId: user.id })
    if (!ownership.ok) return NextResponse.json({ error: ownership.status === 404 ? "Playlist not found" : "Forbidden" }, { status: ownership.status })

    const payload = reorderPlaylistItemSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_playlist_items")
      .update({ position: payload.position })
      .eq("id", payload.itemId)
      .eq("playlist_id", playlistId)
      .select("*")
      .single()

    if (error) {
      console.error("Failed to reorder playlist item", error)
      return NextResponse.json({ error: "Failed to reorder playlist item" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid playlist reorder payload", issues: error.issues }, { status: 400 })
    }

    console.error("Unexpected playlist item PATCH error", error)
    return NextResponse.json({ error: "Unexpected playlist reorder error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ playlistId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { playlistId } = await params
    const ownership = await ensurePlaylistOwnership({ supabase, playlistId, userId: user.id })
    if (!ownership.ok) return NextResponse.json({ error: ownership.status === 404 ? "Playlist not found" : "Forbidden" }, { status: ownership.status })

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get("itemId")
    if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 })

    const { error } = await supabase
      .from("music_playlist_items")
      .delete()
      .eq("id", itemId)
      .eq("playlist_id", playlistId)

    if (error) {
      console.error("Failed to remove playlist item", error)
      return NextResponse.json({ error: "Failed to remove playlist item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected playlist item DELETE error", error)
    return NextResponse.json({ error: "Unexpected playlist item delete error" }, { status: 500 })
  }
}
