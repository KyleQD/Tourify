/**
 * RENT-301 — Rental agreement normalization.
 * RENT-302 — Rental conflict and return alerts.
 *
 * Models the lifecycle of equipment rental agreements, from quoting through
 * return and invoice reconciliation.  Every agreement is explicitly linked to:
 *  - A vendor (external supplier)
 *  - One or more line items with quantities and dates
 *  - Pickup and return locations, owners, and actual timestamps
 *  - Terms, deposit, and vendor/contract/PO/invoice cross-references
 *
 * RENT-302 adds pure conflict-detection helpers:
 *  - Date/quantity/source conflicts (item double-booked)
 *  - Missing pickup or return owner
 *  - Overdue return (today past expected return date)
 *  - Damage detected on return
 *  - Cost variance (actual vs. quoted)
 *  - Escalation flag (blocking severity + escalate_to_user_id)
 *
 * All helpers are pure (no I/O).
 */

// ============================================================================
// RENT-301 — Rental agreement model
// ============================================================================

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

export const RENTAL_AGREEMENT_STATUSES = [
  "draft",         // Being prepared; not yet sent to vendor.
  "quoted",        // Vendor quote received; awaiting internal approval.
  "approved",      // Internally approved; vendor notified.
  "active",        // Items are out on rental.
  "returned",      // All items confirmed returned to vendor.
  "invoiced",      // Vendor invoice received; awaiting reconciliation.
  "reconciled",    // Invoice matched and closed.
  "cancelled",     // Agreement cancelled before or during rental.
] as const
export type RentalAgreementStatus = (typeof RENTAL_AGREEMENT_STATUSES)[number]

export const RENTAL_STATUS_TRANSITIONS: Record<
  RentalAgreementStatus,
  readonly RentalAgreementStatus[]
> = {
  draft:       ["quoted", "approved", "cancelled"],
  quoted:      ["approved", "draft", "cancelled"],    // back to draft for revision
  approved:    ["active", "cancelled"],
  active:      ["returned", "cancelled"],
  returned:    ["invoiced", "reconciled"],             // reconciled directly if no PO
  invoiced:    ["reconciled", "returned"],             // back to returned if dispute
  reconciled:  [],
  cancelled:   ["draft"],                             // re-draft after cancellation
}

export function canTransitionRentalStatus(
  from: RentalAgreementStatus,
  to: RentalAgreementStatus,
): boolean {
  if (from === to) return true
  return (RENTAL_STATUS_TRANSITIONS[from] as readonly RentalAgreementStatus[]).includes(to)
}

export class RentalStatusTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_rental_status_transition"
  constructor(from: RentalAgreementStatus, to: RentalAgreementStatus) {
    super(`Illegal rental agreement status transition: ${from} → ${to}`)
    this.name = "RentalStatusTransitionError"
  }
}

export function assertRentalStatusTransition(
  from: RentalAgreementStatus,
  to: RentalAgreementStatus,
): void {
  if (!canTransitionRentalStatus(from, to)) throw new RentalStatusTransitionError(from, to)
}

// ---------------------------------------------------------------------------
// Rental line item
// ---------------------------------------------------------------------------

export type RentalItemCondition = "new" | "good" | "fair" | "damaged" | "missing"

export interface RentalLineItem {
  id: string
  /** Backref to equipment_catalog_items if item is in catalog; null for ad-hoc. */
  catalog_item_id: string | null
  /** Human label (denormalized). */
  label: string
  quantity: number
  /** Per-unit quoted cost (per rental period). */
  unit_cost_quoted: number | null
  /** Per-unit actual cost (from invoice). */
  unit_cost_actual: number | null
  currency: string
  /** ISO YYYY-MM-DD start of rental period for this item. */
  rental_start_date: string
  /** ISO YYYY-MM-DD end of rental period for this item. */
  rental_end_date: string
  /** Condition at pickup. */
  condition_at_pickup: RentalItemCondition | null
  /** Condition when returned to vendor. */
  condition_at_return: RentalItemCondition | null
  /** Notes about condition change, damage, or missing items. */
  condition_notes: string | null
  /** True when item has been confirmed returned. */
  is_returned: boolean
  returned_at_utc: string | null
}

// ---------------------------------------------------------------------------
// Pickup / return operation record
// ---------------------------------------------------------------------------

export interface RentalPickupReturn {
  /** "pickup" or "return" */
  operation: "pickup" | "return"
  /** Stop/location label. */
  location_label: string
  stop_id: string | null
  /** User responsible for executing the pickup/return. */
  owner_user_id: string | null
  owner_user_name: string | null
  /** UTC ISO planned time. */
  planned_utc: string | null
  /** UTC ISO actual time. */
  actual_utc: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Rental agreement
// ---------------------------------------------------------------------------

export interface RentalAgreement {
  id: string
  org_id: string
  tour_id: string

  // Vendor
  vendor_id: string
  vendor_name: string

  // Dates
  /** ISO YYYY-MM-DD overall rental period start. */
  rental_start_date: string
  /** ISO YYYY-MM-DD overall rental period end (expected return). */
  rental_end_date: string

  // Items
  line_items: RentalLineItem[]

  // Terms
  /** Total quoted cost for the full agreement. */
  total_cost_quoted: number | null
  /** Total actual cost from invoice. */
  total_cost_actual: number | null
  currency: string
  /** Deposit amount paid upfront. */
  deposit_amount: number | null
  deposit_paid: boolean
  terms_notes: string | null

  // Pickup / return operations
  pickup: RentalPickupReturn | null
  return: RentalPickupReturn | null

  // External record links
  contract_id: string | null
  po_number: string | null
  invoice_ref: string | null

  status: RentalAgreementStatus
  created_by_user_id: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Computed cost helpers (RENT-301)
// ---------------------------------------------------------------------------

export function computeAgreementQuotedCost(agreement: RentalAgreement): number {
  return agreement.line_items.reduce(
    (sum, item) =>
      sum + (item.unit_cost_quoted ?? 0) * item.quantity,
    0,
  )
}

export function computeAgreementActualCost(agreement: RentalAgreement): number {
  return agreement.line_items.reduce(
    (sum, item) =>
      sum + (item.unit_cost_actual ?? item.unit_cost_quoted ?? 0) * item.quantity,
    0,
  )
}

// ============================================================================
// RENT-302 — Conflict and return alert detection
// ============================================================================

export type RentalAlertCode =
  | "date_overlap"          // Same catalog item rented from two overlapping agreements
  | "quantity_conflict"     // Total rented quantity exceeds available
  | "source_conflict"       // Same vendor + item booked from incompatible agreements
  | "missing_pickup_owner"  // Pickup has no owner assigned
  | "missing_return_owner"  // Return has no owner assigned
  | "overdue_return"        // Expected return date has passed; items not confirmed returned
  | "damage_on_return"      // One or more items returned in damaged/missing condition
  | "cost_variance"         // Actual cost exceeds quoted by more than threshold

export type RentalAlertSeverity = "warning" | "blocking"

export interface RentalAlert {
  code: RentalAlertCode
  severity: RentalAlertSeverity
  agreement_id: string
  message: string
  /** ID of the conflicting agreement, if applicable. */
  conflicting_agreement_id: string | null
  /** Line item IDs involved in the alert. */
  line_item_ids: string[]
  /** Whether this alert should be escalated to a responsible party. */
  should_escalate: boolean
  /** User ID to escalate to (derived from return/pickup owner or PM). */
  escalate_to_user_id: string | null
}

// ---------------------------------------------------------------------------
// Individual alert detectors (pure)
// ---------------------------------------------------------------------------

/** Check for overlapping date ranges on the same catalog item across agreements. */
export function detectDateOverlap(
  agreementA: RentalAgreement,
  agreementB: RentalAgreement,
): RentalAlert[] {
  if (agreementA.id === agreementB.id) return []
  const alerts: RentalAlert[] = []

  for (const itemA of agreementA.line_items) {
    if (!itemA.catalog_item_id) continue
    for (const itemB of agreementB.line_items) {
      if (itemB.catalog_item_id !== itemA.catalog_item_id) continue
      // Date overlap: A starts before B ends AND B starts before A ends
      if (
        itemA.rental_start_date < itemB.rental_end_date &&
        itemB.rental_start_date < itemA.rental_end_date
      ) {
        alerts.push({
          code: "date_overlap",
          severity: "blocking",
          agreement_id: agreementA.id,
          message: `Item '${itemA.label}' is double-booked: agreement ${agreementA.id} overlaps with ${agreementB.id}`,
          conflicting_agreement_id: agreementB.id,
          line_item_ids: [itemA.id],
          should_escalate: true,
          escalate_to_user_id: agreementA.return?.owner_user_id ?? null,
        })
      }
    }
  }
  return alerts
}

/** Detect missing pickup or return owner on an active/approved agreement. */
export function detectMissingOwners(agreement: RentalAgreement): RentalAlert[] {
  const alerts: RentalAlert[] = []
  const actionable: RentalAgreementStatus[] = ["approved", "active"]
  if (!actionable.includes(agreement.status)) return []

  if (!agreement.pickup?.owner_user_id) {
    alerts.push({
      code: "missing_pickup_owner",
      severity: "blocking",
      agreement_id: agreement.id,
      message: `Rental agreement ${agreement.id} has no pickup owner assigned`,
      conflicting_agreement_id: null,
      line_item_ids: [],
      should_escalate: true,
      escalate_to_user_id: null,
    })
  }
  if (!agreement.return?.owner_user_id) {
    alerts.push({
      code: "missing_return_owner",
      severity: "blocking",
      agreement_id: agreement.id,
      message: `Rental agreement ${agreement.id} has no return owner assigned`,
      conflicting_agreement_id: null,
      line_item_ids: [],
      should_escalate: true,
      escalate_to_user_id: null,
    })
  }
  return alerts
}

/** Detect overdue returns (today past expected return date; items not confirmed returned). */
export function detectOverdueReturn(
  agreement: RentalAgreement,
  todayIso: string,
): RentalAlert[] {
  if (agreement.status !== "active") return []

  const overdueItems = agreement.line_items.filter(
    (item) => !item.is_returned && item.rental_end_date < todayIso,
  )
  if (overdueItems.length === 0) return []

  return [
    {
      code: "overdue_return",
      severity: "blocking",
      agreement_id: agreement.id,
      message: `${overdueItems.length} item(s) overdue for return on agreement ${agreement.id}`,
      conflicting_agreement_id: null,
      line_item_ids: overdueItems.map((i) => i.id),
      should_escalate: true,
      escalate_to_user_id: agreement.return?.owner_user_id ?? null,
    },
  ]
}

/** Detect damage or missing items on return. */
export function detectDamageOnReturn(agreement: RentalAgreement): RentalAlert[] {
  const damagedItems = agreement.line_items.filter(
    (item) =>
      item.is_returned &&
      (item.condition_at_return === "damaged" || item.condition_at_return === "missing"),
  )
  if (damagedItems.length === 0) return []

  return [
    {
      code: "damage_on_return",
      severity: "warning",
      agreement_id: agreement.id,
      message: `${damagedItems.length} item(s) returned damaged or missing on agreement ${agreement.id}`,
      conflicting_agreement_id: null,
      line_item_ids: damagedItems.map((i) => i.id),
      should_escalate: true,
      escalate_to_user_id: agreement.return?.owner_user_id ?? null,
    },
  ]
}

/**
 * Detect cost variance between quoted and actual.
 * `thresholdPct`: alert when actual exceeds quoted by more than this %; default 10%.
 */
export function detectCostVariance(
  agreement: RentalAgreement,
  thresholdPct = 10,
): RentalAlert[] {
  const quoted = computeAgreementQuotedCost(agreement)
  const actual = computeAgreementActualCost(agreement)
  if (quoted <= 0) return []

  const variancePct = ((actual - quoted) / quoted) * 100
  if (variancePct <= thresholdPct) return []

  return [
    {
      code: "cost_variance",
      severity: "warning",
      agreement_id: agreement.id,
      message: `Rental agreement ${agreement.id} actual cost ${actual.toFixed(2)} exceeds quoted ${quoted.toFixed(2)} by ${variancePct.toFixed(1)}%`,
      conflicting_agreement_id: null,
      line_item_ids: [],
      should_escalate: variancePct > thresholdPct * 2,
      escalate_to_user_id: null,
    },
  ]
}

// ---------------------------------------------------------------------------
// Full alert scan for one agreement
// ---------------------------------------------------------------------------

export interface RentalAlertScanResult {
  agreement_id: string
  alerts: RentalAlert[]
  blocking_count: number
  warning_count: number
  needs_escalation: boolean
}

/**
 * Run all RENT-302 checks for a single rental agreement.
 * `allAgreements`: the full set for date-overlap detection.
 * `todayIso`: caller-supplied ISO date for overdue check.
 */
export function scanRentalAlerts(
  agreement: RentalAgreement,
  allAgreements: readonly RentalAgreement[],
  todayIso: string,
  costVarianceThresholdPct = 10,
): RentalAlertScanResult {
  const alerts: RentalAlert[] = []

  // Date overlap with every other agreement
  for (const other of allAgreements) {
    alerts.push(...detectDateOverlap(agreement, other))
  }

  alerts.push(...detectMissingOwners(agreement))
  alerts.push(...detectOverdueReturn(agreement, todayIso))
  alerts.push(...detectDamageOnReturn(agreement))
  alerts.push(...detectCostVariance(agreement, costVarianceThresholdPct))

  return {
    agreement_id: agreement.id,
    alerts,
    blocking_count: alerts.filter((a) => a.severity === "blocking").length,
    warning_count: alerts.filter((a) => a.severity === "warning").length,
    needs_escalation: alerts.some((a) => a.should_escalate),
  }
}
