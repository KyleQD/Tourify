import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { requireLogisticsPlanAccess } from "@/lib/logistics/authorization"

export const GET = withAdminCapability("logistics.view", async (_request: NextRequest, { supabase, user, admin }) => {
  try {
    await requireLogisticsPlanAccess({ supabase, userId: user.id, orgId: admin.orgId })
    const { data, error } = await supabase
      .from("tours")
      .select("id, name, start_date, end_date, plan_version, status")
      .eq("org_id", admin.orgId)
      .order("start_date", { ascending: true, nullsFirst: false })
    if (error) throw error
    return NextResponse.json({
      orgId: admin.orgId,
      plans: (data || []).map((tour: any) => ({
        tourId: String(tour.id),
        name: String(tour.name || "Untitled tour"),
        startDate: tour.start_date || null,
        endDate: tour.end_date || null,
        tourPlanVersion: Number(tour.plan_version || 1),
        status: tour.status || null,
      })),
    })
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error
      ? Number((error as { status?: number }).status) || 500
      : 500
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "logistics_plans_unavailable"
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load logistics plans.", code }, { status })
  }
})
