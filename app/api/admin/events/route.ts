import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const events = await AdminTourEventOperationsService.listEvents({
      supabase,
      userId: user.id,
      orgId: searchParams.get("org_id"),
      status: searchParams.get("status"),
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

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json().catch(() => null)
    const event = await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: user.id,
      input: body,
    })

    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Events API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create event" }, { status })
  }
})
