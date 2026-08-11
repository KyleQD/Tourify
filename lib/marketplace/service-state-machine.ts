/**
 * Service workflow state machine.
 *
 * Booking flow:
 *   submitted → under_review → countered/accepted/declined/expired
 *             → payment_pending → confirmed → in_progress → completed
 *             (any → canceled, confirmed+ → refunded)
 *
 * Quote flow:
 *   submitted → under_review → (seller issues offer revision) → accepted/declined/expired
 *             → payment_pending → confirmed → in_progress → completed
 *             (any → canceled, confirmed+ → refunded)
 *
 * All transitions enforce:
 *   - Valid current status for the target transition.
 *   - Correct actor role (buyer or seller).
 *   - Optimistic concurrency via `optimistic_version`.
 *
 * Callers MUST pass the `optimistic_version` from the loaded row and compare
 * it before any DB write using a WHERE clause like:
 *   `.eq('optimistic_version', optimisticVersion)`
 *
 * If affected rows = 0 → concurrent update detected → return 409 conflict.
 */

export type ServiceRequestStatus =
  | "submitted"
  | "under_review"
  | "countered"
  | "accepted"
  | "declined"
  | "expired"
  | "payment_pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "refunded"

export type ServiceRequestMode = "booking_request" | "quote_request"

export type ActorRole = "buyer" | "seller"

export interface TransitionResult {
  allowed: true
  nextStatus: ServiceRequestStatus
  /** Patch to apply to marketplace_service_requests */
  requestPatch: Record<string, unknown>
}

export interface TransitionDenied {
  allowed: false
  reason: string
}

export type TransitionOutcome = TransitionResult | TransitionDenied

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------
// Key: `${currentStatus}:${action}:${role}`
// Value: next status

const TRANSITIONS: Record<string, ServiceRequestStatus> = {
  // Seller reviews a submitted request
  "submitted:review:seller":      "under_review",
  // Seller accepts a booking request directly
  "submitted:accept:seller":      "accepted",
  "under_review:accept:seller":   "accepted",
  // Seller counters a booking (with terms)
  "submitted:counter:seller":     "countered",
  "under_review:counter:seller":  "countered",
  // Buyer reviews a counter and accepts
  "countered:accept:buyer":       "accepted",
  // Seller declines
  "submitted:decline:seller":     "declined",
  "under_review:decline:seller":  "declined",
  "countered:decline:seller":     "declined",
  // Buyer declines a counter
  "countered:decline:buyer":      "declined",
  // Accepted → payment pending (system transition after checkout created)
  "accepted:payment_pending:system":   "payment_pending",
  // Quote request: seller issues/revises quote → under_review or countered
  "submitted:issue_quote:seller":      "under_review",
  "under_review:issue_quote:seller":   "under_review",
  // Buyer accepts a quote version → payment_pending
  "under_review:accept_quote:buyer":   "payment_pending",
  // Payment confirmed (webhook) → confirmed
  "payment_pending:confirm:system":    "confirmed",
  // Confirmed → in progress
  "confirmed:start:seller":            "in_progress",
  // Completed
  "in_progress:complete:seller":       "completed",
  // Cancellation
  "submitted:cancel:buyer":        "canceled",
  "under_review:cancel:buyer":     "canceled",
  "countered:cancel:buyer":        "canceled",
  "accepted:cancel:buyer":         "canceled",
  "accepted:cancel:seller":        "canceled",
  "payment_pending:cancel:buyer":  "canceled",
  "payment_pending:cancel:seller": "canceled",
  // Refunds (after confirmation)
  "confirmed:refund:seller":       "refunded",
  "in_progress:refund:seller":     "refunded",
  // System expiry
  "submitted:expire:system":       "expired",
  "under_review:expire:system":    "expired",
  "countered:expire:system":       "expired",
}

// ---------------------------------------------------------------------------
// Main transition function
// ---------------------------------------------------------------------------

export function applyServiceRequestTransition({
  currentStatus,
  action,
  actorRole,
  currentVersion,
  notes,
}: {
  currentStatus: ServiceRequestStatus
  action: string
  actorRole: ActorRole | "system"
  currentVersion: number
  notes?: string
}): TransitionOutcome {
  const key = `${currentStatus}:${action}:${actorRole}`
  const nextStatus = TRANSITIONS[key]

  if (!nextStatus) {
    return {
      allowed: false,
      reason: `Transition '${action}' by '${actorRole}' is not allowed from status '${currentStatus}'.`,
    }
  }

  return {
    allowed: true,
    nextStatus,
    requestPatch: {
      status: nextStatus,
      optimistic_version: currentVersion + 1,
      ...(notes !== undefined ? { notes } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Offer (quote) versioning
// ---------------------------------------------------------------------------

export interface OfferRevisionInput {
  lineItems: Array<{ title: string; quantity: number; unitPrice: number; total: number }>
  subtotal: number
  terms?: string
  expiresAt?: string
  depositPercentage?: number
  depositAmount?: number
  notes?: string
}

export interface NewOfferRow {
  request_id: string
  revision_number: number
  created_by: string
  status: "pending"
  line_items: unknown[]
  subtotal: number
  terms: string | null
  expires_at: string | null
  deposit_percentage: number | null
  deposit_amount: number | null
  notes: string | null
}

/**
 * Build a new offer revision row. The caller must have already verified:
 *   - actor is the seller for the listing
 *   - the request is in a status that allows issuing/revising quotes
 *   - prev_revision_number is the current max revision on the request
 */
export function buildOfferRevision({
  requestId,
  createdBy,
  prevRevisionNumber,
  input,
}: {
  requestId: string
  createdBy: string
  prevRevisionNumber: number
  input: OfferRevisionInput
}): NewOfferRow {
  return {
    request_id: requestId,
    revision_number: prevRevisionNumber + 1,
    created_by: createdBy,
    status: "pending",
    line_items: input.lineItems,
    subtotal: input.subtotal,
    terms: input.terms ?? null,
    expires_at: input.expiresAt ?? null,
    deposit_percentage: input.depositPercentage ?? null,
    deposit_amount: input.depositAmount ?? null,
    notes: input.notes ?? null,
  }
}

/**
 * When a buyer accepts a specific offer revision, all other pending revisions
 * on the same request must be superseded.
 */
export function buildSupersededPatch() {
  return { status: "superseded" }
}

// ---------------------------------------------------------------------------
// Expiry helpers
// ---------------------------------------------------------------------------

export function isRequestExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function isOfferExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}
