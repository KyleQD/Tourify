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

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const event = await ArtistEventOperationsService.getEvent({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    console.error("[Artist Events API] GET [id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load event" },
      { status: getArtistEventErrorStatus(error, 404) },
    )
  }
})

export const PATCH = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const body = await request.json().catch(() => null)
    const event = await ArtistEventOperationsService.updateEvent({
      supabase,
      userId: user.id,
      eventId,
      input: body,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    console.error("[Artist Events API] PATCH [id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update event" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})

export const DELETE = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    await ArtistEventOperationsService.deleteEvent({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Artist Events API] DELETE [id] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete event" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
