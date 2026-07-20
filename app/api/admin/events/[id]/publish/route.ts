import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import {
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
    const event = await AdminTourEventOperationsService.publishEvent({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to publish event" }, { status })
  }
})
