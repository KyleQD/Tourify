import { NextRequest, NextResponse } from "next/server"

import {
  createTourStopHold,
  listTourStopHolds,
  TourHoldError,
  transitionTourStopHold,
} from "@/lib/admin/tour-stop-holds.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PLAN-205 — List / create tour stop holds. */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })
    const holds = await listTourStopHolds({
      supabase,
      orgId: admin.orgId,
      tourId,
    })
    return NextResponse.json({ success: true, holds })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list holds"
    return NextResponse.json({ success: false, error: message, holds: [] }, { status: 500 })
  }
})

export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })
    const body = await request.json().catch(() => null)

    if (body?.action && body?.hold_id) {
      const hold = await transitionTourStopHold({
        supabase,
        orgId: admin.orgId,
        holdId: String(body.hold_id),
        userId: user.id,
        action: body.action,
        note: body.note,
        confirmed_event_id: body.confirmed_event_id,
        confirmed_stop_id: body.confirmed_stop_id,
      })
      return NextResponse.json({ success: true, hold })
    }

    const hold = await createTourStopHold({
      supabase,
      orgId: admin.orgId,
      tourId,
      userId: user.id,
      input: body,
    })
    return NextResponse.json({ success: true, hold }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof TourHoldError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to save hold"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
