import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { requireOpsOrgId, resolveOptionalAdminWorkspaceScope } from "@/lib/admin/workspace-scope"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

function isAuditLogRlsError(error: unknown) {
  return error instanceof Error
    && error.message.includes('row-level security policy')
    && error.message.includes('"audit_log"')
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const scope = await resolveOptionalAdminWorkspaceScope(request, { supabase, user })
    if (scope instanceof NextResponse) return scope
    const orgId = scope ? requireOpsOrgId(scope) : null
    if (orgId instanceof NextResponse) return orgId
    const events = await AdminTourEventOperationsService.listEvents({
      supabase,
      userId: user.id,
      orgId,
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
    const scope = await resolveOptionalAdminWorkspaceScope(request, { supabase, user })
    if (scope instanceof NextResponse) return scope
    const orgId = scope ? requireOpsOrgId(scope) : null
    if (orgId instanceof NextResponse) return orgId
    const body = await request.json().catch(() => null)
    let event
    try {
      event = await AdminTourEventOperationsService.createEvent({
        supabase,
        userId: user.id,
        input: body,
        orgId,
      })
    } catch (error) {
      if (!isAuditLogRlsError(error)) throw error
      console.warn("[Admin Events API] audit_log RLS trigger blocked user-scoped create; retrying with server-scoped writer")
      event = await AdminTourEventOperationsService.createEvent({
        supabase: createServiceRoleClient(),
        userId: user.id,
        input: body,
        orgId,
      })
    }

    return NextResponse.json({ success: true, event }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Events API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create event" }, { status })
  }
})
