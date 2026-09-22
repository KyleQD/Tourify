import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TIX-504 — Comp/guest request, approval, issuance.
 */
export const GET = withAdminCapability(
  "ticketing.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const eventId = searchParams.get("event_id")
      const status = searchParams.get("status")

      let query = supabase
        .from("comp_requests")
        .select("id, org_id, event_id, requester_id, recipient_name, recipient_email, quantity, reason, status, approved_by, approved_at, denied_reason, issued_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (eventId) query = query.eq("event_id", eventId)
      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, requests: [], unavailable: true, unavailableReason: "Comp requests table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const requests = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), eventId: String(r.event_id ?? ""),
          orgId: String(r.org_id),
          requesterId: r.requester_id ? String(r.requester_id) : null,
          recipientName: String(r.recipient_name ?? ""),
          recipientEmail: r.recipient_email ? String(r.recipient_email) : null,
          quantity: Number(r.quantity ?? 1),
          reason: r.reason ? String(r.reason) : null,
          status: String(r.status ?? "pending"),
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          approvedAt: r.approved_at ? String(r.approved_at) : null,
          deniedReason: r.denied_reason ? String(r.denied_reason) : null,
          issuedAt: r.issued_at ? String(r.issued_at) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const summary = {
        total: requests.length,
        pending: requests.filter((r) => r.status === "pending").length,
        approved: requests.filter((r) => r.status === "approved").length,
        issued: requests.filter((r) => r.status === "issued").length,
        denied: requests.filter((r) => r.status === "denied").length,
      }

      return NextResponse.json({ success: true, requests, summary, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, requests: [], unavailable: true, unavailableReason: "Comp requests table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Comp requests unavailable" }, { status: 503 })
    }
  },
)
