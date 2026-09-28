import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * FIN-501 / FIN-504 — Budget versions, lines, and rollup.
 * Lists budget versions with their lines and commitment/actuals rollup.
 */
export const GET = withAdminCapability(
  "finance.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")

      let query = supabase
        .from("budget_versions")
        .select("id, org_id, tour_id, event_id, version_type, label, status, approved_by, approved_at, created_at, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (tourId) query = query.eq("tour_id", tourId)
      if (eventId) query = query.eq("event_id", eventId)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, versions: [], unavailable: true, unavailableReason: "Budget versions table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const versions = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          versionType: String(r.version_type ?? "baseline"),
          label: r.label ? String(r.label) : null,
          status: String(r.status ?? "draft"),
          approvedBy: r.approved_by ? String(r.approved_by) : null,
          approvedAt: r.approved_at ? String(r.approved_at) : null,
          createdAt: String(r.created_at ?? ""),
          updatedAt: String(r.updated_at ?? ""),
        }
      })

      return NextResponse.json({ success: true, versions, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, versions: [], unavailable: true, unavailableReason: "Budget versions table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Budget workspace unavailable" }, { status: 503 })
    }
  },
)
