import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { withCorrelationHeaders } from "@/lib/auth/org-command"

export const dynamic = "force-dynamic"

/**
 * SEC-602, SEC-604 — Security tab summary for the org profile.
 * Requires `audit.view` OR `org.roles.manage`.
 * Each sub-query is wrapped in try/catch; missing tables (42P01) return null counts.
 */
export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  const hasCapability =
    hasAdminCapability(admin.capabilities, "audit.view") ||
    hasAdminCapability(admin.capabilities, "org.roles.manage")

  if (!hasCapability) {
    return withCorrelationHeaders(
      NextResponse.json(
        { error: "This action requires audit.view or org.roles.manage.", code: "capability_denied" },
        { status: 403 },
      ),
      admin.correlationId,
    )
  }

  const { supabase } = auth
  const orgId = admin.orgId
  const freshAt = new Date().toISOString()

  // ─── member count ──────────────────────────────────────────────────────────
  let memberCount: number | null = null
  try {
    const { count, error } = await supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
    if (!error) memberCount = count ?? null
  } catch {
    // ignore
  }

  // ─── custom role count (rbac_roles scoped to org — not system roles) ───────
  let roleCount: number | null = null
  try {
    const { count, error } = await supabase
      .from("rbac_roles")
      .select("*", { count: "exact", head: true })
      .eq("is_system", false)
    if (!error) roleCount = count ?? null
  } catch {
    // ignore
  }

  // ─── entity grants + expiring-soon ────────────────────────────────────────
  let grantCount: number | null = null
  let expiringGrantCount: number | null = null
  try {
    const { count: total, error: ge } = await supabase
      .from("entity_grants")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
    if (!ge) grantCount = total ?? null

    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: expiring, error: ee } = await supabase
      .from("entity_grants")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .lte("end_at", soon)
    if (!ee) expiringGrantCount = expiring ?? null
  } catch {
    // ignore
  }

  // ─── open access reviews ───────────────────────────────────────────────────
  let openReviewCount: number | null = null
  try {
    const { count, error } = await supabase
      .from("access_review_items")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "open")
    if (!error) openReviewCount = count ?? null
  } catch {
    // ignore
  }

  // ─── auth denials (24h) — may not exist ───────────────────────────────────
  let deniedLast24h: number | null = null
  let denialUnavailable = false
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from("security_audit_events")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("result", "denied")
      .gte("created_at", since)

    if (error) {
      if (error.code === "42P01") {
        denialUnavailable = true
      }
    } else {
      deniedLast24h = count ?? null
    }
  } catch {
    denialUnavailable = true
  }

  const body = {
    success: true,
    orgId,
    memberCount,
    roleCount,
    grantCount,
    expiringGrantCount,
    openReviewCount,
    deniedLast24h,
    denialUnavailable,
    freshAt,
  }

  return withCorrelationHeaders(NextResponse.json(body), admin.correlationId)
})
