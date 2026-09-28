/**
 * TIX-501 — Event ticketing setup (configuration).
 * TIX-502 — Inventory ledger.
 * TIX-503 — Allocations/holds matrix.
 * TIX-504 — Comp/guest approval.
 * TIX-505 — Campaigns/promos.
 * TIX-506 — Order/ticket operations.
 * TIX-507 — Tour ticketing workspace.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ===========================================================================
// TIX-501 — Event ticketing setup
// ===========================================================================

export const CAPACITY_SOURCES = ["manual", "venue_contract", "ticketing_provider"] as const
export type CapacitySource = (typeof CAPACITY_SOURCES)[number]

export interface TicketType {
  ticket_type_id: string
  name: string
  capacity: number
  price_minor_units: number
  currency: string
  channels: ("web" | "box_office" | "comp" | "allocation")[]
  is_active: boolean
  max_per_order: number | null
  restrictions: string | null
}

export interface TaxFeePolicy {
  name: string
  /** Fixed minor units or percentage. */
  type: "fixed" | "percent"
  value: number
}

export interface EventTicketingConfig {
  event_id: string
  capacity_source: CapacitySource
  total_capacity: number
  currency: string
  sales_open_at: string | null
  sales_close_at: string | null
  tax_fee_policies: TaxFeePolicy[]
  ticket_types: TicketType[]
  is_ticketed: boolean
}

export function computeAvailabilityPreview(
  config: EventTicketingConfig,
  allocatedCount: number,
): { available: number; allocated: number; total: number } {
  return {
    total: config.total_capacity,
    allocated: allocatedCount,
    available: Math.max(0, config.total_capacity - allocatedCount),
  }
}

export function validateTicketingConfig(
  config: EventTicketingConfig,
): string[] {
  const errors: string[] = []
  if (!config.is_ticketed) return [] // not ticketed = valid
  if (config.total_capacity <= 0) errors.push("total_capacity must be > 0")
  if (!config.currency) errors.push("currency is required")
  const typeCapacitySum = config.ticket_types.reduce((s, t) => s + t.capacity, 0)
  if (config.ticket_types.length > 0 && typeCapacitySum > config.total_capacity) {
    errors.push(`Ticket type capacities (${typeCapacitySum}) exceed total capacity (${config.total_capacity})`)
  }
  return errors
}

// ===========================================================================
// TIX-502 — Inventory ledger
// ===========================================================================

export const INVENTORY_MOVEMENT_TYPES = [
  "reserve",
  "sell",
  "hold",
  "comp",
  "transfer_in",
  "transfer_out",
  "release",
  "void",
  "refund",
] as const
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number]

export interface InventoryLedgerEntry {
  entry_id: string
  event_id: string
  ticket_type_id: string
  movement_type: InventoryMovementType
  quantity: number    // positive = adds to committed; negative = releases
  idempotency_key: string
  actor_id: string
  reason: string | null
  created_at: string
}

export interface InventoryState {
  ticket_type_id: string
  total_capacity: number
  reserved: number
  sold: number
  held: number
  comped: number
  voided: number
  refunded: number
  available: number
}

/**
 * Reconstruct current inventory state from an append-only ledger.
 * Returns null if the ledger contains entries for multiple ticket types
 * (caller must filter first).
 */
export function reconstructInventoryState(
  ticket_type_id: string,
  total_capacity: number,
  entries: readonly InventoryLedgerEntry[],
): InventoryState {
  let reserved = 0, sold = 0, held = 0, comped = 0, voided = 0, refunded = 0

  for (const e of entries) {
    if (e.ticket_type_id !== ticket_type_id) continue
    switch (e.movement_type) {
      case "reserve": reserved += e.quantity; break
      case "sell": sold += e.quantity; break
      case "hold": held += e.quantity; break
      case "comp": comped += e.quantity; break
      case "void": voided += e.quantity; break
      case "refund": refunded += e.quantity; break
      case "release": reserved -= e.quantity; break
      case "transfer_in": sold += e.quantity; break
      case "transfer_out": sold -= e.quantity; break
    }
  }

  const committed = reserved + sold + held + comped
  const available = Math.max(0, total_capacity - committed)
  return { ticket_type_id, total_capacity, reserved, sold, held, comped, voided, refunded, available }
}

/**
 * Check if a reservation can be made (no oversell).
 */
export function canReserve(state: InventoryState, quantity: number): boolean {
  return state.available >= quantity
}

// ===========================================================================
// TIX-503 — Allocations/holds matrix
// ===========================================================================

export const ALLOCATION_CATEGORIES = [
  "tour",
  "promoter",
  "venue",
  "artist",
  "sponsor",
  "comp",
  "production",
  "accessibility",
  "other",
] as const
export type AllocationCategory = (typeof ALLOCATION_CATEGORIES)[number]

export type AllocationStatus = "requested" | "held" | "issued" | "released" | "expired"

export interface AllocationRecord {
  allocation_id: string
  tour_id: string
  stop_id: string
  ticket_type_id: string
  category: AllocationCategory
  requested_quantity: number
  held_quantity: number
  issued_quantity: number
  released_quantity: number
  status: AllocationStatus
  deadline: string | null
  release_rule: "manual" | "deadline" | "auto_72h" | null
  created_by: string
  created_at: string
}

export interface AllocationMatrixCell {
  stop_id: string
  category: AllocationCategory
  requested: number
  held: number
  issued: number
  released: number
  used: number  // issued - still available = issued (all issued are "used")
}

export function buildAllocationMatrix(
  allocations: readonly AllocationRecord[],
): AllocationMatrixCell[] {
  const cells: AllocationMatrixCell[] = []
  for (const a of allocations) {
    cells.push({
      stop_id: a.stop_id,
      category: a.category,
      requested: a.requested_quantity,
      held: a.held_quantity,
      issued: a.issued_quantity,
      released: a.released_quantity,
      used: a.issued_quantity,
    })
  }
  return cells
}

export function getAllocationsAtRiskOfExpiry(
  allocations: readonly AllocationRecord[],
  nowIso: string,
  warnThresholdMs = 24 * 3600 * 1000,
): AllocationRecord[] {
  return allocations.filter((a) => {
    if (a.status !== "held") return false
    if (!a.deadline) return false
    const diff = new Date(a.deadline).getTime() - new Date(nowIso).getTime()
    return diff >= 0 && diff <= warnThresholdMs
  })
}

// ===========================================================================
// TIX-504 — Comp/guest approval
// ===========================================================================

export type CompRequestStatus = "pending" | "approved" | "denied" | "issued" | "cancelled"

export interface CompRequest {
  request_id: string
  event_id: string
  recipient_name: string
  recipient_email: string | null
  host_id: string
  category: AllocationCategory
  ticket_type_id: string
  quantity: number
  plus_one_allowed: boolean
  credential_required: string | null
  notes: string | null
  privacy_notes: string | null
  status: CompRequestStatus
  approved_by: string | null
  approved_at: string | null
  denial_reason: string | null
  issued_ticket_ids: string[]
  attended: boolean | null
  created_at: string
}

export function approveCompRequest(
  req: CompRequest,
  approver: string,
  now: string,
): { ok: boolean; request: CompRequest | null; error?: string } {
  if (req.status !== "pending") {
    return { ok: false, request: null, error: `Cannot approve a ${req.status} request.` }
  }
  return {
    ok: true,
    request: { ...req, status: "approved", approved_by: approver, approved_at: now },
  }
}

export function denyCompRequest(
  req: CompRequest,
  approver: string,
  reason: string,
  now: string,
): { ok: boolean; request: CompRequest | null; error?: string } {
  if (!reason.trim()) return { ok: false, request: null, error: "Denial reason is required." }
  if (req.status !== "pending") {
    return { ok: false, request: null, error: `Cannot deny a ${req.status} request.` }
  }
  return {
    ok: true,
    request: { ...req, status: "denied", approved_by: approver, approved_at: now, denial_reason: reason },
  }
}

export function issueComp(
  req: CompRequest,
  ticket_ids: string[],
): { ok: boolean; request: CompRequest | null; error?: string } {
  if (req.status !== "approved") {
    return { ok: false, request: null, error: "Can only issue comp for approved requests." }
  }
  return { ok: true, request: { ...req, status: "issued", issued_ticket_ids: ticket_ids } }
}

// ===========================================================================
// TIX-505 — Campaigns/promos
// ===========================================================================

export type PromoStatus = "draft" | "active" | "paused" | "expired" | "cancelled"
export type DiscountType = "percent" | "fixed" | "free"

export interface PromoCode {
  code_id: string
  campaign_id: string
  code: string
  redemption_count: number
  max_redemptions: number | null
  is_active: boolean
}

export interface PromoCampaign {
  campaign_id: string
  event_id: string
  name: string
  discount_type: DiscountType
  discount_value: number
  /** Applies to these ticket_type_ids (empty = all). */
  eligible_ticket_type_ids: string[]
  max_total_redemptions: number | null
  budget_minor_units: number | null
  total_redeemed: number
  status: PromoStatus
  valid_from: string | null
  valid_until: string | null
  codes: PromoCode[]
  created_by: string
}

export function computePromoDiscount(
  campaign: PromoCampaign,
  face_value_minor_units: number,
): number {
  if (campaign.discount_type === "percent") {
    return Math.round(face_value_minor_units * (campaign.discount_value / 100))
  }
  if (campaign.discount_type === "fixed") {
    return Math.min(campaign.discount_value, face_value_minor_units)
  }
  return face_value_minor_units // free
}

export function isPromoRedeemable(
  campaign: PromoCampaign,
  code: PromoCode,
  nowIso: string,
): boolean {
  if (campaign.status !== "active") return false
  if (campaign.valid_from && nowIso < campaign.valid_from) return false
  if (campaign.valid_until && nowIso > campaign.valid_until) return false
  if (campaign.max_total_redemptions !== null && campaign.total_redeemed >= campaign.max_total_redemptions) return false
  if (!code.is_active) return false
  if (code.max_redemptions !== null && code.redemption_count >= code.max_redemptions) return false
  return true
}

// ===========================================================================
// TIX-506 — Order/ticket operations
// ===========================================================================

export type TicketOperationStatus = "pending" | "completed" | "failed" | "reversed"

export type TicketOperationType = "resend" | "transfer" | "void" | "refund"

export interface TicketOperation {
  operation_id: string
  ticket_id: string
  operation_type: TicketOperationType
  actor_id: string
  reason: string
  status: TicketOperationStatus
  /** Financial impact in minor units (negative = refund). */
  financial_impact_minor_units: number
  created_at: string
  completed_at: string | null
}

export type TicketStatus = "active" | "transferred" | "voided" | "refunded" | "used"

export const ALLOWED_OPERATIONS: Record<TicketStatus, TicketOperationType[]> = {
  active: ["resend", "transfer", "void", "refund"],
  transferred: ["void"],
  voided: [],
  refunded: [],
  used: [],
}

export function canPerformOperation(
  ticketStatus: TicketStatus,
  op: TicketOperationType,
): boolean {
  return ALLOWED_OPERATIONS[ticketStatus].includes(op)
}

export function createTicketOperation(params: {
  operation_id: string
  ticket_id: string
  ticket_status: TicketStatus
  operation_type: TicketOperationType
  actor_id: string
  reason: string
  financial_impact_minor_units?: number
  now: string
}): { ok: boolean; operation: TicketOperation | null; error?: string } {
  if (!canPerformOperation(params.ticket_status, params.operation_type)) {
    return {
      ok: false,
      operation: null,
      error: `Cannot perform '${params.operation_type}' on ticket with status '${params.ticket_status}'.`,
    }
  }
  if (!params.reason.trim()) {
    return { ok: false, operation: null, error: "Reason is required for all ticket operations." }
  }
  return {
    ok: true,
    operation: {
      operation_id: params.operation_id,
      ticket_id: params.ticket_id,
      operation_type: params.operation_type,
      actor_id: params.actor_id,
      reason: params.reason,
      status: "pending",
      financial_impact_minor_units: params.financial_impact_minor_units ?? 0,
      created_at: params.now,
      completed_at: null,
    },
  }
}

// ===========================================================================
// TIX-507 — Tour ticketing workspace
// ===========================================================================

export interface StopTicketingSummary {
  stop_id: string
  total_capacity: number
  sold: number
  held: number
  comped: number
  refunded: number
  checked_in: number
  exceptions: number
  /** Whether provider data is fresh (within acceptable lag threshold). */
  provider_data_fresh: boolean
  provider_last_synced_at: string | null
}

export interface TourTicketingWorkspace {
  tour_id: string
  stop_summaries: StopTicketingSummary[]
  total_sold: number
  total_comped: number
  total_refunded: number
  total_exceptions: number
  has_stale_provider_data: boolean
}

export function buildTourTicketingWorkspace(
  tour_id: string,
  summaries: readonly StopTicketingSummary[],
): TourTicketingWorkspace {
  let total_sold = 0, total_comped = 0, total_refunded = 0, total_exceptions = 0
  let has_stale_provider_data = false

  for (const s of summaries) {
    total_sold += s.sold
    total_comped += s.comped
    total_refunded += s.refunded
    total_exceptions += s.exceptions
    if (!s.provider_data_fresh) has_stale_provider_data = true
  }

  return {
    tour_id,
    stop_summaries: [...summaries],
    total_sold,
    total_comped,
    total_refunded,
    total_exceptions,
    has_stale_provider_data,
  }
}
