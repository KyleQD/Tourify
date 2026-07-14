import { NextRequest, NextResponse } from "next/server"

import { withAuth } from "@/lib/auth/api-auth"
import {
  ArtistEventOperationsService,
  getArtistEventErrorStatus,
} from "@/lib/artist/artist-event-operations.service"

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const events = await ArtistEventOperationsService.listEvents({
      supabase,
      userId: user.id,
      status: searchParams.get("status"),
    })
    return NextResponse.json({ success: true, events })
  } catch (error: any) {
    console.error("[Artist Events API] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load events", events: [] },
      { status: getArtistEventErrorStatus(error, 400) },
    )
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json().catch(() => null)
    const event = await ArtistEventOperationsService.createEvent({
      supabase,
      userId: user.id,
      input: body,
    })
    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (error: any) {
    console.error("[Artist Events API] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create event" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
