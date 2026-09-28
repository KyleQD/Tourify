import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

const querySchema = z.object({
  tour_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
})

/**
 * FIN-504 — Budget rollup card.
 * Returns committed / actuals / remaining / utilization_pct for the acting org,
 * optionally scoped to a tour or event.
 */
export const GET = withAdminCapability(
  "finance.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const params = Object.fromEntries(new URL(request.url).searchParams.entries())
      const input = querySchema.parse(params)

      // Query the canonical budget_versions table (approved or baseline version).
      let budgetQuery = supabase
        .from("budget_versions")
        .select("version_id, total_minor_units, currency, status")
        .eq("org_id", admin.orgId)
        .in("status", ["approved", "baseline", "forecast"])
        .order("version_number", { ascending: false })
        .limit(1)

      if (input.tour_id) budgetQuery = budgetQuery.eq("tour_id", input.tour_id)

      const { data: versions, error: versionErr } = await budgetQuery

      if (versionErr) {
        if (versionErr.code === "42P01") {
          return NextResponse.json({
            success: true,
            rollup: null,
            unavailable: true,
            unavailableReason: "Budget tables are not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw versionErr
      }

      if (!versions || versions.length === 0) {
        return NextResponse.json({
          success: true,
          rollup: null,
          freshAt: new Date().toISOString(),
        })
      }

      const version = versions[0]
      const versionId: string = version.version_id
      const totalBudget: number = version.total_minor_units ?? 0
      const currency: string = version.currency ?? "USD"

      // Query commitment entries for this version.
      let commitQuery = supabase
        .from("budget_commitment_entries")
        .select("amount_minor_units, is_actual")
        .eq("budget_version_id", versionId)

      if (input.event_id) {
        // Filter by events linked to this org scope if event_id provided.
        commitQuery = commitQuery.eq("event_id", input.event_id)
      }

      const { data: entries, error: commitErr } = await commitQuery

      let committed = 0
      let actuals = 0

      if (!commitErr && entries) {
        for (const e of entries) {
          if (e.is_actual) actuals += e.amount_minor_units ?? 0
          else committed += e.amount_minor_units ?? 0
        }
      }

      const remaining = totalBudget - committed - actuals
      const utilizationPct =
        totalBudget > 0 ? Math.round(((committed + actuals) / totalBudget) * 100) : 0

      return NextResponse.json({
        success: true,
        rollup: {
          budgetVersionId: versionId,
          status: version.status,
          totalBudget,
          committed,
          actuals,
          remaining,
          utilizationPct,
          currency,
        },
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", code: "validation_error", details: error.errors },
          { status: 400 },
        )
      }
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }
      console.error("[Admin Finance Budget Rollup]", error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Budget rollup unavailable",
          code: "rollup_failed",
        },
        { status: 503 },
      )
    }
  },
)
