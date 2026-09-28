import { NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * FIN-601 — Finance reconciliation mismatch dashboard.
 * Returns open/under_review mismatches for the acting org.
 * Degrades gracefully when the finance_reconciliation_mismatches table is absent.
 */
export const GET = withAdminCapability(
  "finance.view",
  async (_request, { supabase, admin }) => {
    try {
      const orgId = admin.orgId

      // Query persisted reconciliation mismatches
      const { data, error } = await supabase
        .from("finance_reconciliation_mismatches")
        .select(
          "id, type, date, currency, event_id, provider_id, source_total, finance_entry_total, variance, owner, status, evidence, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .in("status", ["open", "under_review"])
        .order("date", { ascending: false })
        .limit(100)

      if (error) {
        // Gracefully degrade if table doesn't exist yet
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            mismatches: [],
            total: 0,
            unavailable: true,
            unavailableReason: "Finance reconciliation table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const mismatches = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        type: String(row.type ?? "unknown"),
        date: row.date ? String(row.date) : null,
        currency: String(row.currency ?? "USD"),
        eventId: row.event_id ? String(row.event_id) : null,
        providerId: row.provider_id ? String(row.provider_id) : null,
        sourceTotal: Number(row.source_total ?? 0),
        financeEntryTotal: Number(row.finance_entry_total ?? 0),
        variance: Number(row.variance ?? 0),
        owner: row.owner ? String(row.owner) : null,
        status: String(row.status ?? "open") as "open" | "under_review",
        evidence: row.evidence ? String(row.evidence) : null,
        createdAt: row.created_at ? String(row.created_at) : null,
        updatedAt: row.updated_at ? String(row.updated_at) : null,
      }))

      return NextResponse.json({
        success: true,
        mismatches,
        total: mismatches.length,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }
      console.error("[Admin Finance Reconciliation]", error)
      return NextResponse.json(
        { error: "Finance reconciliation unavailable", code: "reconciliation_failed" },
        { status: 503 },
      )
    }
  },
)
