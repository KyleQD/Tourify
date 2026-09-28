import { NextRequest, NextResponse } from "next/server"

import {
  getTourPlanErrorStatus,
  readTourPlan,
  TourPlanVersionConflictError,
  writeTourPlan,
} from "@/lib/admin/tour-plan.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const plan = await readTourPlan({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, plan })
  } catch (error: unknown) {
    const status = getTourPlanErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to load plan"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})

export const PUT = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const body = await request.json().catch(() => null)
    const { plan, reconciliation } = await writeTourPlan({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
      input: body,
    })
    return NextResponse.json({
      success: true,
      plan,
      planVersion: plan.planVersion,
      reconciliation,
    })
  } catch (error: unknown) {
    const status = getTourPlanErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to save plan"
    const payload: Record<string, unknown> = { success: false, error: message }
    if (error instanceof TourPlanVersionConflictError) {
      payload.code = error.code
      payload.currentVersion = error.currentVersion
      payload.expectedVersion = error.expectedVersion
      payload.diff = error.diff
      // Server plan lets the client adopt without a second fetch; never silent overwrite.
      payload.plan = error.serverPlan
      payload.planVersion = error.currentVersion
    }
    return NextResponse.json(payload, { status })
  }
})
