import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("workforce.manage", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId

  // ── Active onboarding template ───────────────────────────────────────────
  const onboardingTemplate = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("hiring_onboarding_templates")
      .select("id, name, version, status, updated_at, item_count")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? null
  })

  // ── Identity conversion pipeline ────────────────────────────────────────
  const conversionPipeline = await safeCatch(async () => {
    const { data: pending, error: pError } = await supabase
      .from("hiring_identity_conversions")
      .select("id, status, updated_at")
      .eq("org_id", orgId)
      .in("status", ["pending", "in_progress"])
    if (pError?.code === "42P01") return null
    if (pError) throw pError

    const { data: failed, error: fError } = await supabase
      .from("hiring_identity_conversions")
      .select("id")
      .eq("org_id", orgId)
      .eq("status", "failed")
    if (fError) throw fError

    const lastConversion = (pending ?? []).sort((a: { updated_at: string }, b: { updated_at: string }) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0] ?? null

    return {
      pendingCount: (pending ?? []).length,
      failedCount: (failed ?? []).length,
      lastUpdatedAt: lastConversion?.updated_at ?? null,
    }
  })

  // ── Credential requirements (expiring within 30 days) ───────────────────
  const credentialAlerts = await safeCatch(async () => {
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from("worker_credentials")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .lte("expires_at", thirtyDaysOut)
      .gte("expires_at", new Date().toISOString())
      .eq("status", "active")
    if (error?.code === "42P01") return null
    if (error) throw error
    return { expiringCount: count ?? 0 }
  })

  return NextResponse.json({
    success: true,
    orgId,
    onboardingTemplate,
    conversionPipeline,
    credentialAlerts,
    freshAt: new Date().toISOString(),
  })
})
