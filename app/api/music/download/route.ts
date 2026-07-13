import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  getTrackFullStoragePath,
  getTrackStorageBucket,
  isTrackPubliclyPlayable,
  recordMusicEvent,
  syncMusicStats,
} from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const trackId = request.nextUrl.searchParams.get("trackId")
    if (!trackId)
      return NextResponse.json({ error: "trackId is required" }, { status: 400 })

    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, storage_bucket, storage_path, file_url, user_id, title, allow_downloads, is_public, is_visible, moderation_status, rights_confirmed, stats")
      .eq("id", trackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    if (!track.allow_downloads)
      return NextResponse.json({ error: "Downloads are not enabled for this track" }, { status: 403 })

    const isOwner = user.id === track.user_id
    if (!isOwner && !isTrackPubliclyPlayable(track))
      return NextResponse.json({ error: "Track is not available" }, { status: 403 })
    if (!isOwner) {
      const { data: libraryEntry } = await supabase
        .from("user_music_library")
        .select("id")
        .eq("buyer_user_id", user.id)
        .eq("music_track_id", trackId)
        .maybeSingle()

      if (!libraryEntry)
        return NextResponse.json(
          { error: "You must purchase this track before downloading" },
          { status: 403 }
        )
    }

    const storagePath = getTrackFullStoragePath(track)
    if (!storagePath)
      return NextResponse.json({ error: "Unable to resolve download" }, { status: 500 })

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(getTrackStorageBucket(track, "full"))
      .createSignedUrl(storagePath, 300, {
        download: `${sanitizeFilename(track.title)}.mp3`,
      })

    if (signedUrlError || !signedUrlData?.signedUrl)
      return NextResponse.json({ error: "Unable to generate download link" }, { status: 500 })

    await recordMusicEvent({
      supabase,
      musicId: trackId,
      artistUserId: track.user_id,
      actorUserId: user.id,
      eventType: "download",
      accessLevel: "full",
      source: "api_music_download",
    })
    await syncMusicStats(supabase, trackId)

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      filename: `${sanitizeFilename(track.title)}.mp3`,
      expiresIn: 300,
    })
  } catch (error) {
    console.error("Download API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "track"
}
