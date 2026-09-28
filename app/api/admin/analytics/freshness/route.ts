import { NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"

/**
 * REP-601 — Reporting freshness / reconciliation watermarks.
 * Returns per-domain source health and last-computed timestamps for the
 * acting org. Uses simple table probes to derive staleness — no separate
 * watermark table required.
 */
export const GET = withAdminCapability(
  "tour.view",
  async (_request, { supabase, admin }) => {
    const orgId = admin.orgId
    const now = new Date()
    const staleThresholdMs = 24 * 60 * 60 * 1000 // 24 h

    async function probeLastUpdated(
      table: string,
      orgColumn: string,
    ): Promise<{ lastAt: string | null; ok: boolean }> {
      try {
        const { data } = await supabase
          .from(table)
          .select("updated_at")
          .eq(orgColumn, orgId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        return { lastAt: (data as { updated_at?: string } | null)?.updated_at ?? null, ok: true }
      } catch {
        return { lastAt: null, ok: false }
      }
    }

    function buildWatermark(
      sourceId: string,
      sourceName: string,
      lastAt: string | null,
      available: boolean,
    ) {
      const isStale = !lastAt || now.getTime() - new Date(lastAt).getTime() > staleThresholdMs
      return {
        sourceId,
        sourceName,
        lastCompletedAt: lastAt ?? null,
        watermarkAt: lastAt ?? null,
        isStale: !available ? true : isStale,
        isPartial: !available,
        completenessPercent: available ? (isStale ? 50 : 100) : 0,
        available,
      }
    }

    const [tours, events, workforce, ticketing, finance, logistics] = await Promise.all([
      probeLastUpdated("tours", "org_id"),
      probeLastUpdated("events", "org_id"),
      probeLastUpdated("work_assignments", "org_id"),
      probeLastUpdated("ticket_orders", "org_id"),
      probeLastUpdated("financial_transactions", "org_id"),
      probeLastUpdated("logistics_tasks", "org_id"),
    ])

    const sources = [
      buildWatermark("tours", "Tours & Events", tours.lastAt, tours.ok),
      buildWatermark("events", "Event Details", events.lastAt, events.ok),
      buildWatermark("workforce", "Workforce / Scheduling", workforce.lastAt, workforce.ok),
      buildWatermark("ticketing", "Ticketing & Admissions", ticketing.lastAt, ticketing.ok),
      buildWatermark("finance", "Finance & Budgets", finance.lastAt, finance.ok),
      buildWatermark("logistics", "Logistics & Travel", logistics.lastAt, logistics.ok),
    ]

    const staleCount = sources.filter((s) => s.isStale).length
    const partialCount = sources.filter((s) => s.isPartial).length

    return NextResponse.json({
      success: true,
      freshness: {
        reportId: `freshness-${orgId}`,
        generatedAt: now.toISOString(),
        sources,
        allFresh: staleCount === 0 && partialCount === 0,
        staleSourceCount: staleCount,
        partialSourceCount: partialCount,
      },
    })
  },
)
