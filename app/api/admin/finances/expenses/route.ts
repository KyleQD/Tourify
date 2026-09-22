import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * FIN-508 / FIN-509 / FIN-510 — Expenses, cash advances, and per diem.
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
        .from("expense_reports")
        .select("id, org_id, tour_id, event_id, submitter_id, description, status, total_amount_minor, currency, approved_by, approved_at, submitted_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (tourId) query = query.eq("tour_id", tourId)
      if (eventId) query = query.eq("event_id", eventId)
      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, expenses: [], unavailable: true, unavailableReason: "Expense reports table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const expenses = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          submitterId: r.submitter_id ? String(r.submitter_id) : null,
          description: r.description ? String(r.description) : null,
          status: String(r.status ?? "draft"),
          totalAmountMinor: Number(r.total_amount_minor ?? 0),
          currency: String(r.currency ?? "USD"),
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          submittedAt: r.submitted_at ? String(r.submitted_at) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const summary = {
        total: expenses.length,
        draft: expenses.filter((e) => e.status === "draft").length,
        submitted: expenses.filter((e) => e.status === "submitted").length,
        approved: expenses.filter((e) => e.status === "approved").length,
        rejected: expenses.filter((e) => e.status === "rejected").length,
        totalAmountMinor: expenses.reduce((s, e) => s + e.totalAmountMinor, 0),
        currency: expenses[0]?.currency ?? "USD",
      }

      return NextResponse.json({ success: true, expenses, summary, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, expenses: [], unavailable: true, unavailableReason: "Expense reports table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Expenses unavailable" }, { status: 503 })
    }
  },
)
