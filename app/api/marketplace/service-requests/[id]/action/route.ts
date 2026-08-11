import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser, jsonError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import {
  applyServiceRequestTransition,
  buildOfferRevision,
  buildSupersededPatch,
  isRequestExpired,
  isOfferExpired,
  type ServiceRequestStatus,
} from "@/lib/marketplace/service-state-machine"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action: z.enum([
    "review",
    "accept",
    "counter",
    "decline",
    "cancel",
    "accept_quote",
    "start",
    "complete",
  ]),
  /** Required for counter action — the counter-proposal terms */
  notes: z.string().max(5000).optional(),
  /** Required for accept_quote — which revision the buyer is accepting */
  offerRevisionNumber: z.number().int().positive().optional(),
  /** Client-supplied version for optimistic concurrency */
  optimisticVersion: z.number().int().positive(),
})

/**
 * POST /api/marketplace/service-requests/[id]/action
 *
 * Execute a state transition on a service request.
 * Both buyers and sellers use this endpoint; the actor role is derived from their
 * relation to the request (buyer_user_id vs seller via listing ownership).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: "invalid_json", message: "Could not parse request body", retryable: false })
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "invalid_request", message: "Invalid action payload", retryable: false, issues: parsed.error.issues })
  }
  const { action, notes, offerRevisionNumber, optimisticVersion } = parsed.data

  // Load the service request
  const { data: sr, error: srError } = await supabase
    .from("marketplace_service_requests")
    .select(`
      id, listing_id, buyer_user_id, mode, status, optimistic_version, expires_at,
      marketplace_listings!inner (id, seller_user_id)
    `)
    .eq("id", id)
    .maybeSingle()

  if (srError || !sr) {
    return jsonError({ status: 404, code: "not_found", message: "Service request not found.", retryable: false })
  }

  const listing = sr.marketplace_listings as any

  // Determine actor role
  const isBuyer = sr.buyer_user_id === user.id
  const isSeller = listing?.seller_user_id === user.id
  if (!isBuyer && !isSeller) {
    return jsonError({ status: 403, code: "forbidden", message: "Access denied.", retryable: false })
  }
  const actorRole = isBuyer ? "buyer" : "seller"

  // Check request expiry (expired requests can only be read, not actioned)
  if (isRequestExpired(sr.expires_at) && action !== "cancel") {
    return jsonError({ status: 409, code: "request_expired", message: "This service request has expired.", retryable: false })
  }

  // Optimistic concurrency check (client must pass the version they loaded)
  if (sr.optimistic_version !== optimisticVersion) {
    return jsonError({ status: 409, code: "version_conflict", message: "The request was updated by another action. Please refresh and try again.", retryable: false })
  }

  // ── accept_quote: special path — buyer accepts a specific offer revision ──
  if (action === "accept_quote") {
    if (!isBuyer) {
      return jsonError({ status: 403, code: "buyer_only", message: "Only the buyer can accept a quote.", retryable: false })
    }
    if (offerRevisionNumber == null) {
      return jsonError({ status: 400, code: "revision_required", message: "offerRevisionNumber is required to accept a quote.", retryable: false })
    }

    // Load the specific offer revision
    const { data: offer } = await supabase
      .from("marketplace_service_offers")
      .select("id, revision_number, status, expires_at, subtotal")
      .eq("request_id", id)
      .eq("revision_number", offerRevisionNumber)
      .maybeSingle()

    if (!offer) {
      return jsonError({ status: 404, code: "offer_not_found", message: "The specified quote revision was not found.", retryable: false })
    }
    if (offer.status !== "pending") {
      return jsonError({ status: 409, code: "offer_not_accepting", message: `This quote revision has status '${offer.status}' and cannot be accepted.`, retryable: false })
    }
    if (isOfferExpired(offer.expires_at)) {
      return jsonError({ status: 409, code: "offer_expired", message: "This quote revision has expired.", retryable: false })
    }

    // Accept the selected revision and supersede all others
    const { error: acceptErr } = await supabase
      .from("marketplace_service_offers")
      .update({ status: "accepted" })
      .eq("id", offer.id)
      .eq("status", "pending") // Guard against race

    if (acceptErr) {
      return jsonError({ status: 500, code: "accept_failed", message: "Failed to accept offer.", retryable: true })
    }

    // Supersede all other pending revisions on this request
    await supabase
      .from("marketplace_service_offers")
      .update(buildSupersededPatch())
      .eq("request_id", id)
      .eq("status", "pending")
      .neq("id", offer.id)

    // Transition request to payment_pending
    const transition = applyServiceRequestTransition({
      currentStatus: sr.status as ServiceRequestStatus,
      action: "accept_quote",
      actorRole: "buyer",
      currentVersion: sr.optimistic_version,
      notes,
    })

    if (!transition.allowed) {
      // Revert offer status if request transition fails
      await supabase.from("marketplace_service_offers").update({ status: "pending" }).eq("id", offer.id)
      return jsonError({ status: 409, code: "transition_denied", message: transition.reason, retryable: false })
    }

    const { error: srUpdateErr } = await supabase
      .from("marketplace_service_requests")
      .update(transition.requestPatch)
      .eq("id", id)
      .eq("optimistic_version", optimisticVersion) // Concurrency guard

    if (srUpdateErr) {
      return jsonError({ status: 409, code: "update_conflict", message: "Failed to update request status. Please try again.", retryable: true })
    }

    return NextResponse.json({
      data: {
        id,
        previousStatus: sr.status,
        newStatus: transition.nextStatus,
        acceptedRevision: offerRevisionNumber,
      },
    })
  }

  // ── Standard transition ──────────────────────────────────────────────────
  const transition = applyServiceRequestTransition({
    currentStatus: sr.status as ServiceRequestStatus,
    action,
    actorRole,
    currentVersion: sr.optimistic_version,
    notes,
  })

  if (!transition.allowed) {
    return jsonError({ status: 409, code: "transition_denied", message: transition.reason, retryable: false })
  }

  const { error: updateError, count } = await supabase
    .from("marketplace_service_requests")
    .update(transition.requestPatch)
    .eq("id", id)
    .eq("optimistic_version", optimisticVersion)  // Concurrency guard: fails if someone else updated
    .select()

  if (updateError) {
    return jsonError({ status: 500, code: "update_failed", message: "Failed to apply state transition.", retryable: true })
  }
  // count === 0 means concurrency conflict
  if ((count ?? 1) === 0) {
    return jsonError({ status: 409, code: "version_conflict", message: "Concurrent update detected. Please refresh and try again.", retryable: false })
  }

  return NextResponse.json({
    data: {
      id,
      previousStatus: sr.status,
      newStatus: transition.nextStatus,
    },
  })
}
