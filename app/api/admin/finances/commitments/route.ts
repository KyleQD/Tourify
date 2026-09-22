import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * FIN-505 / FIN-506 — Commitments, POs, and procurement.
 */
export const GET = withAdminCapability(
  "finance.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")
      const status = searchParams.get("status")

      let query = supabase
        .from("purchase_orders")
        .select("id, org_id, tour_id, event_id, po_number, vendor_name, status, amount_minor, currency, description, approved_by, approved_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (tourId) query = query.eq("tour_id", tourId)
      if (eventId) query = query.eq("event_id", eventId)
      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, orders: [], unavailable: true, unavailableReason: "Purchase orders table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const orders = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          poNumber: r.po_number ? String(r.po_number) : null,
          vendorName: r.vendor_name ? String(r.vendor_name) : null,
          status: String(r.status ?? "draft"),
          amountMinor: Number(r.amount_minor ?? 0),
          currency: String(r.currency ?? "USD"),
          description: r.description ? String(r.description) : null,
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          approvedAt: r.approved_at ? String(r.approved_at) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const summary = {
        total: orders.length,
        draft: orders.filter((o) => o.status === "draft").length,
        approved: orders.filter((o) => o.status === "approved").length,
        fulfilled: orders.filter((o) => o.status === "fulfilled").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        totalAmountMinor: orders.reduce((s, o) => s + o.amountMinor, 0),
        currency: orders[0]?.currency ?? "USD",
      }

      return NextResponse.json({ success: true, orders, summary, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, orders: [], unavailable: true, unavailableReason: "Purchase orders table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Commitments unavailable" }, { status: 503 })
    }
  },
)
