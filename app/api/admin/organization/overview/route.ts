import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("tour.view", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const canFinance = admin.capabilities.includes("finance.view" as never)
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // ── Org identity ─────────────────────────────────────────────────────────
  const orgIdentity = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("organizer_accounts")
      .select("id, organization_name, organization_type, subtype")
      .eq("ops_org_id", orgId)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  })

  // ── Active tours ─────────────────────────────────────────────────────────
  const activeTourCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tours")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["active", "published"])
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // ── Open staffing gaps ────────────────────────────────────────────────────
  const openStaffingCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tour_staffing_requirements")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("filled", false)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // ── Overdue advances ─────────────────────────────────────────────────────
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

  // ── Contracts expiring 30d ────────────────────────────────────────────────
  const expiringContractCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("org_contracts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .lte("expires_at", thirtyDaysOut)
      .gte("expires_at", new Date().toISOString())
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // ── Pending finance approvals (gated) ────────────────────────────────────
  const pendingFinanceCount = canFinance ? await safeCatch(async () => {
    const { count, error } = await supabase
      .from("finance_approval_requests")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "pending")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  }) : undefined

  // ── Publication failures last 24h ────────────────────────────────────────
  const pubFailedCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("admin_publication_outbox")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "failed")
      .gte("updated_at", oneDayAgo)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  return NextResponse.json({
    success: true,
    orgId,
    orgIdentity,
    health: {
      activeTourCount,
      openStaffingCount,
      overdueAdvanceCount,
      expiringContractCount,
      pendingFinanceCount: canFinance ? pendingFinanceCount : undefined,
      pubFailedCount,
    },
    freshAt: new Date().toISOString(),
  })
})
