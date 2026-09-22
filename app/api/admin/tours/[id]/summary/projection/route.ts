import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  inspectTourCommandCenterProjection,
  rebuildTourCommandCenterProjection,
  replayTourCommandCenterProjectionFromOutbox,
} from "@/lib/admin/command-center-projection.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * REP-202 — Projection lag, watermarks, and live reconciliation (read-only).
 */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

    await assertAdminTourAccess({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    const health = await inspectTourCommandCenterProjection({
      supabase,
      orgId: admin.orgId,
      tourId,
      capabilities: admin.capabilities,
    })

    return NextResponse.json({ success: true, health })
  } catch (error: unknown) {
    const resolved = adminAccessErrorResponse(error, "Failed to inspect projection", 500)
    return NextResponse.json({ success: false, error: resolved.message }, { status: resolved.status })
  }
})

/**
 * REP-202 — Rebuild projection from canonical sources, or replay outbox events.
 * Body: `{ action: "rebuild" | "replay", since?: string, limit?: number }`
 */
export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

    await assertAdminTourAccess({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === "string" ? body.action : "rebuild"
    const correlationId =
      request.headers.get("x-correlation-id") ||
      (typeof body?.correlationId === "string" ? body.correlationId : admin.correlationId)

    if (action === "replay") {
      const result = await replayTourCommandCenterProjectionFromOutbox({
        supabase,
        orgId: admin.orgId,
        tourId,
        capabilities: admin.capabilities,
        since: typeof body?.since === "string" ? body.since : null,
        limit: typeof body?.limit === "number" ? body.limit : 100,
      })
      return NextResponse.json({ success: true, action: "replay", result })
    }

    const rebuilt = await rebuildTourCommandCenterProjection({
      supabase,
      orgId: admin.orgId,
      tourId,
      capabilities: admin.capabilities,
      correlationId,
    })

    return NextResponse.json({
      success: true,
      action: "rebuild",
      revision: rebuilt.revision,
      rebuiltAt: rebuilt.rebuiltAt,
      contract: rebuilt.contract,
    })
  } catch (error: unknown) {
    const resolved = adminAccessErrorResponse(error, "Failed to update projection", 500)
    return NextResponse.json({ success: false, error: resolved.message }, { status: resolved.status })
  }
})
