import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { buildTourCommandCenterSummary } from "@/lib/admin/tour-command-center-summary"
import {
  recordTourSummaryTelemetry,
  startTourTimer,
} from "@/lib/admin/tour-observability"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * TOUR-203 — Command-center summary BFF.
 * One request: identity, lifecycle, versions, counts, risks, freshness, domain access.
 */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  const timer = startTourTimer()
  const tourId = extractTourId(request.url)
  try {
    if (!tourId) {
      const response = NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
      await recordTourSummaryTelemetry({
        endpoint: "/api/admin/tours/[id]/summary",
        orgId: admin.orgId,
        userId: user.id,
        tourId,
        statusCode: 400,
        latencyMs: timer.elapsedMs(),
        correlationId: admin.correlationId,
        errorCode: "missing_tour_id",
      })
      return response
    }

    const tour = await assertAdminTourAccess({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })

    const summary = await buildTourCommandCenterSummary({
      supabase,
      tourId,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      tour: tour as Record<string, unknown>,
    })

    const latencyMs = timer.elapsedMs()
    await recordTourSummaryTelemetry({
      endpoint: "/api/admin/tours/[id]/summary",
      orgId: admin.orgId,
      userId: user.id,
      tourId,
      statusCode: 200,
      latencyMs,
      correlationId: admin.correlationId,
      isStale: summary.freshness.isStale,
    })

    const response = NextResponse.json({
      success: true,
      summary,
      contract: summary.contract,
      /** Convenience aliases for command-center client hydration. */
      tour: summary.tour,
      events: summary.events,
      stops: summary.stops,
      teamMembers: summary.teamMembers,
      vendors: summary.vendors,
      financeTransactions: summary.financeTransactions,
      meta: {
        latencyMs,
        p95TargetMs: summary.freshness.p95TargetMs,
        withinP95Target: latencyMs <= summary.freshness.p95TargetMs,
        contractVersion: summary.contract.contractVersion,
        isDegraded: summary.freshness.isDegraded,
      },
    })
    response.headers.set("x-correlation-id", admin.correlationId)
    if (summary.freshness.isStale) response.headers.set("x-tour-summary-stale", "1")
    return response
  } catch (error: unknown) {
    const resolved = adminAccessErrorResponse(error, "Failed to load tour summary", 500)
    await recordTourSummaryTelemetry({
      endpoint: "/api/admin/tours/[id]/summary",
      orgId: admin.orgId,
      userId: user.id,
      tourId,
      statusCode: resolved.status,
      latencyMs: timer.elapsedMs(),
      correlationId: admin.correlationId,
      errorCode: resolved.status === 404 ? "entity_not_found" : "summary_failed",
    })
    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    )
  }
})
