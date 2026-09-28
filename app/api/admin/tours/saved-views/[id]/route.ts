import { NextRequest, NextResponse } from "next/server"

import { TourSavedViewError } from "@/lib/admin/tour-saved-view"
import {
  deleteTourSavedView,
  updateTourSavedView,
} from "@/lib/admin/tour-saved-views.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractViewId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("saved-views")
  return index >= 0 ? segments[index + 1] || null : null
}

export const PATCH = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const viewId = extractViewId(request.url)
    if (!viewId) return NextResponse.json({ success: false, error: "view id required" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const view = await updateTourSavedView({
      supabase,
      orgId: admin.orgId,
      userId: user.id,
      viewId,
      name: body?.name,
      scope: body?.scope,
      filters: body?.filters,
      columns: body?.columns,
      is_default: body?.is_default,
    })
    return NextResponse.json({ success: true, view })
  } catch (error: unknown) {
    if (error instanceof TourSavedViewError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to update saved view"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

export const DELETE = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const viewId = extractViewId(request.url)
    if (!viewId) return NextResponse.json({ success: false, error: "view id required" }, { status: 400 })

    await deleteTourSavedView({
      supabase,
      orgId: admin.orgId,
      userId: user.id,
      viewId,
    })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof TourSavedViewError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to delete saved view"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
