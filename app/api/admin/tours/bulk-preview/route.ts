import { NextRequest, NextResponse } from "next/server"

import {
  getTourBulkCommandErrorStatus,
  previewTourBulkCommand,
} from "@/lib/admin/tour-bulk-command.service"
import { TourBulkCommandError } from "@/lib/admin/tour-bulk-command"
import { withAdminCapability } from "@/lib/auth/api-auth"

/**
 * TOUR-210 — Bulk command preview (eligible / ineligible before confirmation).
 * Idempotency not required for preview.
 */
export const POST = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => null)
    const preview = await previewTourBulkCommand({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      input: body,
    })
    const response = NextResponse.json({
      success: true,
      preview,
      orgId: admin.orgId,
    })
    response.headers.set("x-correlation-id", admin.correlationId)
    return response
  } catch (error: unknown) {
    if (error instanceof TourBulkCommandError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const status = getTourBulkCommandErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Bulk preview failed"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
