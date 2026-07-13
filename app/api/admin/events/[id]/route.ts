import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const event = await AdminTourEventOperationsService.getEvent({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 400)
    return NextResponse.json({ success: false, error: error.message || "Failed to load event" }, { status })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const event = await AdminTourEventOperationsService.updateEvent({
      supabase,
      userId: user.id,
      eventId,
      input: body,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to update event" }, { status })
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.deleteEvent({
      supabase,
      userId: user.id,
      eventId,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete event" }, { status })
  }
})
