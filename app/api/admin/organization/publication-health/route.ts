import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

async function safeCatch<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn() } catch { return null }
}

export const GET = withAdminCapability("tour.publish", async (_request: NextRequest, { supabase, admin }) => {
  const orgId = admin.orgId
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // ── Outbox: queue depth and oldest pending item ──────────────────────────
  const queueData = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("admin_publication_outbox")
      .select("id, created_at, status")
      .eq("org_id", orgId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true })
    if (error?.code === "42P01") return null
    if (error) throw error
    const depth = (data ?? []).length
    const oldestAt = data?.[0]?.created_at ?? null
    const failedCount = (data ?? []).filter((r: { status: string }) => r.status === "processing").length
    return { depth, oldestAt, failedCount }
  })

  // ── Failed delivery count (last 24h) ────────────────────────────────────
  const failedLast24h = await safeCatch(async () => {
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

  // ── Dead-letter items ────────────────────────────────────────────────────
  const deadLetterCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("admin_publication_outbox")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "dead")
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // ── Delivery success rate (7-day rolling) ────────────────────────────────
  const successRate = await safeCatch(async () => {
    const { data, error } = await supabase
      .from("admin_publication_outbox")
      .select("status")
      .eq("org_id", orgId)
      .gte("updated_at", sevenDaysAgo)
      .in("status", ["delivered", "failed", "dead"])
    if (error?.code === "42P01") return null
    if (error) throw error
    const rows = data ?? []
    if (rows.length === 0) return null
    const delivered = rows.filter((r: { status: string }) => r.status === "delivered").length
    return Math.round((delivered / rows.length) * 100)
  })

  // ── Share tokens expiring in 7 days ─────────────────────────────────────
  const expiringTokenCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("admin_publication_share_tokens")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .lte("expires_at", sevenDaysOut)
      .gte("expires_at", now.toISOString())
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  // ── Unacknowledged publications ──────────────────────────────────────────
  const unackedCount = await safeCatch(async () => {
    const { count, error } = await supabase
      .from("admin_publication_acknowledgements")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("acknowledged", false)
    if (error?.code === "42P01") return null
    if (error) throw error
    return count ?? 0
  })

  return NextResponse.json({
    success: true,
    orgId,
    queue: queueData,
    failedLast24h,
    deadLetterCount,
    successRatePct: successRate,
    expiringTokenCount,
    unacknowledgedCount: unackedCount,
    freshAt: new Date().toISOString(),
  })
})
