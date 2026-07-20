import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.getTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 400)
    return NextResponse.json({ success: false, error: error.message || "Failed to load tour" }, { status })
  }
})

export const PATCH = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const tour = await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: user.id,
      tourId,
      input: body,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to update tour" }, { status })
  }
})

export const DELETE = withAdminCapability("tour.delete", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.deleteTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete tour" }, { status })
  }
})
