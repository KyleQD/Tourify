import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
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
