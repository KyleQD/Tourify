import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("ticketing.view", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // ── Legacy/canonical convergence ────────────────────────────────────────
  const convergence = await safeCatch(async () => {
    const [legacyResult, canonicalResult] = await Promise.all([
      supabase.from("legacy_tickets").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      supabase.from("tickets").select("*", { count: "exact", head: true }).eq("org_id", orgId),
    ])
    if (legacyResult.error?.code === "42P01" || canonicalResult.error?.code === "42P01") return null
    if (legacyResult.error || canonicalResult.error) return null
    const legacy = legacyResult.count ?? 0
    const canonical = canonicalResult.count ?? 0
    const delta = Math.abs(legacy - canonical)
    return { legacy, canonical, delta, clear: delta === 0 }
  })

  // ── Scanner device fleet ─────────────────────────────────────────────────
  const deviceFleet = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("scanner_devices")
      .select("id, status, last_sync_at")
      .eq("org_id", orgId)
    if (error?.code === "42P01") return null
    if (error) throw error
    const rows = data ?? []
    const byStatus = {
      active:  rows.filter((r: { status: string }) => r.status === "active").length,
      revoked: rows.filter((r: { status: string }) => r.status === "revoked").length,
      lost:    rows.filter((r: { status: string }) => r.status === "lost").length,
    }
    const sortedBySync = rows.filter((r: { last_sync_at: string | null }) => r.last_sync_at)
      .sort((a: { last_sync_at: string }, b: { last_sync_at: string }) =>
        new Date(a.last_sync_at).getTime() - new Date(b.last_sync_at).getTime()
      )
    const oldestSyncAt = sortedBySync[0]?.last_sync_at ?? null
    return { byStatus, oldestSyncAt, total: rows.length }
  })

  // ── Provider webhook health ──────────────────────────────────────────────
  const webhookHealth = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("ticketing_provider_webhooks")
      .select("id, provider, status, last_event_at, error_count")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error?.code === "42P01") return null
    if (error) throw error
    return data ?? null
  })

  return NextResponse.json({
    success: true,
    orgId,
    convergence,
    deviceFleet,
    webhookHealth,
    freshAt: new Date().toISOString(),
  })
})
