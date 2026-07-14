import { createClient } from "@/lib/supabase/server"
import {
  getTrackFullStoragePath,
  getTrackPreviewStoragePath,
  getTrackStorageBucket,
  recordMusicEvent,
  resolveMusicAccess,
} from "@/lib/music/music-access"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const trackId = request.nextUrl.searchParams.get("trackId")

    if (!trackId)
      return NextResponse.json({ error: "trackId is required" }, { status: 400 })

    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select(`
        id,
        user_id,
        storage_bucket,
        storage_path,
        preview_storage_bucket,
        preview_storage_path,
        preview_status,
        file_url,
        preview_file_url,
        is_public,
        is_visible,
        moderation_status,
        access_mode,
        preview_mode,
        rights_confirmed
      `)
      .eq("id", trackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    const { data: { user } } = await supabase.auth.getUser()

    const access = await resolveMusicAccess({
      supabase,
      track,
      viewerUserId: user?.id || null,
    })

    if (!access.allowed) {
      const status = access.reason === "auth_required" ? 401 : 403
      return NextResponse.json({ error: "Access denied", accessLevel: access.accessLevel }, { status })
    }

    const storagePath =
      access.accessLevel === "preview"
        ? getTrackPreviewStoragePath(track)
        : getTrackFullStoragePath(track)

    if (!storagePath)
      return NextResponse.json({ error: "No audio file" }, { status: 404 })

    const bucket = getTrackStorageBucket(track, access.accessLevel)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to sign music stream URL", signedUrlError)
      return NextResponse.json({ error: "Unable to generate stream URL" }, { status: 500 })
    }

    await recordMusicEvent({
      supabase,
      musicId: track.id,
      artistUserId: track.user_id,
      actorUserId: user?.id || null,
      eventType: "stream_issued",
      accessLevel: access.accessLevel,
      source: "api_music_stream",
      metadata: { bucket, storage_path: storagePath },
    })

    const response = NextResponse.json({
      url: signedUrlData.signedUrl,
      accessLevel: access.accessLevel,
      expiresIn: 3600,
    })
    response.headers.set("Cache-Control", "private, max-age=3000")
    return response
  } catch (error) {
    console.error("Stream URL error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
