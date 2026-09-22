import { NextRequest, NextResponse } from "next/server"

import {
  DASHBOARD_DOMAIN_DEFINITIONS,
  deniedDashboardDomain,
  resolvedDashboardDomain,
  unavailableDashboardDomain,
  type AdminDashboardCommandCenter,
  type AdminDashboardDomainId,
} from "@/lib/admin/dashboard-command-center"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { withAdminAuth } from "@/lib/auth/api-auth"

interface CountResult {
  count: number | null
  error?: unknown
}

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  const asOf = new Date().toISOString()
  const queries: Partial<Record<AdminDashboardDomainId, PromiseLike<CountResult>>> = {
    tours: auth.supabase.from("tours").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId),
    events: auth.supabase.from("events_v2").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId),
    workforce: auth.supabase.from("staff_members").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId),
    logistics: auth.supabase.from("logistics_tasks").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId).neq("status", "completed"),
    finance: auth.supabase.from("financial_transactions").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId),
    publication: auth.supabase.from("admin_publication_outbox").select("id", { count: "exact", head: true }).eq("org_id", admin.orgId).in("status", ["pending", "processing", "failed"]),
    audit: auth.supabase.from("security_audit_events").select("id", { count: "exact", head: true }).eq("acting_org_id", admin.orgId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  }

  const domains = await Promise.all(DASHBOARD_DOMAIN_DEFINITIONS.map(async (definition) => {
    if (!hasAdminCapability(admin.capabilities, definition.capability)) {
      return deniedDashboardDomain(definition, asOf)
    }

    const query = queries[definition.id]
    if (!query) {
      return unavailableDashboardDomain(
        definition,
        asOf,
        "Canonical persistence is not deployed for this workspace yet.",
      )
    }

    try {
      const result = await query
      if (result.error) return unavailableDashboardDomain(definition, asOf)
      return resolvedDashboardDomain(definition, asOf, result.count ?? 0)
    } catch {
      return unavailableDashboardDomain(definition, asOf)
    }
  }))

  const payload: AdminDashboardCommandCenter = {
    generatedAt: asOf,
    degraded: domains.some((domain) => domain.status === "unavailable" || domain.status === "stale"),
    domains,
  }
  const response = NextResponse.json({ success: true, commandCenter: payload })
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("x-correlation-id", admin.correlationId)
  return response
})
