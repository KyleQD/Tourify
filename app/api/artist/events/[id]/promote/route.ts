import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAuth } from "@/lib/auth/api-auth"
import { ArtistEventPromoteService } from "@/lib/artist/artist-event-promote.service"
import { getArtistEventErrorStatus } from "@/lib/artist/artist-event-operations.service"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

const promoteSchema = z.object({
  orgId: z.string().uuid().optional().nullable(),
  reason: z.enum(["native_ticketing", "venue_collab", "org_collab"]).optional(),
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const parsed = promoteSchema.parse(body || {})
    const result = await ArtistEventPromoteService.promoteEvent({
      supabase,
      userId: user.id,
      eventId,
      orgId: parsed.orgId,
      reason: parsed.reason || "native_ticketing",
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[Artist Events Promote] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to promote event" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
