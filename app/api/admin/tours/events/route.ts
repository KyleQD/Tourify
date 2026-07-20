import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
  tourAssignmentInputSchema,
} from "@/lib/admin/tour-event-operations.service"

export const POST = withAdminCapability("routing.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const tourId = body.tour_id
    const eventId = body.event_id
    if (!tourId || !eventId) {
      return NextResponse.json({ success: false, error: "tour_id and event_id required" }, { status: 400 })
    }

    const tour = await AdminTourEventOperationsService.getTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    const orgId = (tour as any).org_id
    if (!orgId) return NextResponse.json({ success: false, error: "Tour organization could not be resolved" }, { status: 400 })

    const assignment = tourAssignmentInputSchema.parse({
      tour_id: tourId,
      ordinal: body.ordinal,
      is_primary: body.is_primary,
      leg_name: body.leg_name,
      market: body.market,
      advance_status: body.advance_status,
      routing_notes: body.routing_notes,
    })

    const data = await AdminTourEventOperationsService.addTourAssignment({
      supabase,
      orgId,
      eventId,
      assignment,
    })

    return NextResponse.json({ success: true, data, assignment: data }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to attach event to tour" }, { status })
  }
})

export const DELETE = withAdminCapability("routing.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const params = new URL(request.url).searchParams
    const body = await request.json().catch(() => ({}))
    const tourId = params.get("tour_id") || body.tour_id
    const eventId = params.get("event_id") || body.event_id
    if (!tourId || !eventId) {
      return NextResponse.json({ success: false, error: "tour_id and event_id required" }, { status: 400 })
    }

    const tour = await AdminTourEventOperationsService.getTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    const orgId = (tour as any).org_id
    if (!orgId) return NextResponse.json({ success: false, error: "Tour organization could not be resolved" }, { status: 400 })

    const result = await AdminTourEventOperationsService.detachTourAssignment({
      supabase,
      eventId,
      tourId,
      orgId,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to detach event from tour" }, { status })
  }
})
