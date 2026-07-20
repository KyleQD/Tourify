import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourPublishReadinessError,
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { logAuditEvent } from "@/lib/audit"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.publishTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: "publish",
      entityType: "tour",
      entityId: tourId,
      newValues: { status: "active", event_count: (tour as any).events?.length || 0 },
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    if (error instanceof AdminTourPublishReadinessError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "tour_not_ready",
          readiness: error.readiness,
        },
        { status: error.status },
      )
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to publish tour" }, { status })
  }
})
