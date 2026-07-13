import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { withAdminAuth } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.publishTour({
      supabase,
      userId: user.id,
      tourId,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to publish tour" }, { status })
  }
})
