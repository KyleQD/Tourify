import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { logAuditEvent } from "@/lib/audit"
import {
  AdminEventPublishReadinessError,
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAdminCapability("event.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const overrideFindingIds = Array.isArray(body?.overrideFindingIds)
      ? body.overrideFindingIds.map(String)
      : []
    const overrideReason = typeof body?.overrideReason === "string" ? body.overrideReason.trim() : null

    const event = await AdminTourEventOperationsService.publishEvent({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
      overrideFindingIds,
      overrideReason,
      capabilities: admin.capabilities,
    })

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: "publish",
      entityType: "event",
      entityId: eventId,
      newValues: {
        status: "confirmed",
        readiness_overrides: overrideFindingIds,
        readiness_override_reason: overrideReason,
      },
    })

    return NextResponse.json({ success: true, event })
  } catch (error: unknown) {
    if (error instanceof AdminEventPublishReadinessError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "event_not_ready",
          readiness: error.readiness,
        },
        { status: error.status },
      )
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to publish event"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
