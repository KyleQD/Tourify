import { NextRequest, NextResponse } from "next/server"

import { evaluateTourReadinessFromPersistedPlan } from "@/lib/admin/tour-readiness-engine.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PLAN-206 — Evaluate readiness from persisted normalized plan. */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })

    const evaluation = await evaluateTourReadinessFromPersistedPlan({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Readiness evaluation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

/** PUB-201 — Optional warning overrides when capability present. */
export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const overrideFindingIds = Array.isArray(body.overrideFindingIds)
      ? body.overrideFindingIds.map(String)
      : []

    const evaluation = await evaluateTourReadinessFromPersistedPlan({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
      overrideFindingIds,
      hasOverrideCapability: admin.capabilities.includes("tour.publish"),
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Readiness evaluation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
