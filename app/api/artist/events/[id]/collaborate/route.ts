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

const inviteSchema = z.object({
  inviteeUserId: z.string().uuid(),
  role: z.string().optional(),
  orgId: z.string().uuid().optional().nullable(),
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const body = await request.json().catch(() => null)
    const parsed = inviteSchema.parse(body)

    if (parsed.orgId) {
      await ArtistEventPromoteService.promoteEvent({
        supabase,
        userId: user.id,
        eventId,
        orgId: parsed.orgId,
        reason: "org_collab",
      })
    }

    const result = await ArtistEventPromoteService.inviteCollaborator({
      supabase,
      userId: user.id,
      eventId,
      inviteeUserId: parsed.inviteeUserId,
      role: parsed.role || "collaborator",
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[Artist Events Collaborate] error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to invite collaborator" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
