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

const ticketSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().min(0),
  quantity_available: z.number().int().min(0),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const ticketTypes = await ArtistEventPromoteService.listTicketTypes({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json({ success: true, ticketTypes })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load ticket types", ticketTypes: [] },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const body = await request.json().catch(() => null)
    const parsed = ticketSchema.parse(body)
    const result = await ArtistEventPromoteService.upsertTicketType({
      supabase,
      userId: user.id,
      eventId,
      input: parsed,
    })
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save ticket type" },
      { status: getArtistEventErrorStatus(error, 500) },
    )
  }
})
