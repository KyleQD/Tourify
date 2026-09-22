import { NextRequest, NextResponse } from "next/server"
import { requireArtistMusicUser } from "@/lib/artist/artist-music-auth"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authResult = await requireArtistMusicUser(request)
  if (!authResult.success) return authResult.response

  return NextResponse.json(
    {
      error: {
        code: "preview_generation_moved_to_worker",
        message: "Preview generation is asynchronous. Create or retry a preview with /api/artist/music/preview-jobs.",
        retryable: false,
      },
    },
    { status: 410 }
  )
}
