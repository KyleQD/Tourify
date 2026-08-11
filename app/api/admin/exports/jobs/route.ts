import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * EXP-601 / EXP-602 — Export jobs: authorized, versioned, auditable async exports.
 */
export const GET = withAdminCapability(
  "content.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)

      const { data, error } = await supabase
        .from("export_jobs")
        .select("id, org_id, export_type, schema_version, status, requested_by, file_url, record_count, created_at, completed_at, error_message")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, jobs: [], unavailable: true, unavailableReason: "Export jobs table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const jobs = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          exportType: String(r.export_type ?? "csv"),
          schemaVersion: r.schema_version ? String(r.schema_version) : null,
          status: String(r.status ?? "pending"),
          requestedBy: r.requested_by ? String(r.requested_by) : null,
          fileUrl: r.file_url ? String(r.file_url) : null,
          recordCount: r.record_count ? Number(r.record_count) : null,
          createdAt: String(r.created_at ?? ""),
          completedAt: r.completed_at ? String(r.completed_at) : null,
          errorMessage: r.error_message ? String(r.error_message) : null,
        }
      })

      return NextResponse.json({ success: true, jobs, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, jobs: [], unavailable: true, unavailableReason: "Export jobs table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Export jobs unavailable" }, { status: 503 })
    }
  },
)
