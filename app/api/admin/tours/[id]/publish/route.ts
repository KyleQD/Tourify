import { NextRequest, NextResponse } from "next/server"

import {
  AdminTourPublishReadinessError,
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import {
  TransactionalPublishAuthError,
  TransactionalPublishConflictError,
  TransactionalPublishValidationError,
} from "@/lib/admin/publication-transactional-publish.service"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { logAuditEvent } from "@/lib/audit"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAdminCapability("tour.publish", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

    const idempotencyKey =
      request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
    if (!idempotencyKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Idempotency-Key header is required for transactional publish.",
          code: "idempotency_required",
        },
        { status: 422 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const overrideFindingIds = Array.isArray(body?.overrideFindingIds)
      ? body.overrideFindingIds.map(String)
      : []
    const correlationId =
      request.headers.get("x-correlation-id") ||
      (typeof body?.correlationId === "string" ? body.correlationId : null)

    const tour = await AdminTourEventOperationsService.publishTour({
      supabase,
      userId: user.id,
      tourId,
      orgId: admin.orgId,
      overrideFindingIds,
      capabilities: admin.capabilities,
      idempotencyKey,
      correlationId,
    })

    const publication = (tour as { publication?: Record<string, unknown> }).publication
    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: "publish",
      entityType: "tour",
      entityId: tourId,
      correlationId: typeof publication?.correlationId === "string" ? publication.correlationId : undefined,
      newValues: {
        status: "active",
        event_count: (tour as { events?: unknown[] }).events?.length || 0,
        readiness_overrides: overrideFindingIds,
        publication,
      },
    })

    return NextResponse.json({
      success: true,
      tour,
      publication,
      alreadyExisted: Boolean(publication?.alreadyExisted),
    })
  } catch (error: unknown) {
    if (error instanceof AdminTourPublishReadinessError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "tour_not_ready",
          readiness: error.readiness,
        },
        { status: error.status },
      )
    }
    if (error instanceof TransactionalPublishValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: "publication_invalid" },
        { status: 422 },
      )
    }
    if (error instanceof TransactionalPublishConflictError) {
      return NextResponse.json(
        { success: false, error: error.message, code: "idempotency_conflict" },
        { status: 409 },
      )
    }
    if (error instanceof TransactionalPublishAuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to publish tour"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
