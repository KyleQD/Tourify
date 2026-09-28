import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("vendor.view", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysOut = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // ── Vendor counts by status ──────────────────────────────────────────────
  const vendorSummary = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("org_vendors")
      .select("status")
      .eq("org_id", orgId)
    if (error?.code === "42P01") return null
    if (error) throw error
    const statuses = ["approved", "preferred", "evaluating", "restricted", "inactive"]
    const counts: Record<string, number> = {}
    for (const s of statuses) {
      counts[s] = (data ?? []).filter((r: { status: string }) => r.status === s).length
    }
    return { total: (data ?? []).length, byStatus: counts }
  })

  // ── Compliance docs expiring within 30 days ──────────────────────────────
  const expiringComplianceDocs = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("vendor_compliance_documents")
      .select("id, vendor_id, doc_type, expires_at, verification_status")
      .eq("org_id", orgId)
      .lte("expires_at", thirtyDaysOut)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at")
      .limit(20)
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? []
  })

  // ── Contracts expiring within 90 days ───────────────────────────────────
  const expiringContracts = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("org_contracts")
      .select("id, title, counterparty_name, expires_at, status")
      .eq("org_id", orgId)
      .lte("expires_at", ninetyDaysOut)
      .gte("expires_at", new Date().toISOString())
      .in("status", ["active", "signed"])
      .order("expires_at")
      .limit(20)
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? []
  })

  // ── Stalled signature envelopes ──────────────────────────────────────────
  const stalledEnvelopeCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("contract_signature_envelopes")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["pending", "sent"])
      .lte("created_at", fourteenDaysAgo)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  return NextResponse.json({
    success: true,
    orgId,
    vendorSummary,
    expiringComplianceDocs,
    expiringContracts,
    stalledEnvelopeCount,
    freshAt: new Date().toISOString(),
  })
})
