import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { withAdminAuth } from "@/lib/auth/api-auth"
import { requireOpsOrgId, resolveAdminWorkspaceScope } from "@/lib/admin/workspace-scope"

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const scope = await resolveAdminWorkspaceScope(request, { supabase, user })
    if (scope instanceof NextResponse) return scope
    const orgId = requireOpsOrgId(scope)
    if (orgId instanceof NextResponse) return orgId
    const tours = await AdminTourEventOperationsService.listTours({
      supabase,
      userId: user.id,
      orgId,
      status: searchParams.get("status"),
    })
    return NextResponse.json({ success: true, tours })
  } catch (error: any) {
    const code = error?.code || error?.details?.code
    if (code === "42P01" || code === "PGRST204" || code === "PGRST205") {
      return NextResponse.json({ success: true, tours: [] })
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Tours API] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load tours", tours: [] },
      { status },
    )
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const scope = await resolveAdminWorkspaceScope(request, { supabase, user })
    if (scope instanceof NextResponse) return scope
    const orgId = requireOpsOrgId(scope)
    if (orgId instanceof NextResponse) return orgId
    const body = await request.json().catch(() => null)
    const tour = await AdminTourEventOperationsService.createTour({
      supabase,
      userId: user.id,
      input: body,
      orgId,
    })
    return NextResponse.json({ success: true, tour }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Tours API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create tour" }, { status })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const tourId = body.id || body.tour_id
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: user.id,
      tourId,
      input: body,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to update tour" }, { status })
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const tourId = url.searchParams.get("id") || url.searchParams.get("tour_id") || body.id || body.tour_id
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.deleteTour({
      supabase,
      userId: user.id,
      tourId,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to delete tour" }, { status })
  }
})
