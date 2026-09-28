import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { createTourArchivePreview } from "@/lib/admin/tour-archive-preview"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * TOUR-207 — Archive impact preview (shares, jobs, upcoming work, preserved records).
 */
export const POST = withAdminCapability(
  "tour.archive",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId)
        return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

      const tour = await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
      })

      const preview = await createTourArchivePreview({
        supabase,
        tourId,
        orgId: admin.orgId,
        tour: tour as Record<string, unknown>,
      })

      const response = NextResponse.json({
        success: true,
        preview,
        meta: {
          tourId,
          orgId: admin.orgId,
          correlationId: admin.correlationId,
        },
      })
      response.headers.set("x-correlation-id", admin.correlationId)
      return response
    } catch (error: unknown) {
      const resolved = adminAccessErrorResponse(error, "Failed to build archive preview", 500)
      return NextResponse.json(
        { success: false, error: resolved.message },
        { status: resolved.status },
      )
    }
  },
)
