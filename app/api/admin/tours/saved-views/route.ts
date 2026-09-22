import { NextRequest, NextResponse } from "next/server"

import { TourSavedViewError } from "@/lib/admin/tour-saved-view"
import {
  createTourSavedView,
  listTourSavedViews,
} from "@/lib/admin/tour-saved-views.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

export const GET = withAdminCapability("tour.view", async (_request, { supabase, user, admin }) => {
  try {
    const views = await listTourSavedViews({
      supabase,
      orgId: admin.orgId,
      userId: user.id,
    })
    return NextResponse.json({ success: true, views })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load saved views"
    return NextResponse.json({ success: false, error: message, views: [] }, { status: 500 })
  }
})

export const POST = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => null)
    const view = await createTourSavedView({
      supabase,
      orgId: admin.orgId,
      userId: user.id,
      name: body?.name,
      scope: body?.scope,
      filters: body?.filters,
      columns: body?.columns,
      is_default: body?.is_default,
    })
    return NextResponse.json({ success: true, view }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof TourSavedViewError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to create saved view"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
