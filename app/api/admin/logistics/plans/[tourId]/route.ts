import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { requireLogisticsPlanAccess } from "@/lib/logistics/authorization"
import { getLogisticsPlanSummary } from "@/lib/logistics/plans"

function tourIdFromRequest(request: NextRequest) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean)
  return segments.at(-1) || null
}

export const GET = withAdminCapability("logistics.view", async (request: NextRequest, { supabase, user, admin }) => {
  const tourId = tourIdFromRequest(request)
  if (!tourId) return NextResponse.json({ error: "Tour is required.", code: "validation_failed" }, { status: 422 })
  try {
    await requireLogisticsPlanAccess({ supabase, userId: user.id, orgId: admin.orgId, tourId })
    const plan = await getLogisticsPlanSummary({ supabase, userId: user.id, orgId: admin.orgId, tourId })
    return NextResponse.json({ plan })
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error
      ? Number((error as { status?: number }).status) || 500
      : 500
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "logistics_plan_unavailable"
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load logistics plan.", code }, { status })
  }
})
