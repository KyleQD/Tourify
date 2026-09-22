import { NextRequest, NextResponse } from "next/server"

import { provisionEventOperations } from "@/lib/admin/event-ops-provision"
import { getAdminTourEventErrorStatus } from "@/lib/admin/tour-event-operations.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PLAN-105 — explicit reviewed staff-shift + ticket inventory provisioning. */
export const POST = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const eventId = extractEventId(request.url)
      if (!eventId) return NextResponse.json({ success: false, error: "Missing event id" }, { status: 400 })
      if (!admin.orgId) {
        return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
      }

      const body = await request.json().catch(() => null)
      const result = await provisionEventOperations({
        supabase,
        userId: user.id,
        orgId: admin.orgId,
        eventId,
        input: body,
      })

      return NextResponse.json({
        success: result.failures.length === 0,
        result,
        changes: result.changes,
        failures: result.failures,
        setupChecklist: result.setupChecklist,
        message:
          result.failures.length > 0
            ? `Provisioned with ${result.failures.length} failure(s); ${result.changes.filter((c) => c.action === "created").length} created.`
            : `Provisioned ${result.staffShiftsCreated.length} shift(s) and ${result.ticketTypesCreated.length} ticket type(s).`,
      })
    } catch (error: unknown) {
      const status = getAdminTourEventErrorStatus(error, 400)
      const message = error instanceof Error ? error.message : "Provisioning failed"
      return NextResponse.json({ success: false, error: message, failures: [], changes: [] }, { status })
    }
  })
