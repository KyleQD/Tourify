import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import {
  normalizeCommerceFinancialActionReason,
  requireCommerceHighRiskAction,
} from "@/lib/admin/commerce/high-risk-actions"
import { requireCommerceIdempotencyKey } from "@/lib/admin/commerce/idempotency"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

const webhookMutationSchema = z.object({
  action: z.enum(["retry", "dismiss"]),
  eventId: z.string().min(1),
  reason: z.string().trim().min(3).max(1_000),
  notes: z.string().max(1_000).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  idempotency_key: z.string().trim().min(8).max(200).optional(),
}).strict()

/**
 * GET /api/marketplace/admin/webhook-events
 *
 * Admin views the webhook exception queue — failed or stuck events.
 */
export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.view_audit",
  })
  if (commerce instanceof NextResponse) return commerce

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "failed"
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 25
  const offset = (page - 1) * limit

  const svc = createServiceRoleClient()
  const { data: events, count, error: fetchError } = await svc
    .from("marketplace_payment_events")
    .select("id, provider_event_id, event_type, processing_status, attempts, last_error, received_at, processed_at", { count: "exact" })
    .eq("processing_status", status)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (fetchError) {
    return commerceErrorResponse({
      status: 500,
      code: "fetch_failed",
      message: "Failed to load webhook events.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({
    data: events ?? [],
    pagination: { total: count ?? 0, page, limit },
  }, {
    correlationId: commerce.request.correlationId,
  })
}

/**
 * POST /api/marketplace/admin/webhook-events
 *
 * Admin retries a failed webhook event by resetting its status to 'received'
 * so the processor can pick it up again, OR dismisses it with notes.
 *
 * Body: { action: "retry" | "dismiss", eventId: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.view_audit",
  })
  if (commerce instanceof NextResponse) return commerce

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Could not parse request body.",
      correlationId: commerce.request.correlationId,
    })
  }

  const parsed = webhookMutationSchema.safeParse(body)
  const denied = requireCommerceHighRiskAction(commerce, "provider.webhook_exception_mutate", {
    reason: parsed.success ? parsed.data.reason : undefined,
  })
  if (denied) return denied
  if (!parsed.success) {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_request",
      message: "Invalid webhook mutation payload.",
      issues: parsed.error.issues,
      correlationId: commerce.request.correlationId,
    })
  }
  const idempotency = requireCommerceIdempotencyKey(request, commerce, parsed.data)
  if (idempotency instanceof NextResponse) return idempotency
  const { action, eventId, notes } = parsed.data
  const actionReason = normalizeCommerceFinancialActionReason(parsed.data.reason).reason

  const svc = createServiceRoleClient()

  const newStatus = action === "retry" ? "received" : "ignored"

  const { error: updateError } = await svc
    .from("marketplace_payment_events")
    .update({
      processing_status: newStatus,
      last_error: action === "dismiss" ? (notes ?? actionReason) : null,
    })
    .eq("id", eventId)
    .eq("processing_status", "failed") // Only act on failed events

  if (updateError) {
    return commerceErrorResponse({
      status: 500,
      code: "update_failed",
      message: "Failed to update webhook event.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({
    data: { eventId, action, newStatus, reason: actionReason },
    idempotencyKey: idempotency.idempotencyKey,
  }, {
    correlationId: commerce.request.correlationId,
  })
}
