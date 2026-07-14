import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
  tourAssignmentInputSchema,
} from "@/lib/admin/tour-event-operations.service"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

async function getTourContext(supabase: any, userId: string, tourId: string) {
  const tour = await AdminTourEventOperationsService.getTour({ supabase, userId, tourId })
  const orgId = (tour as any).org_id
  if (!orgId) throw new Error("Tour organization could not be resolved.")
  return { tour, orgId }
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.getTour({ supabase, userId: user.id, tourId })
    return NextResponse.json({ success: true, events: (tour as any).events ?? [] })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 400)
    return NextResponse.json({ success: false, error: error.message || "Failed to load tour events" }, { status })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const { orgId } = await getTourContext(supabase, user.id, tourId)

    if (body.event_id) {
      const assignment = tourAssignmentInputSchema.parse({
        tour_id: tourId,
        ordinal: body.ordinal,
        is_primary: body.is_primary,
        leg_name: body.leg_name,
        market: body.market,
        advance_status: body.advance_status,
        routing_notes: body.routing_notes,
      })
      const row = await AdminTourEventOperationsService.addTourAssignment({
        supabase,
        orgId,
        eventId: body.event_id,
        assignment,
      })
      return NextResponse.json({ success: true, assignment: row }, { status: 201 })
    }

    const event = await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: user.id,
      input: {
        ...body,
        tour_assignments: [
          {
            tour_id: tourId,
            ordinal: body.ordinal,
            is_primary: true,
            leg_name: body.leg_name,
            market: body.market,
            advance_status: body.advance_status,
            routing_notes: body.routing_notes,
          },
        ],
      },
    })

    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to save tour event" }, { status })
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const { orgId } = await getTourContext(supabase, user.id, tourId)
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const eventId = url.searchParams.get("event_id") || body.event_id
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event_id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.detachTourAssignment({
      supabase,
      eventId,
      tourId,
      orgId,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to remove event from tour" }, { status })
  }
})
