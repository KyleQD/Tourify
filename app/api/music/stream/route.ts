import { createClient } from "@/lib/supabase/server"
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
      .select("id, file_url, is_public, user_id")
      .eq("id", trackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    const { data: { user } } = await supabase.auth.getUser()
    const isOwner = user?.id === track.user_id

    if (!track.is_public && !isOwner) {
      if (!user)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      const { data: libraryEntry } = await supabase
        .from("user_music_library")
        .select("id")
        .eq("buyer_user_id", user.id)
        .eq("music_track_id", trackId)
        .maybeSingle()

      if (!libraryEntry)
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!track.file_url)
      return NextResponse.json({ error: "No audio file" }, { status: 404 })

    const storagePath = extractStoragePath(track.file_url)
    if (!storagePath)
      return NextResponse.json({ url: track.file_url })

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("artist-music")
      .createSignedUrl(storagePath, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ url: track.file_url })
    }

    const response = NextResponse.json({ url: signedUrlData.signedUrl, expiresIn: 3600 })
    response.headers.set("Cache-Control", "private, max-age=3000")
    return response
  } catch (error) {
    console.error("Stream URL error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/artist-music\/(.+)/)
    if (match?.[1]) return decodeURIComponent(match[1])

    const renderMatch = url.pathname.match(/\/storage\/v1\/render\/image\/public\/artist-music\/(.+)/)
    if (renderMatch?.[1]) return decodeURIComponent(renderMatch[1])
  } catch {}
  return null
}
