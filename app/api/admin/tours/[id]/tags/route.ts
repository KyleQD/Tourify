import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { replaceTourTags } from "@/lib/admin/tour-tags.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const putSchema = z.object({
  tag_ids: z.array(z.string().uuid()),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const PUT = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "tour id required" }, { status: 400 })

    const parsed = putSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    // Ensure actor can access the tour in the acting org.
    await AdminTourEventOperationsService.getTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    const tags = await replaceTourTags({
      supabase,
      tourId,
      orgId: admin.orgId,
      userId: user.id,
      tagIds: parsed.data.tag_ids,
    })
    return NextResponse.json({ success: true, tags })
  } catch (error: unknown) {
    const status = getAdminTourEventErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to update tour tags"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
