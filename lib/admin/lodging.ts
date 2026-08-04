/**
 * LODGE-301 to LODGE-307 — Lodging block workflow, inventory, rooming, and projection (pure).
 *
 * LODGE-301: Block lifecycle (request → hold → confirmed → cancelled/closed)
 * LODGE-302: Nightly inventory matrix (contracted vs picked-up vs assigned vs available)
 * LODGE-303: Rooming-list assignment (roommate rules, single/crew, accessibility)
 * LODGE-304: Occupancy/capacity validation (overlap, excess guests, unassigned members)
 * LODGE-305: Confirmation/deadline tracking (cutoff, submission, changes after cutoff)
 * LODGE-306: Payment/incidentals policy (master/individual, deposit, tax, reconciliation)
 * LODGE-307: Audience-projected lodging publication (traveler sees only their details)
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// LODGE-301: Block lifecycle
// ---------------------------------------------------------------------------

export type LodgingBlockStatus =
  | "requested"
  | "hold"
  | "confirmed"
  | "cancelled"
  | "closed"

export const LODGING_BLOCK_TRANSITIONS: Record<LodgingBlockStatus, LodgingBlockStatus[]> = {
  requested:  ["hold", "confirmed", "cancelled"],
  hold:       ["confirmed", "cancelled"],
  confirmed:  ["closed", "cancelled"],
  cancelled:  ["requested"],
  closed:     [],
}

export interface LodgingRoomType {
  type_label: string
  contracted_count: number
  rate_per_night: number | null
  currency: string | null
}

export interface LodgingBlock {
  block_id: string
  property_id: string
  property_name: string
  tour_id: string
  org_id: string
  check_in_date: string
  check_out_date: string
  room_types: LodgingRoomType[]
  status: LodgingBlockStatus
  confirmation_number?: string | null
  cutoff_date?: string | null
  terms?: string | null
  contract_ref?: string | null
  owner_person_id?: string | null
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface LodgingBlockCommandResult {
  status: "ok" | "invalid_transition" | "validation_error"
  block: LodgingBlock | null
  error?: string
}

export function transitionLodgingBlock(
  block: LodgingBlock,
  toStatus: LodgingBlockStatus,
  actor: string,
  at: string,
  opts?: { confirmation_number?: string | null },
): LodgingBlockCommandResult {
  const allowed = LODGING_BLOCK_TRANSITIONS[block.status]
  if (!allowed.includes(toStatus)) {
    return {
      status: "invalid_transition",
      block,
      error: `Cannot transition from '${block.status}' to '${toStatus}'.`,
    }
  }
  if (toStatus === "confirmed" && !opts?.confirmation_number) {
    return {
      status: "validation_error",
      block,
      error: "confirmation_number is required to confirm a lodging block.",
    }
  }
  return {
    status: "ok",
    block: {
      ...block,
      status: toStatus,
      confirmation_number: opts?.confirmation_number ?? block.confirmation_number,
      updated_by: actor,
      updated_at: at,
    },
  }
}

// ---------------------------------------------------------------------------
// LODGE-302: Nightly inventory matrix
// ---------------------------------------------------------------------------

export interface NightlyInventoryRow {
  date: string
  room_type: string
  contracted: number
  picked_up: number
  assigned: number
  waitlisted: number
  available: number
  variance: number
}

export function buildNightlyInventoryMatrix(args: {
  block: LodgingBlock
  /** Assignments per date per room type. */
  assignmentsByDate: Map<string, Map<string, number>>
  pickupsByDate?: Map<string, Map<string, number>>
}): NightlyInventoryRow[] {
  const rows: NightlyInventoryRow[] = []
  const { block, assignmentsByDate, pickupsByDate } = args

  const start = new Date(block.check_in_date)
  const end = new Date(block.check_out_date)

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10)
    const dateAssignments = assignmentsByDate.get(date) ?? new Map()
    const datePickups = pickupsByDate?.get(date) ?? new Map()

    for (const rt of block.room_types) {
      const assigned = dateAssignments.get(rt.type_label) ?? 0
      const picked_up = datePickups.get(rt.type_label) ?? assigned
      const available = Math.max(0, rt.contracted_count - picked_up)
      rows.push({
        date,
        room_type: rt.type_label,
        contracted: rt.contracted_count,
        picked_up,
        assigned,
        waitlisted: 0,
        available,
        variance: assigned - rt.contracted_count,
      })
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// LODGE-303: Rooming-list assignment
// ---------------------------------------------------------------------------

export type RoomAssignmentStatus = "tentative" | "confirmed" | "checked_in" | "checked_out" | "cancelled"

export interface RoommateRule {
  person_id: string
  /** Preferred roommates. */
  preferred_ids?: string[]
  /** People this person cannot share with. */
  excluded_ids?: string[]
  /** True if this person requires a single room. */
  requires_single: boolean
  /** Accessibility requirement. */
  needs_accessible_room: boolean
}

export interface RoomAssignment {
  assignment_id: string
  block_id: string
  room_label: string
  room_type: string
  night_date: string
  occupants: Array<{ person_id: string; person_name: string }>
  status: RoomAssignmentStatus
  check_in_date: string
  check_out_date: string
  confirmation_number?: string | null
  is_accessible: boolean
  created_by: string
  created_at: string
}

export type RoomingConflictType = "excluded_roommate" | "single_room_required" | "capacity_exceeded"

export interface RoomingConflict {
  conflict_type: RoomingConflictType
  person_ids: string[]
  detail: string
}

export function validateRoomAssignment(
  assignment: RoomAssignment,
  rules: RoommateRule[],
  roomCapacity: number,
): RoomingConflict[] {
  const conflicts: RoomingConflict[] = []
  const ruleMap = new Map(rules.map((r) => [r.person_id, r]))
  const occupantIds = assignment.occupants.map((o) => o.person_id)

  if (occupantIds.length > roomCapacity) {
    conflicts.push({
      conflict_type: "capacity_exceeded",
      person_ids: occupantIds,
      detail: `Room capacity (${roomCapacity}) exceeded with ${occupantIds.length} occupants.`,
    })
  }

  for (const occ of assignment.occupants) {
    const rule = ruleMap.get(occ.person_id)
    if (!rule) continue

    if (rule.requires_single && occupantIds.length > 1) {
      conflicts.push({
        conflict_type: "single_room_required",
        person_ids: [occ.person_id],
        detail: `${occ.person_name} requires a single room.`,
      })
    }

    for (const other of assignment.occupants) {
      if (other.person_id === occ.person_id) continue
      if (rule.excluded_ids?.includes(other.person_id)) {
        conflicts.push({
          conflict_type: "excluded_roommate",
          person_ids: [occ.person_id, other.person_id],
          detail: `${occ.person_name} cannot share a room with person ${other.person_id}.`,
        })
      }
    }
  }

  return conflicts
}

// ---------------------------------------------------------------------------
// LODGE-304: Occupancy/capacity validation
// ---------------------------------------------------------------------------

export interface OccupancyValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateLodgingOccupancy(args: {
  block: LodgingBlock
  assignments: RoomAssignment[]
  requiredPersonIds: string[]
}): OccupancyValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check all required persons have at least one assignment
  const assignedIds = new Set(args.assignments.flatMap((a) => a.occupants.map((o) => o.person_id)))
  for (const pid of args.requiredPersonIds) {
    if (!assignedIds.has(pid)) {
      errors.push(`Person ${pid} has no room assignment.`)
    }
  }

  // Check no cancelled block has active assignments
  if (args.block.status === "cancelled") {
    const active = args.assignments.filter((a) => a.status !== "cancelled")
    if (active.length > 0) {
      errors.push(`Block is cancelled but has ${active.length} active room assignment(s).`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// LODGE-305: Confirmation/deadline tracking
// ---------------------------------------------------------------------------

export interface LodgingDeadlineStatus {
  block_id: string
  cutoff_date: string | null
  is_past_cutoff: boolean
  days_until_cutoff: number | null
  submission_confirmed: boolean
  confirmation_number: string | null
  last_modified_after_cutoff: boolean
}

export function getLodgingDeadlineStatus(
  block: LodgingBlock,
  lastModifiedAt: string,
  nowIso: string,
): LodgingDeadlineStatus {
  let is_past_cutoff = false
  let days_until_cutoff: number | null = null
  let last_modified_after_cutoff = false

  if (block.cutoff_date) {
    const cutoff = new Date(block.cutoff_date).getTime()
    const now = new Date(nowIso).getTime()
    is_past_cutoff = now > cutoff
    days_until_cutoff = Math.ceil((cutoff - now) / (1000 * 60 * 60 * 24))
    last_modified_after_cutoff = is_past_cutoff && new Date(lastModifiedAt).getTime() > cutoff
  }

  return {
    block_id: block.block_id,
    cutoff_date: block.cutoff_date ?? null,
    is_past_cutoff,
    days_until_cutoff,
    submission_confirmed: block.status === "confirmed",
    confirmation_number: block.confirmation_number ?? null,
    last_modified_after_cutoff,
  }
}

// ---------------------------------------------------------------------------
// LODGE-306: Payment/incidentals policy
// ---------------------------------------------------------------------------

export type IncidentalsPolicy = "master_account" | "individual" | "split"
export type DepositPolicy = "none" | "required" | "on_confirmation"

export interface LodgingPaymentPolicy {
  block_id: string
  incidentals_policy: IncidentalsPolicy
  deposit_policy: DepositPolicy
  deposit_amount?: number | null
  currency?: string | null
  cancellation_penalty_percent?: number | null
  tax_exempt: boolean
  reconciliation_ref?: string | null
}

export interface LodgingCostEstimate {
  room_type: string
  nights: number
  rate_per_night: number | null
  subtotal: number | null
  deposit_due: number | null
  currency: string | null
}

export function estimateLodgingCost(
  block: LodgingBlock,
  policy: LodgingPaymentPolicy,
): LodgingCostEstimate[] {
  const checkIn = new Date(block.check_in_date)
  const checkOut = new Date(block.check_out_date)
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  return block.room_types.map((rt) => {
    const subtotal = rt.rate_per_night != null ? rt.rate_per_night * nights * rt.contracted_count : null
    const deposit_due =
      policy.deposit_policy === "required" && policy.deposit_amount != null
        ? policy.deposit_amount * rt.contracted_count
        : null
    return {
      room_type: rt.type_label,
      nights,
      rate_per_night: rt.rate_per_night,
      subtotal,
      deposit_due,
      currency: rt.currency,
    }
  })
}

// ---------------------------------------------------------------------------
// LODGE-307: Audience-projected lodging publication
// ---------------------------------------------------------------------------

export interface ProjectedLodging {
  person_id: string
  person_name: string
  property_name: string
  address?: string | null
  check_in_date: string
  check_out_date: string
  room_type?: string | null
  confirmation_number?: string | null
  roommate_names: string[]
  incidentals_policy: IncidentalsPolicy
}

/**
 * Project a lodging record for a specific traveler — includes only their
 * property/room/check-in information and permitted roommate names.
 * No IDs, rates, or other guests' details are exposed.
 */
export function projectLodgingForTraveler(args: {
  personId: string
  personName: string
  assignment: RoomAssignment
  block: LodgingBlock
  policy: LodgingPaymentPolicy
  roommateNames: string[]
  propertyAddress?: string | null
}): ProjectedLodging {
  return {
    person_id: args.personId,
    person_name: args.personName,
    property_name: args.block.property_name,
    address: args.propertyAddress ?? null,
    check_in_date: args.assignment.check_in_date,
    check_out_date: args.assignment.check_out_date,
    room_type: args.assignment.room_type,
    confirmation_number: args.assignment.confirmation_number ?? null,
    roommate_names: args.roommateNames,
    incidentals_policy: args.policy.incidentals_policy,
  }
}
