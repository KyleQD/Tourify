import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { parseStorageTargetFromUrl } from "@/lib/marketplace/entitlement-delivery"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const SIGNED_URL_TTL_SECONDS = 3600

function decodeStoragePath(path: string) {
  try {
    return path
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/")
  } catch {
    return path
  }
}

export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get("trackId")
    if (!trackId)
      return NextResponse.json({ error: "trackId is required" }, { status: 400 })

    const supabase = await createClient()
    const { data: track, error: trackError } = await supabase
      .from("artist_music")
      .select("id, cover_art_url")
      .eq("id", trackId)
      .single()

    if (trackError || !track)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })

    const coverUrl =
      typeof track.cover_art_url === "string" ? track.cover_art_url.trim() : ""
    if (!coverUrl)
      return NextResponse.json({ error: "No cover art" }, { status: 404 })

    const target = parseStorageTargetFromUrl(coverUrl)
    if (target?.bucket && target.path) {
      try {
        const service = createServiceRoleClient()
        const path = decodeStoragePath(target.path)
        const { data: signedUrlData, error: signedUrlError } =
          await service.storage
            .from(target.bucket)
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

        if (!signedUrlError && signedUrlData?.signedUrl) {
          return NextResponse.redirect(signedUrlData.signedUrl, 302)
        }

        console.error("Failed to sign music cover URL", signedUrlError)
      } catch (signError) {
        console.error("Cover signing unavailable", signError)
      }
    }

    return NextResponse.redirect(coverUrl, 302)
  } catch (error) {
    console.error("Cover URL error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
