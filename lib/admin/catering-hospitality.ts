/**
 * CATER-301 through CATER-306 — Catering and hospitality domain.
 *
 * CATER-301: Normalize hospitality requirements
 *   Rider/advance items map to structured HospitalityRequirement records with
 *   source, version, privacy class, and local variance tracking.
 *
 * CATER-302: Meal-service planner
 *   MealService records per stop/event covering all meal types, window,
 *   location, provider, menu version, headcount snapshot, cost, status, owner,
 *   and timeline conflict detection.
 *
 * CATER-303: Privacy-safe headcounts
 *   MealHeadcount builds from source groups; dietary/accessibility aggregated
 *   without identifiable data. Identifiable exceptions require an explicit
 *   capability flag and purpose string.
 *
 * CATER-304: Menu/delivery approval
 *   MenuProposal workflow: provider → internal approval → delivery acceptance →
 *   shortage/quality issue → actual headcount and cost reconciliation.
 *
 * CATER-305: Hospitality delivery checklist
 *   DeliveryChecklistItem per rider item × room/location/window. Each item
 *   accepted or noted with variance; linked to advance, site-map, or task.
 *
 * CATER-306: Crew/vendor publication projections
 *   ProjectedCrewView: meal details (type/window/location/provider) — no
 *   individual dietary data unless caller has can_catering_coordinator.
 *   ProjectedVendorView: authorized quantities, windows, dietary aggregates
 *   only; no names, headcount details, or financial data.
 *
 * Privacy invariants enforced throughout:
 *  - Dietary and accessibility data are never stored at individual level in
 *    operational outputs; only aggregates propagate.
 *  - Identifiable exceptions require `{ hasCoordinatorCap: true, purpose: string }`.
 *  - Vendor views never contain individual identifiers.
 *
 * All helpers are pure (no I/O).
 */

// ============================================================================
// Shared primitives
// ============================================================================

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "buyout",   // Per-diem cash buyout instead of catered meal
  "other",
] as const
export type MealType = (typeof MEAL_TYPES)[number]

// ============================================================================
// CATER-301 — Hospitality requirements
// ============================================================================

/**
 * Privacy class for dietary/accessibility data on a requirement.
 *  - `aggregate_only`  – No individual data; only totals may be communicated.
 *  - `coordinator`     – Coordinator may see individual detail with purpose log.
 *  - `none`            – No dietary/accessibility data recorded.
 */
export type DietaryPrivacyClass = "aggregate_only" | "coordinator" | "none"

export type HospitalityRequirementSource =
  | "rider"          // From the artist/talent rider document
  | "advance"        // From venue advance sheet
  | "tour_standard"  // Org-level standard applied to all stops
  | "local"          // Added by local coordinator for this specific stop

export interface HospitalityRequirement {
  id: string
  org_id: string
  tour_id: string
  stop_id: string | null  // null = tour-wide requirement

  // Source tracing
  source: HospitalityRequirementSource
  /** Rider/advance document version at time of ingestion. */
  source_version: string | null
  /** Name of the source document (e.g. "Artist Rider v3.pdf"). */
  source_document_label: string | null

  // What is required
  /** Category (e.g. "dressing_room_catering", "bus_stock", "meal"). */
  category: string
  label: string
  quantity: number
  unit: string | null       // e.g. "bottles", "servings", "trays"
  notes: string | null

  // Privacy
  dietary_privacy_class: DietaryPrivacyClass

  // Variance: how this stop differs from the tour standard
  /** True when this requirement overrides a tour_standard with a local value. */
  is_local_variance: boolean
  /** The tour_standard requirement this overrides (for diff display). */
  overrides_requirement_id: string | null
  /** Notes explaining why variance was approved. */
  variance_reason: string | null
  variance_approved_by_user_id: string | null

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Variance helpers (CATER-301)
// ---------------------------------------------------------------------------

export interface VarianceSummary {
  total_requirements: number
  local_variance_count: number
  tour_standard_count: number
  rider_count: number
  advance_count: number
}

export function buildVarianceSummary(
  requirements: readonly HospitalityRequirement[],
): VarianceSummary {
  return {
    total_requirements: requirements.length,
    local_variance_count: requirements.filter((r) => r.is_local_variance).length,
    tour_standard_count: requirements.filter((r) => r.source === "tour_standard").length,
    rider_count: requirements.filter((r) => r.source === "rider").length,
    advance_count: requirements.filter((r) => r.source === "advance").length,
  }
}

// ============================================================================
// CATER-302 — Meal-service planner
// ============================================================================

export const MEAL_SERVICE_STATUSES = [
  "planned",         // On the schedule; not yet confirmed with provider.
  "confirmed",       // Provider confirmed; details locked.
  "in_preparation",  // Provider is preparing.
  "delivered",       // Meal/service delivered.
  "cancelled",       // Cancelled.
] as const
export type MealServiceStatus = (typeof MEAL_SERVICE_STATUSES)[number]

export const MEAL_SERVICE_TRANSITIONS: Record<
  MealServiceStatus,
  readonly MealServiceStatus[]
> = {
  planned:        ["confirmed", "cancelled"],
  confirmed:      ["in_preparation", "cancelled"],
  in_preparation: ["delivered", "cancelled"],
  delivered:      [],
  cancelled:      ["planned"],
}

export function canTransitionMealServiceStatus(
  from: MealServiceStatus,
  to: MealServiceStatus,
): boolean {
  if (from === to) return true
  return (MEAL_SERVICE_TRANSITIONS[from] as readonly MealServiceStatus[]).includes(to)
}

export class MealServiceTransitionError extends Error {
  readonly httpStatus = 422
  readonly code = "illegal_meal_service_transition"
  constructor(from: MealServiceStatus, to: MealServiceStatus) {
    super(`Illegal meal service status transition: ${from} → ${to}`)
    this.name = "MealServiceTransitionError"
  }
}

export function assertMealServiceTransition(from: MealServiceStatus, to: MealServiceStatus): void {
  if (!canTransitionMealServiceStatus(from, to)) throw new MealServiceTransitionError(from, to)
}

export interface ServiceWindow {
  /** UTC ISO earliest service time. */
  window_start_utc: string
  /** UTC ISO latest acceptable service time. */
  window_end_utc: string
}

export interface MealService {
  id: string
  org_id: string
  tour_id: string
  stop_id: string
  /** ISO YYYY-MM-DD of the meal date. */
  service_date: string

  meal_type: MealType
  status: MealServiceStatus

  window: ServiceWindow
  location_label: string
  stop_id_location: string | null  // stop within the stop (e.g. "Backstage room B")

  provider_name: string | null
  provider_vendor_id: string | null

  /** Menu version reference (links to MenuProposal). */
  menu_proposal_id: string | null
  /** Notes about the menu or special instructions. */
  menu_notes: string | null

  /** Headcount snapshot reference (links to MealHeadcount). */
  headcount_snapshot_id: string | null
  /** Estimated headcount at planning time. */
  headcount_estimate: number | null

  /** Cost per head (mutually exclusive with flat_cost). */
  cost_per_head: number | null
  /** Flat cost for the entire service. */
  flat_cost: number | null
  currency: string

  owner_user_id: string | null
  owner_user_name: string | null

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Timeline conflict detection (CATER-302)
// ---------------------------------------------------------------------------

export interface MealTimelineConflict {
  meal_service_id_a: string
  meal_service_id_b: string
  message: string
}

/**
 * Detect window overlaps among meal services at the same stop on the same date.
 * Pure: returns conflicts only, no mutations.
 */
export function detectMealTimelineConflicts(
  services: readonly MealService[],
): MealTimelineConflict[] {
  const conflicts: MealTimelineConflict[] = []

  for (let i = 0; i < services.length; i++) {
    for (let j = i + 1; j < services.length; j++) {
      const a = services[i]
      const b = services[j]
      if (a.stop_id !== b.stop_id || a.service_date !== b.service_date) continue
      // Skip if either is cancelled
      if (a.status === "cancelled" || b.status === "cancelled") continue

      const aStart = a.window.window_start_utc
      const aEnd   = a.window.window_end_utc
      const bStart = b.window.window_start_utc
      const bEnd   = b.window.window_end_utc

      if (aStart < bEnd && bStart < aEnd) {
        conflicts.push({
          meal_service_id_a: a.id,
          meal_service_id_b: b.id,
          message: `${a.meal_type} and ${b.meal_type} windows overlap at stop ${a.stop_id} on ${a.service_date}`,
        })
      }
    }
  }

  return conflicts
}

// ============================================================================
// CATER-303 — Privacy-safe headcounts
// ============================================================================

export interface DietaryAggregate {
  /** Label for the dietary requirement/category (normalized). */
  label: string
  count: number
}

export interface AccessibilityAggregate {
  label: string
  count: number
}

/**
 * Individual dietary exception — only permitted when caller has coordinator
 * capability AND supplies a purpose string.
 */
export interface IndividualDietaryException {
  person_id: string
  person_display_name: string   // display name only — no PII beyond what coordinator needs
  dietary_note: string
  /** Why the coordinator needs this individual-level detail. */
  purpose: string
}

export interface MealHeadcount {
  id: string
  meal_service_id: string
  /** Source group label (e.g. "Band", "Crew", "Production"). */
  source_group: string
  included_count: number
  excluded_count: number
  /** Reason for exclusions (e.g. "buying out", "dietary buyout"). */
  exclusion_notes: string | null

  /** Privacy-safe dietary aggregates — no individual names. */
  dietary_aggregates: DietaryAggregate[]
  /** Privacy-safe accessibility aggregates. */
  accessibility_aggregates: AccessibilityAggregate[]

  /**
   * Individual exceptions — only populated when `was_built_with_coordinator_cap`
   * is true and each entry includes a `purpose` string.
   * Must be empty in aggregate/vendor projections.
   */
  individual_exceptions: IndividualDietaryException[]
  was_built_with_coordinator_cap: boolean
  snapshot_taken_at: string
}

export interface HeadcountSnapshotInput {
  source_group: string
  members: Array<{
    dietary_notes: string | null
    accessibility_notes: string | null
    is_excluded: boolean
    exclusion_reason: string | null
  }>
  hasCoordinatorCap: boolean
  individualExceptions?: IndividualDietaryException[]
}

/**
 * Build a privacy-safe headcount snapshot from a group of members.
 * Individual exceptions are only included when `hasCoordinatorCap` is true
 * and `individualExceptions` is supplied; otherwise they are stripped.
 */
export function buildHeadcountSnapshot(
  mealServiceId: string,
  snapshotId: string,
  input: HeadcountSnapshotInput,
  takenAt: string,
): MealHeadcount {
  const included = input.members.filter((m) => !m.is_excluded)
  const excluded = input.members.filter((m) => m.is_excluded)

  // Aggregate dietary needs (no names)
  const dietaryMap: Record<string, number> = {}
  for (const m of included) {
    if (!m.dietary_notes) continue
    const key = m.dietary_notes.trim().toLowerCase()
    dietaryMap[key] = (dietaryMap[key] ?? 0) + 1
  }
  const dietary_aggregates: DietaryAggregate[] = Object.entries(dietaryMap).map(
    ([label, count]) => ({ label, count }),
  )

  // Aggregate accessibility needs
  const accessMap: Record<string, number> = {}
  for (const m of included) {
    if (!m.accessibility_notes) continue
    const key = m.accessibility_notes.trim().toLowerCase()
    accessMap[key] = (accessMap[key] ?? 0) + 1
  }
  const accessibility_aggregates: AccessibilityAggregate[] = Object.entries(accessMap).map(
    ([label, count]) => ({ label, count }),
  )

  return {
    id: snapshotId,
    meal_service_id: mealServiceId,
    source_group: input.source_group,
    included_count: included.length,
    excluded_count: excluded.length,
    exclusion_notes: excluded.map((m) => m.exclusion_reason).filter(Boolean).join("; ") || null,
    dietary_aggregates,
    accessibility_aggregates,
    individual_exceptions:
      input.hasCoordinatorCap && input.individualExceptions
        ? input.individualExceptions
        : [],
    was_built_with_coordinator_cap: input.hasCoordinatorCap,
    snapshot_taken_at: takenAt,
  }
}

// ============================================================================
// CATER-304 — Menu/delivery approval
// ============================================================================

export const MENU_PROPOSAL_STATUSES = [
  "proposed",       // Provider submitted menu/pricing.
  "approved",       // Internally approved.
  "change_requested", // Changes requested; provider must resubmit.
  "accepted",       // Delivery accepted by receiver.
  "issue_reported", // Shortage or quality issue filed.
  "reconciled",     // Actual headcount and cost reconciled.
] as const
export type MenuProposalStatus = (typeof MENU_PROPOSAL_STATUSES)[number]

export interface MenuProposalChange {
  requested_by_user_id: string
  requested_at: string
  change_notes: string
}

export interface DeliveryIssue {
  issue_type: "shortage" | "quality" | "wrong_item" | "late_delivery"
  description: string
  reported_by_user_id: string
  reported_at: string
  /** Quantity affected. */
  quantity_affected: number | null
}

export interface MenuProposal {
  id: string
  meal_service_id: string
  org_id: string

  status: MenuProposalStatus

  /** Provider-submitted menu description or document reference. */
  menu_description: string
  proposed_cost_per_head: number | null
  proposed_flat_cost: number | null
  currency: string

  approved_by_user_id: string | null
  approved_at: string | null

  changes_requested: MenuProposalChange[]

  /** Acceptance record. */
  accepted_by_user_id: string | null
  accepted_at: string | null

  delivery_issues: DeliveryIssue[]

  /** Actual headcount confirmed at delivery. */
  actual_headcount: number | null
  /** Actual cost from invoice. */
  actual_cost: number | null

  created_at: string
  updated_at: string
}

export function approveMenuProposal(
  proposal: MenuProposal,
  approvedByUserId: string,
  approvedAt: string,
): MenuProposal {
  if (proposal.status !== "proposed" && proposal.status !== "change_requested") {
    throw new Error(`Menu proposal must be in 'proposed' or 'change_requested' state to approve; current: '${proposal.status}'`)
  }
  return { ...proposal, status: "approved", approved_by_user_id: approvedByUserId, approved_at: approvedAt, updated_at: approvedAt }
}

export function acceptDelivery(
  proposal: MenuProposal,
  acceptedByUserId: string,
  acceptedAt: string,
  actualHeadcount: number | null,
  actualCost: number | null,
): MenuProposal {
  if (proposal.status !== "approved" && proposal.status !== "issue_reported") {
    throw new Error(`Delivery can only be accepted on approved or issue_reported proposals; current: '${proposal.status}'`)
  }
  return {
    ...proposal,
    status: "accepted",
    accepted_by_user_id: acceptedByUserId,
    accepted_at: acceptedAt,
    actual_headcount: actualHeadcount,
    actual_cost: actualCost,
    updated_at: acceptedAt,
  }
}

export function reportDeliveryIssue(
  proposal: MenuProposal,
  issue: DeliveryIssue,
): MenuProposal {
  return {
    ...proposal,
    status: "issue_reported",
    delivery_issues: [...proposal.delivery_issues, issue],
    updated_at: issue.reported_at,
  }
}

// ============================================================================
// CATER-305 — Hospitality delivery checklist
// ============================================================================

export type DeliveryItemStatus =
  | "pending"
  | "accepted"      // Delivered in full and accepted.
  | "variance"      // Delivered with quantity/quality variance.
  | "missing"       // Not delivered.

export interface DeliveryChecklistItem {
  id: string
  /** Backref to HospitalityRequirement. */
  requirement_id: string | null
  label: string
  quantity_expected: number
  quantity_delivered: number | null
  status: DeliveryItemStatus
  /** Variance description when status === "variance". */
  variance_notes: string | null
  room_or_location: string | null
  /** UTC ISO of delivery window start. */
  delivery_window_start_utc: string | null
  /** UTC ISO of delivery window end. */
  delivery_window_end_utc: string | null
  provider_name: string | null
  accepted_by_user_id: string | null
  accepted_at_utc: string | null
  /** Link to venue advance item. */
  advance_item_id: string | null
  /** Link to site-map zone or marker. */
  site_map_ref: string | null
  /** Link to logistics task. */
  logistics_task_id: string | null
}

export function acceptDeliveryItem(
  item: DeliveryChecklistItem,
  quantityDelivered: number,
  acceptedByUserId: string,
  acceptedAtUtc: string,
): DeliveryChecklistItem {
  const hasVariance = quantityDelivered < item.quantity_expected
  return {
    ...item,
    quantity_delivered: quantityDelivered,
    status: hasVariance ? "variance" : "accepted",
    variance_notes: hasVariance
      ? `Expected ${item.quantity_expected}, received ${quantityDelivered}`
      : null,
    accepted_by_user_id: acceptedByUserId,
    accepted_at_utc: acceptedAtUtc,
  }
}

export function buildDeliveryChecklistSummary(items: readonly DeliveryChecklistItem[]): {
  total: number
  accepted: number
  variance: number
  missing: number
  pending: number
  is_complete: boolean
} {
  const counts = { accepted: 0, variance: 0, missing: 0, pending: 0 }
  for (const item of items) counts[item.status]++
  return {
    total: items.length,
    ...counts,
    is_complete: counts.pending === 0 && counts.missing === 0,
  }
}

// ============================================================================
// CATER-306 — Crew/vendor publication projections
// ============================================================================

/** What a crew member sees about a meal service. */
export interface ProjectedCrewMealView {
  meal_service_id: string
  meal_type: MealType
  service_date: string
  window_start_utc: string
  window_end_utc: string
  location_label: string
  provider_name: string | null
  menu_notes: string | null
  /**
   * Individual dietary note — only present when the crew member's own record
   * is being projected AND hasCoordinatorCap is true for that field.
   * Never includes other people's dietary data.
   */
  personal_dietary_note: string | null
}

/** What a vendor sees about a delivery — aggregates only, no names. */
export interface ProjectedVendorDeliveryView {
  meal_service_id: string
  meal_type: MealType
  service_date: string
  window_start_utc: string
  window_end_utc: string
  location_label: string
  /** Total authorized headcount (no breakdown by group/name). */
  authorized_headcount: number
  /** Dietary aggregates only — no individual names or IDs. */
  dietary_aggregates: DietaryAggregate[]
  accessibility_aggregates: AccessibilityAggregate[]
  /** Versioned menu instructions the vendor may act on. */
  menu_instructions: string | null
  /** Contact name/phone for this delivery (operational only). */
  contact_name: string | null
  contact_phone: string | null
  // NEVER: individual names, person IDs, headcount breakdown, financial data
}

/**
 * Build a crew view for a meal service.
 * If `personalDietaryNote` is passed it belongs to the requesting crew member only.
 */
export function buildCrewMealView(
  service: MealService,
  personalDietaryNote: string | null,
): ProjectedCrewMealView {
  return {
    meal_service_id: service.id,
    meal_type: service.meal_type,
    service_date: service.service_date,
    window_start_utc: service.window.window_start_utc,
    window_end_utc: service.window.window_end_utc,
    location_label: service.location_label,
    provider_name: service.provider_name,
    menu_notes: service.menu_notes,
    personal_dietary_note: personalDietaryNote,
  }
}

/**
 * Build a vendor delivery view.
 * Takes an authoritative headcount snapshot; strips all individual identifiers.
 * `contactName` and `contactPhone` must be the operational contact only — never
 * the crew member who has dietary requirements.
 */
export function buildVendorDeliveryView(
  service: MealService,
  headcount: MealHeadcount,
  menuInstructions: string | null,
  contactName: string | null,
  contactPhone: string | null,
): ProjectedVendorDeliveryView {
  return {
    meal_service_id: service.id,
    meal_type: service.meal_type,
    service_date: service.service_date,
    window_start_utc: service.window.window_start_utc,
    window_end_utc: service.window.window_end_utc,
    location_label: service.location_label,
    authorized_headcount: headcount.included_count,
    dietary_aggregates: headcount.dietary_aggregates,
    accessibility_aggregates: headcount.accessibility_aggregates,
    menu_instructions: menuInstructions,
    contact_name: contactName,
    contact_phone: contactPhone,
  }
}
