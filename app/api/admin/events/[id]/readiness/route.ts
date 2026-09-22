import { NextRequest, NextResponse } from "next/server"

import { evaluateEventReadinessFromPersisted } from "@/lib/admin/event-readiness-engine.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

/** EVENT-201 — Evaluate readiness from persisted event fields. */
export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "event id required" }, { status: 400 })

    const evaluation = await evaluateEventReadinessFromPersisted({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Readiness evaluation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

/** EVENT-201 — Optional warning overrides when publish capability present. */
export const POST = withAdminCapability("event.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "event id required" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const overrideFindingIds = Array.isArray(body.overrideFindingIds)
      ? body.overrideFindingIds.map(String)
      : []

    const evaluation = await evaluateEventReadinessFromPersisted({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
      overrideFindingIds,
      hasOverrideCapability: admin.capabilities.includes("event.publish"),
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Readiness evaluation failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
