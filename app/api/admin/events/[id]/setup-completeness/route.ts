import { NextRequest, NextResponse } from "next/server"

import { evaluateEventSetupCompleteness } from "@/lib/admin/event-setup-completeness.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("events")
  return index >= 0 ? segments[index + 1] || null : null
}

/** EVENT-202 — Live setup completeness with owners and direct actions. */
export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractEventId(request.url)
    if (!eventId) return NextResponse.json({ success: false, error: "event id required" }, { status: 400 })

    const completeness = await evaluateEventSetupCompleteness({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    return NextResponse.json({ success: true, completeness })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Setup completeness failed"
    const status = message === "Event not found." ? 404 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
