import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const { searchParams } = new URL(request.url)
    const events = await AdminTourEventOperationsService.listEvents({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      status: searchParams.get("status"),
      allowedTourIds: admin.scope === "tour_collaborator" ? admin.allowedTourIds : undefined,
    })

    return NextResponse.json({ success: true, events })
  } catch (error: any) {
    const code = error?.code || error?.details?.code
    if (code === "42P01" || code === "PGRST204" || code === "PGRST205") {
      return NextResponse.json({ success: true, events: [] })
    }
    const status = getAdminTourEventErrorStatus(error, 400)
    console.error("[Admin Events API] GET error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to load events", events: [] }, { status })
  }
})

export const POST = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => null)
    const event = await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: user.id,
      input: body,
      orgId: admin.orgId,
    })

    // EVENT-103 — creation returns explicit setup checklist (no invented ops rows).
    return NextResponse.json(
      {
        success: true,
        event,
        setupChecklist: (event as { setup_checklist?: unknown }).setup_checklist ?? null,
      },
      { status: 201 },
    )
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Events API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create event" }, { status })
  }
})
