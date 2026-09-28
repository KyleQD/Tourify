import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"

const querySchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]).optional(),
  employer_entity_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  venue_id: z.string().uuid().optional(),
  query: z.string().trim().max(160).optional(),
  include_pending: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const GET = withAdminCapability("workforce.view", async (request: NextRequest, { supabase, admin }) => {
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
      query,
    } = parsed.data

    if (!employer_entity_id && !event_id && !tour_id && !venue_id) {
      return NextResponse.json(
        { error: "Provide employer_entity_id, event_id, tour_id, or venue_id" },
        { status: 400 }
      )
    }

    if (employer_entity_type && employer_entity_type !== "organization") {
      return NextResponse.json({ error: "Organization people search is required for this surface.", code: "forbidden" }, { status: 403 })
    }
    if (employer_entity_id && employer_entity_id !== admin.orgId) {
      return NextResponse.json({ error: "The requested people directory is outside the active organization.", code: "forbidden" }, { status: 403 })
    }

    const people = await listWorkforcePeople({
      supabase,
      employerEntityType: "organization",
      employerEntityId: admin.orgId,
      eventId: event_id ?? null,
      tourId: tour_id ?? null,
      venueId: venue_id ?? null,
      includePending: include_pending,
      limit,
    })

    const normalizedQuery = query?.toLowerCase()
    const filtered = normalizedQuery
      ? people.filter((person) => [person.name, person.email, person.role].some((value) => value?.toLowerCase().includes(normalizedQuery)))
      : people
    return NextResponse.json({
      members: filtered,
      people: filtered,
      total: filtered.length,
    })
  } catch (error) {
    console.error("[Workforce People] GET error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workforce people" },
      { status: 500 }
    )
  }
})
