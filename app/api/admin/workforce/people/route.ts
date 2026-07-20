import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminAuth } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"

const querySchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]).optional(),
  employer_entity_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  venue_id: z.string().uuid().optional(),
  include_pending: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid workforce people query", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      employer_entity_type,
      employer_entity_id,
      event_id,
      tour_id,
      venue_id,
      include_pending,
      limit,
    } = parsed.data

    if (!employer_entity_id && !event_id && !tour_id && !venue_id) {
      return NextResponse.json(
        { error: "Provide employer_entity_id, event_id, tour_id, or venue_id" },
        { status: 400 }
      )
    }

    const people = await listWorkforcePeople({
      supabase,
      employerEntityType: employer_entity_type ?? (venue_id ? "venue" : null),
      employerEntityId: employer_entity_id ?? venue_id ?? null,
      eventId: event_id ?? null,
      tourId: tour_id ?? null,
      venueId: venue_id ?? null,
      includePending: include_pending,
      limit,
    })

    return NextResponse.json({
      members: people,
      people,
      total: people.length,
    })
  } catch (error) {
    console.error("[Workforce People] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workforce people" },
      { status: 500 }
    )
  }
})
