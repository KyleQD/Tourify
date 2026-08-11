import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { TourMetadataVersionConflictError } from "@/lib/admin/tour-metadata-version-diff"
import { recordTourSummaryTelemetry, startTourTimer } from "@/lib/admin/tour-observability"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  const timer = startTourTimer()
  const tourId = extractTourId(request.url)
  try {
    if (!tourId) {
      const response = NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
      await recordTourSummaryTelemetry({
        endpoint: "/api/admin/tours/[id]",
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
    const tour = await AdminTourEventOperationsService.getTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
    })
    await recordTourSummaryTelemetry({
      endpoint: "/api/admin/tours/[id]",
      orgId: admin.orgId,
      userId: user.id,
      tourId,
      statusCode: 200,
      latencyMs: timer.elapsedMs(),
      correlationId: admin.correlationId,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 400)
    await recordTourSummaryTelemetry({
      endpoint: "/api/admin/tours/[id]",
      orgId: admin.orgId,
      userId: user.id,
      tourId,
      statusCode: status,
      latencyMs: timer.elapsedMs(),
      correlationId: admin.correlationId,
      errorCode: error?.code || error?.name || null,
    })
    return NextResponse.json({ success: false, error: error.message || "Failed to load tour" }, { status })
  }
})

export const PATCH = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const tour = await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: user.id,
      tourId,
      input: body,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    if (error instanceof TourMetadataVersionConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          expectedVersion: error.expectedVersion,
          currentVersion: error.currentVersion,
          diff: error.diff,
          tour: error.serverTour,
        },
        { status: 409 },
      )
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to update tour" }, { status })
  }
})

export const DELETE = withAdminCapability("tour.delete", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const result = await AdminTourEventOperationsService.deleteTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      correlationId: admin.correlationId,
    })
    const response = NextResponse.json(result)
    response.headers.set("x-correlation-id", admin.correlationId)
    return response
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    const blockers =
      error && typeof error === "object" && "blockers" in error
        ? (error as { blockers?: unknown }).blockers
        : undefined
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete tour",
        code: error?.code || undefined,
        blockers,
      },
      { status },
    )
  }
})
