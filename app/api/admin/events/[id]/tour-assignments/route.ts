import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
  tourAssignmentInputSchema,
} from "@/lib/admin/tour-event-operations.service"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

async function getEventContext(supabase: any, userId: string, eventId: string) {
  const event = await AdminTourEventOperationsService.getEvent({ supabase, userId, eventId })
  const orgId = (event as any).org_id
  if (!orgId) throw new Error("Event organization could not be resolved.")
  return { event, orgId }
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const { orgId } = await getEventContext(supabase, user.id, eventId)
    const assignments = await AdminTourEventOperationsService.getTourAssignments({
      supabase,
      userId: user.id,
      eventId,
      orgId,
    })
    return NextResponse.json({ success: true, assignments })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 400)
    return NextResponse.json({ success: false, error: error.message || "Failed to load tour assignments" }, { status })
  }
})

export const PUT = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const assignments = tourAssignmentInputSchema.array().parse(body.assignments ?? body.tour_assignments ?? [])
    const { orgId } = await getEventContext(supabase, user.id, eventId)
    const rows = await AdminTourEventOperationsService.replaceTourAssignments({
      supabase,
      orgId,
      eventId,
      assignments,
    })
    return NextResponse.json({ success: true, assignments: rows })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to save tour assignments" }, { status })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const assignment = tourAssignmentInputSchema.parse(await request.json())
    const { orgId } = await getEventContext(supabase, user.id, eventId)
    const row = await AdminTourEventOperationsService.addTourAssignment({
      supabase,
      orgId,
      eventId,
      assignment,
    })
    return NextResponse.json({ success: true, assignment: row }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to attach tour" }, { status })
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const { orgId } = await getEventContext(supabase, user.id, eventId)
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const tourId = url.searchParams.get("tour_id") || body.tour_id
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour_id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.detachTourAssignment({
      supabase,
      eventId,
      tourId,
      orgId,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to detach tour" }, { status })
  }
})
