import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
      .select("id, file_url, user_id, title, allow_downloads, stats")
      .eq("id", trackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    if (!track.allow_downloads)
      return NextResponse.json({ error: "Downloads are not enabled for this track" }, { status: 403 })

    const isOwner = user.id === track.user_id
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

    if (!track.file_url)
      return NextResponse.json({ error: "No audio file available" }, { status: 404 })

    const storagePath = extractStoragePath(track.file_url)
    if (!storagePath)
      return NextResponse.json({ error: "Unable to resolve download" }, { status: 500 })

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("artist-music")
      .createSignedUrl(storagePath, 300, {
        download: `${sanitizeFilename(track.title)}.mp3`,
      })

    if (signedUrlError || !signedUrlData?.signedUrl)
      return NextResponse.json({ error: "Unable to generate download link" }, { status: 500 })

    const currentStats = (track.stats && typeof track.stats === "object") ? track.stats as Record<string, number> : {}
    await supabase
      .from("artist_music")
      .update({ stats: { ...currentStats, downloads: (currentStats.downloads || 0) + 1 } })
      .eq("id", trackId)

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

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign)\/artist-music\/(.+)/
    )
    if (match?.[1]) return decodeURIComponent(match[1])
  } catch {}
  return null
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "track"
}
