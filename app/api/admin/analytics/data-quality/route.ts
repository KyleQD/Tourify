import { NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const querySchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "all"]).default("open"),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * REP-602 — Data-quality monitor alerts.
 * Returns open data-quality issues for the acting org (orphan records,
 * mismatched totals, unscoped rows, stale projections, etc.).
 */
export const GET = withAdminCapability(
  "tour.view",
  async (request, { supabase, admin }) => {
    try {
      const params = Object.fromEntries(new URL(request.url).searchParams.entries())
      const input = querySchema.parse(params)
      const orgId = admin.orgId

      // Probe the data_quality_alerts table if it exists; otherwise synthesise
      // alerts from real DB anomalies.
      let storedAlerts: Array<{
        id: string
        issue_type: string
        domain: string
        description: string
        status: string
        detected_at: string
        record_id?: string | null
      }> = []

      let alertQuery = supabase
        .from("data_quality_alerts")
        .select("id, issue_type, domain, description, status, detected_at, record_id")
        .eq("org_id", orgId)
        .order("detected_at", { ascending: false })
        .limit(input.limit)

      if (input.status !== "all") {
        alertQuery = alertQuery.eq("status", input.status) as typeof alertQuery
      }
      if (input.domain) {
        alertQuery = alertQuery.eq("domain", input.domain) as typeof alertQuery
      }

      const { data, error } = await alertQuery

      if (!error) {
        storedAlerts = data ?? []
      }
      // If table doesn't exist (42P01) we synthesise anomalies from live probes.

      // Synthesised anomalies — check for events with no org_id.
      const synthesised: typeof storedAlerts = []

      if (storedAlerts.length === 0) {
        // Probe for unscoped financial_transactions (no org_id).
        const finResult = await supabase
          .from("financial_transactions")
          .select("id", { count: "exact", head: true })
          .is("org_id", null)
        const unscopedFinance = finResult.count ?? 0

        if (unscopedFinance > 0) {
          synthesised.push({
            id: `synth-unscoped-finance-${orgId}`,
            issue_type: "unscoped_record",
            domain: "finance",
            description: `${unscopedFinance} financial transaction(s) have no org_id and may be inaccessible.`,
            status: "open",
            detected_at: new Date().toISOString(),
          })
        }
      }

      const alerts = storedAlerts.length > 0 ? storedAlerts : synthesised

      return NextResponse.json({
        success: true,
        alerts: alerts.map((a) => ({
          id: a.id,
          orgId,
          issueType: a.issue_type,
          domain: a.domain,
          description: a.description,
          status: a.status,
          detectedAt: a.detected_at,
          recordId: a.record_id ?? undefined,
        })),
        total: alerts.length,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", code: "validation_error", details: error.errors },
          { status: 400 },
        )
      }
      console.error("[Admin Data Quality]", error)
      return NextResponse.json(
        { error: "Data quality alerts unavailable", code: "dq_failed" },
        { status: 503 },
      )
    }
  },
)
