import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { userHasAdminSurfaceAccess } from "@/lib/auth/admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { jsonError } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

async function requireMarketplaceAdmin(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { admin: null, error: jsonError({ status: 401, code: "unauthorized", message: "Authentication required.", retryable: false }) }
  const isAdmin = await userHasAdminSurfaceAccess(auth.supabase, auth.user.id)
  if (!isAdmin) return { admin: null, error: jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false }) }
  return { admin: auth.user, error: null }
}

/**
 * GET /api/marketplace/admin/webhook-events
 *
 * Admin views the webhook exception queue — failed or stuck events.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireMarketplaceAdmin(request)
  if (error) return error

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
    return jsonError({ status: 500, code: "fetch_failed", message: "Failed to load webhook events.", retryable: true })
  }

  return NextResponse.json({ data: events ?? [], pagination: { total: count ?? 0, page, limit } })
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
  const { admin, error } = await requireMarketplaceAdmin(request)
  if (error) return error

  const { action, eventId, notes } = await request.json()

  if (!action || !eventId) {
    return jsonError({ status: 400, code: "invalid_request", message: "action and eventId are required.", retryable: false })
  }
  if (!["retry", "dismiss"].includes(action)) {
    return jsonError({ status: 400, code: "invalid_action", message: "action must be retry or dismiss.", retryable: false })
  }

  const svc = createServiceRoleClient()

  const newStatus = action === "retry" ? "received" : "ignored"

  const { error: updateError } = await svc
    .from("marketplace_payment_events")
    .update({
      processing_status: newStatus,
      last_error: action === "dismiss" ? (notes ?? "Dismissed by admin") : null,
    })
    .eq("id", eventId)
    .eq("processing_status", "failed") // Only act on failed events

  if (updateError) {
    return jsonError({ status: 500, code: "update_failed", message: "Failed to update webhook event.", retryable: true })
  }

  return NextResponse.json({ data: { eventId, action, newStatus } })
}
