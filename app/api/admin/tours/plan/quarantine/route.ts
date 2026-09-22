import { NextRequest, NextResponse } from "next/server"

import { listOpenTourPlanQuarantine } from "@/lib/admin/tour-plan-normalize.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

/**
 * PLAN-201 — List open plan backfill conflicts for org review.
 */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = searchParams.get("limit")
    const limit = limitRaw ? Number(limitRaw) : 100
    const items = await listOpenTourPlanQuarantine({
      supabase,
      orgId: admin.orgId,
      limit: Number.isFinite(limit) ? limit : 100,
    })
    return NextResponse.json({
      success: true,
      orgId: admin.orgId,
      count: items.length,
      items,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load plan quarantine"
    return NextResponse.json({ success: false, error: message, items: [] }, { status: 500 })
  }
})
