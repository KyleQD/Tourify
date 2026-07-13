import { NextRequest, NextResponse } from "next/server"

import { withAuth } from "@/lib/auth/api-auth"
import {
  ArtistEventOperationsService,
  getArtistEventErrorStatus,
} from "@/lib/artist/artist-event-operations.service"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const event = await ArtistEventOperationsService.publishEvent({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    console.error("[Artist Events API] PUBLISH error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to publish event" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
