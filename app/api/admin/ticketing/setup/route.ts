import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TIX-501 — Ticketing setup and availability preview.
 */
export const GET = withAdminCapability(
  "ticketing.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const eventId = request.nextUrl.searchParams.get("event_id")

      let query = supabase
        .from("event_ticketing_configs")
        .select("id, event_id, org_id, capacity_source, total_capacity, currency, sales_open_at, sales_close_at, is_ticketed, ticket_types, tax_fee_policies, created_at, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (eventId) query = query.eq("event_id", eventId)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true, configs: [], unavailable: true,
            unavailableReason: "Ticketing config table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const configs = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), eventId: String(r.event_id ?? ""),
          orgId: String(r.org_id),
          capacitySource: String(r.capacity_source ?? "manual"),
          totalCapacity: Number(r.total_capacity ?? 0),
          currency: String(r.currency ?? "USD"),
          salesOpenAt: r.sales_open_at ? String(r.sales_open_at) : null,
          salesCloseAt: r.sales_close_at ? String(r.sales_close_at) : null,
          isTicketed: Boolean(r.is_ticketed),
          ticketTypes: Array.isArray(r.ticket_types) ? r.ticket_types : [],
          taxFeePolicies: Array.isArray(r.tax_fee_policies) ? r.tax_fee_policies : [],
        }
      })

      return NextResponse.json({ success: true, configs, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, configs: [], unavailable: true, unavailableReason: "Ticketing config not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Ticketing setup unavailable" }, { status: 503 })
    }
  },
)
