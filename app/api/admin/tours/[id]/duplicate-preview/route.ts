import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  TOUR_DUPLICATE_DOMAINS,
  createTourDuplicatePreview,
} from "@/lib/admin/tour-duplicate-preview"
import { withAdminCapability } from "@/lib/auth/api-auth"

const selectionSchema = z.object(
  Object.fromEntries(TOUR_DUPLICATE_DOMAINS.map((domain) => [domain, z.boolean().optional()])),
).partial()

const bodySchema = z.object({
  selection: selectionSchema.optional(),
  proposedName: z.string().trim().min(1).max(200).optional(),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * TOUR-205 — Deep-duplicate preview (selectable clone plan).
 * Does not mutate; execution is TOUR-206.
 */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId)
        return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

      const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.flatten() },
          { status: 400 },
        )
      }

      const tour = await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
      })

      const preview = await createTourDuplicatePreview({
        supabase,
        tourId,
        orgId: admin.orgId,
        tour: tour as Record<string, unknown>,
        selection: parsed.data.selection,
        proposedName: parsed.data.proposedName,
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
      const resolved = adminAccessErrorResponse(error, "Failed to build duplicate preview", 500)
      return NextResponse.json(
        { success: false, error: resolved.message },
        { status: resolved.status },
      )
    }
  },
)
