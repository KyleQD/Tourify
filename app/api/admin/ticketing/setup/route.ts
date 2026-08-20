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
        .from("event_ticketing_config")
        .select("id, event_id, org_id, capacity, currency, sale_start, sale_end, ticketing_enabled, terms_text, refund_policy, transfer_policy, tax_enabled, tax_rate, created_at, updated_at")
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
          capacitySource: "event_ticketing_config",
          totalCapacity: Number(r.capacity ?? 0),
          currency: String(r.currency ?? "USD"),
          salesOpenAt: r.sale_start ? String(r.sale_start) : null,
          salesCloseAt: r.sale_end ? String(r.sale_end) : null,
          isTicketed: Boolean(r.ticketing_enabled),
          ticketTypes: [],
          taxFeePolicies: [{
            taxEnabled: Boolean(r.tax_enabled),
            taxRate: Number(r.tax_rate ?? 0),
          }],
          termsPresent: typeof r.terms_text === "string" && r.terms_text.trim().length > 0,
          refundPolicy: typeof r.refund_policy === "string" ? r.refund_policy : null,
          transferPolicy: typeof r.transfer_policy === "string" ? r.transfer_policy : null,
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
