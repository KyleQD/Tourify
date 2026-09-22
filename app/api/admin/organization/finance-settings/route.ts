import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("finance.view", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const canApprove = admin.capabilities.includes("finance.approve" as never)
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // ── Approval policies ────────────────────────────────────────────────────
  const approvalPolicies = await safeCatch(async () => {
    if (!canApprove) return null
    const { data, error } = await supabase
      .from("finance_approval_policies")
      .select("id, action_type, amount_threshold, required_approvers, separation_of_duties, is_active")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("action_type")
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? []
  })

  // ── FX rate config ───────────────────────────────────────────────────────
  const fxConfig = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("finance_fx_configs")
      .select("id, rate_source, base_currency, reporting_currency, last_updated_at")
      .eq("org_id", orgId)
      .order("last_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? null
  })

  // ── Reconciliation health ────────────────────────────────────────────────
  const unmatchedInvoiceCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("finance_invoices")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "unmatched")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  const unsettledShowCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("tours")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "completed")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  const failedExportCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("finance_export_jobs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "failed")
      .gte("created_at", oneDayAgo)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  return NextResponse.json({
    success: true,
    orgId,
    approvalPolicies,
    fxConfig,
    reconciliation: {
      unmatchedInvoiceCount,
      unsettledShowCount,
      failedExportCount,
    },
    freshAt: new Date().toISOString(),
  })
})
