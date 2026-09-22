import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export const GET = withAdminCapability("tour.view", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const now = new Date()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // ── Tour lifecycle counts ────────────────────────────────────────────────
  const STATUSES = ["draft", "planning", "ready", "published", "active", "completed", "settled", "cancelled", "archived"] as const

  const lifecycleCounts: Record<string, number | null> = {}
  let lifecycleUnavailable = false

  try {
    const { data, error } = await supabase
      .from("tours")
      .select("status")
      .eq("org_id", orgId)

    if (error) {
      if (error.code === "42P01") {
        lifecycleUnavailable = true
      } else {
        throw error
      }
    } else {
      for (const s of STATUSES) {
        lifecycleCounts[s] = (data ?? []).filter((r: { status: string }) => r.status === s).length
      }
    }
  } catch {
    lifecycleUnavailable = true
  }

  // ── Health signals ───────────────────────────────────────────────────────

  // Route conflicts (tour_route_legs with conflict_type not null)
  const routeConflictCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tour_route_legs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("conflict_type", "is", null)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // Missing travel/lodging — try tour_route_legs without travel segment
  const missingTravelCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tour_route_legs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("travel_assigned", false)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // Uncovered critical staffing (open_roles / staffing_requirements tables)
  const uncoveredStaffingCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tour_staffing_requirements")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_critical", true)
      .eq("filled", false)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // Overdue advance sections
  const overdueAdvanceCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("advance_sections")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "overdue")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // Contract risk (contracts expiring within 30d or with risk flags)
  const contractRiskCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("org_contracts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .lte("expires_at", thirtyDaysOut)
      .eq("status", "active")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // Budget variance (finance-gated)
  const budgetVarianceCount = await safeCatch(async () => {
    const hasFin = admin.capabilities.includes("finance.view" as never)
    if (!hasFin) return null
    const { count, error } = await supabase
      .from("tour_budgets")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("variance_exceeded", true)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  return NextResponse.json({
    success: true,
    orgId,
    lifecycle: lifecycleUnavailable
      ? null
      : { ...lifecycleCounts },
    lifecycleUnavailable,
    signals: {
      routeConflicts: routeConflictCount,
      missingTravel: missingTravelCount,
      uncoveredStaffing: uncoveredStaffingCount,
      overdueAdvances: overdueAdvanceCount,
      contractRisk: contractRiskCount,
      budgetVariance: budgetVarianceCount,
    },
    freshAt: new Date().toISOString(),
  })
})
