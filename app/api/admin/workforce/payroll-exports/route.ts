import { NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * WORK-602 — Payroll export batches for the acting org.
 * Lists the last 10 payroll export records with status/approval metadata.
 */
export const GET = withAdminCapability(
  "workforce.manage",
  async (_request, { supabase, admin }) => {
    try {
      const orgId = admin.orgId

      const { data, error } = await supabase
        .from("payroll_exports")
        .select(
          "id, org_id, period, schema_version, status, total_hours, total_cost_minor_units, currency, worker_count, approved_by, approved_at, exported_at, supersedes_export_id, idempotency_key, created_at",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            exports: [],
            unavailable: true,
            unavailableReason: "Payroll exports table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const exports = (data ?? []).map((row: Record<string, unknown>) => ({
        exportId: String(row.id),
        orgId: String(row.org_id),
        period: String(row.period ?? ""),
        schemaVersion: String(row.schema_version ?? "1.0"),
        status: String(row.status ?? "pending") as "pending" | "approved" | "exported" | "superseded",
        totalHours: Number(row.total_hours ?? 0),
        totalCostMinorUnits: Number(row.total_cost_minor_units ?? 0),
        currency: String(row.currency ?? "USD"),
        workerCount: Number(row.worker_count ?? 0),
        approvedBy: row.approved_by ? String(row.approved_by) : null,
        approvedAt: row.approved_at ? String(row.approved_at) : null,
        exportedAt: row.exported_at ? String(row.exported_at) : null,
        supersedesExportId: row.supersedes_export_id ? String(row.supersedes_export_id) : null,
        createdAt: row.created_at ? String(row.created_at) : null,
      }))

      return NextResponse.json({
        success: true,
        exports,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          exports: [],
          unavailable: true,
          unavailableReason: "Payroll exports table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Payroll Exports]", error)
      return NextResponse.json(
        { error: "Payroll exports unavailable", code: "payroll_exports_failed" },
        { status: 503 },
      )
    }
  },
)
