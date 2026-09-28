import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TIX-503 — Allocation matrix: tour/stop allocation and deadline management.
 */
export const GET = withAdminCapability(
  "ticketing.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const eventId = searchParams.get("event_id")
      const tourId = searchParams.get("tour_id")

      let query = supabase
        .from("ticket_allocations")
        .select("id, org_id, event_id, tour_id, allocation_type, recipient_type, recipient_id, quantity_allocated, quantity_used, expires_at, status, notes, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100)

      if (eventId) query = query.eq("event_id", eventId)
      if (tourId) query = query.eq("tour_id", tourId)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, allocations: [], unavailable: true, unavailableReason: "Allocations table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const allocations = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), eventId: String(r.event_id ?? ""),
          orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          allocationType: String(r.allocation_type ?? "comp"),
          recipientType: String(r.recipient_type ?? "person"),
          recipientId: r.recipient_id ? String(r.recipient_id) : null,
          quantityAllocated: Number(r.quantity_allocated ?? 0),
          quantityUsed: Number(r.quantity_used ?? 0),
          expiresAt: r.expires_at ? String(r.expires_at) : null,
          status: String(r.status ?? "active"),
          notes: r.notes ? String(r.notes) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const atRisk = allocations.filter((a) => {
        if (!a.expiresAt) return false
        const hoursUntilExpiry = (new Date(a.expiresAt).getTime() - Date.now()) / 3600000
        return hoursUntilExpiry < 48 && hoursUntilExpiry > 0 && a.status === "active"
      })

      return NextResponse.json({ success: true, allocations, atRisk: atRisk.length, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, allocations: [], unavailable: true, unavailableReason: "Allocations table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Allocations unavailable" }, { status: 503 })
    }
  },
)
