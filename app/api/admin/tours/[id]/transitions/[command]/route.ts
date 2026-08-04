import { NextRequest, NextResponse } from "next/server"

import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { withAdminAuth } from "@/lib/auth/api-auth"
import {
  executeTourTransition,
  getTourTransitionErrorStatus,
  isTourTransitionCommand,
  TourTransitionError,
} from "@/lib/admin/tour-transition.service"
import { TourAccessDeniedError, getTourAccessErrorStatus } from "@/lib/admin/tour-access.service"
import { TOUR_TRANSITION_COMMANDS } from "@/lib/admin/tour-lifecycle"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

function extractCommand(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("transitions")
  return index >= 0 ? segments[index + 1] || null : null
}

/**
 * TOUR-202 — Lifecycle transition commands.
 * POST /api/admin/tours/:id/transitions/:command
 */
export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const admin = await resolveActingAdminContext(request, { user, supabase })
  if (admin instanceof NextResponse) return admin

  try {
    const tourId = extractTourId(request.url)
    const commandRaw = extractCommand(request.url)
    if (!tourId) {
      return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    }
    if (!isTourTransitionCommand(commandRaw)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unknown tour lifecycle command.",
          code: "tour_transition_unknown",
          allowedCommands: TOUR_TRANSITION_COMMANDS,
        },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === "string" ? body.reason : null
    const idempotencyKey =
      request.headers.get("idempotency-key")
      || (typeof body.idempotency_key === "string" ? body.idempotency_key : null)

    const result = await executeTourTransition({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId,
      command: commandRaw,
      capabilities: admin.capabilities,
      reason,
      correlationId: admin.correlationId,
      idempotencyKey,
    })

    const response = NextResponse.json({
      success: true,
      command: result.command,
      fromState: result.fromState,
      toState: result.toState,
      tour: result.tour,
      outboxIds: result.outboxIds,
      transactionId: result.transactionId,
      archiveSideEffects: result.archiveSideEffects ?? null,
    })
    response.headers.set("x-correlation-id", admin.correlationId)
    return response
  } catch (error: unknown) {
    if (error instanceof TourTransitionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          unmetBlockers: error.unmetBlockers,
          readiness: error.readiness,
        },
        { status: error.status },
      )
    }
    if (error instanceof TourAccessDeniedError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: getTourAccessErrorStatus(error, 404) },
      )
    }
    const status = getTourTransitionErrorStatus(error, 500)
    const message = error instanceof Error ? error.message : "Failed to transition tour"
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
