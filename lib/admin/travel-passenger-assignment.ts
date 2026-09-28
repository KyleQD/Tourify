/**
 * TRAVEL-303 — Passenger assignment workflow (pure).
 *
 * Bulk-assigns party members to a travel segment with preview.
 * Before committing, the preview identifies:
 *
 *  - capacity conflicts   — more passengers than segment capacity
 *  - duplicate assignments — person already assigned to this segment
 *  - overlap conflicts    — person is assigned to an overlapping segment
 *  - accessibility flags  — member has accessibility requirements not met
 *  - missing ticket       — ticketed segment but passenger has no ticket
 *
 * All conflicts are actionable — caller decides to skip, override, or abort.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PassengerAssignmentStatus =
  | "pending"     // created, not yet acknowledged
  | "confirmed"   // acknowledged by the passenger
  | "checked_in"  // physically checked in
  | "no_show"     // did not appear
  | "cancelled"   // removed from the segment

export interface PassengerAssignment {
  assignment_id: string
  segment_id: string
  person_id: string
  person_name: string
  /** Seat/berth label. Null for unassigned. */
  seat_label?: string | null
  /** External ticket reference for ticketed segments. */
  ticket_reference?: string | null
  status: PassengerAssignmentStatus
  /** True if member has accessibility requirements. */
  has_accessibility_needs: boolean
  /** True if the segment accommodates those needs. */
  accessibility_met: boolean
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

/** A segment relevant to overlap checking. */
export interface OverlapCheckSegment {
  segment_id: string
  departure_utc: string | null
  arrival_utc: string | null
}

// ---------------------------------------------------------------------------
// Preview types
// ---------------------------------------------------------------------------

export type AssignmentConflictType =
  | "capacity"        // segment is full
  | "duplicate"       // person already on this segment
  | "overlap"         // person has another active segment at the same time
  | "accessibility"   // accessibility needs not met
  | "missing_ticket"  // segment is ticketed but person lacks a ticket

export interface AssignmentConflict {
  conflict_type: AssignmentConflictType
  person_id: string
  person_name: string
  detail: string
  /** Whether this conflict can be overridden (operator decision). */
  overridable: boolean
  /** Whether this conflict should be a hard block (non-overridable). */
  blocking: boolean
}

export interface BulkAssignmentPreviewItem {
  person_id: string
  person_name: string
  conflicts: AssignmentConflict[]
  /** Whether this person can be assigned given their conflicts. */
  can_assign: boolean
}

export interface BulkAssignmentPreview {
  segment_id: string
  candidates: BulkAssignmentPreviewItem[]
  /** Total number of people that can be assigned. */
  assignable_count: number
  /** Total number blocked by non-overridable conflicts. */
  blocked_count: number
  /** Whether the whole batch can proceed (no blocking conflicts). */
  can_proceed: boolean
}

export interface BulkAssignmentResult {
  /** Assignments that were created. */
  created: PassengerAssignment[]
  /** People who were skipped (had blocking or non-overridden conflicts). */
  skipped: BulkAssignmentPreviewItem[]
  /** People who were force-assigned despite overridable conflicts. */
  overridden: PassengerAssignment[]
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface BulkAssignInput {
  segment_id: string
  /** Max passengers the segment can carry. */
  segment_capacity: number | null
  /** Whether the segment requires tickets. */
  segment_is_ticketed: boolean
  departure_utc: string | null
  arrival_utc: string | null
  /** Existing assignments on this segment (before bulk op). */
  existing_assignments: PassengerAssignment[]
  /** Candidates to assign. */
  candidates: Array<{
    person_id: string
    person_name: string
    has_accessibility_needs: boolean
    accessibility_met: boolean
    ticket_reference?: string | null
    /** Active segments for this person (for overlap check). */
    active_segments: OverlapCheckSegment[]
  }>
  /** Ids of people to override conflicts for (force-assign). */
  override_ids?: Set<string>
  actor: string
  at: string
}

// ---------------------------------------------------------------------------
// Overlap detection
// ---------------------------------------------------------------------------

function overlaps(
  a: { departure_utc: string | null; arrival_utc: string | null },
  b: { departure_utc: string | null; arrival_utc: string | null },
): boolean {
  if (!a.departure_utc || !a.arrival_utc || !b.departure_utc || !b.arrival_utc) return false
  const aStart = new Date(a.departure_utc).getTime()
  const aEnd = new Date(a.arrival_utc).getTime()
  const bStart = new Date(b.departure_utc).getTime()
  const bEnd = new Date(b.arrival_utc).getTime()
  return aStart < bEnd && aEnd > bStart
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Generate a preview of what would happen if the bulk assignment were executed.
 * Does not modify any state.
 */
export function previewBulkAssignment(input: BulkAssignInput): BulkAssignmentPreview {
  const { candidates, existing_assignments, segment_capacity, segment_is_ticketed, segment_id } = input

  const existingPersonIds = new Set(existing_assignments.map((a) => a.person_id))
  const currentCount = existing_assignments.length

  const items: BulkAssignmentPreviewItem[] = candidates.map((cand, idx) => {
    const conflicts: AssignmentConflict[] = []

    // Capacity check: total after adding all candidates
    const wouldBeTotal = currentCount + idx + 1
    if (segment_capacity !== null && wouldBeTotal > segment_capacity) {
      conflicts.push({
        conflict_type: "capacity",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `Segment capacity (${segment_capacity}) would be exceeded.`,
        overridable: false,
        blocking: true,
      })
    }

    // Duplicate check
    if (existingPersonIds.has(cand.person_id)) {
      conflicts.push({
        conflict_type: "duplicate",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `${cand.person_name} is already assigned to this segment.`,
        overridable: false,
        blocking: true,
      })
    }

    // Overlap check
    for (const seg of cand.active_segments) {
      if (seg.segment_id === segment_id) continue // skip same segment
      if (
        overlaps(
          { departure_utc: input.departure_utc, arrival_utc: input.arrival_utc },
          seg,
        )
      ) {
        conflicts.push({
          conflict_type: "overlap",
          person_id: cand.person_id,
          person_name: cand.person_name,
          detail: `${cand.person_name} has an overlapping travel segment (${seg.segment_id}).`,
          overridable: true,
          blocking: false,
        })
        break
      }
    }

    // Accessibility check
    if (cand.has_accessibility_needs && !cand.accessibility_met) {
      conflicts.push({
        conflict_type: "accessibility",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `${cand.person_name} has accessibility requirements not met by this segment.`,
        overridable: true,
        blocking: false,
      })
    }

    // Missing ticket check
    if (segment_is_ticketed && !cand.ticket_reference) {
      conflicts.push({
        conflict_type: "missing_ticket",
        person_id: cand.person_id,
        person_name: cand.person_name,
        detail: `Segment requires tickets but ${cand.person_name} has no ticket reference.`,
        overridable: true,
        blocking: false,
      })
    }

    const hasBlocking = conflicts.some((c) => c.blocking)
    return {
      person_id: cand.person_id,
      person_name: cand.person_name,
      conflicts,
      can_assign: !hasBlocking,
    }
  })

  const assignable_count = items.filter((i) => i.can_assign).length
  const blocked_count = items.filter((i) => !i.can_assign).length

  return {
    segment_id,
    candidates: items,
    assignable_count,
    blocked_count,
    can_proceed: blocked_count === 0,
  }
}

// ---------------------------------------------------------------------------
// Execute bulk assignment
// ---------------------------------------------------------------------------

/**
 * Execute the bulk passenger assignment.
 *
 * People with blocking conflicts are skipped unless their person_id is in
 * `override_ids` (only non-blocking conflicts can be overridden — blocking
 * ones like capacity/duplicate always block).
 */
export function executeBulkAssignment(input: BulkAssignInput): BulkAssignmentResult {
  const preview = previewBulkAssignment(input)
  const created: PassengerAssignment[] = []
  const skipped: BulkAssignmentPreviewItem[] = []
  const overridden: PassengerAssignment[] = []

  const overrideIds = input.override_ids ?? new Set<string>()
  const candidateMap = new Map(input.candidates.map((c) => [c.person_id, c]))

  for (const item of preview.candidates) {
    const cand = candidateMap.get(item.person_id)
    if (!cand) continue

    // Blocking conflicts are never overridable
    const hasBlocking = item.conflicts.some((c) => c.blocking)
    if (hasBlocking) {
      skipped.push(item)
      continue
    }

    const hasOverridable = item.conflicts.some((c) => !c.blocking)
    const forceOverride = hasOverridable && overrideIds.has(item.person_id)

    if (hasOverridable && !forceOverride) {
      skipped.push(item)
      continue
    }

    const assignment: PassengerAssignment = {
      assignment_id: `pa-${input.segment_id}-${item.person_id}`,
      segment_id: input.segment_id,
      person_id: item.person_id,
      person_name: item.person_name,
      seat_label: null,
      ticket_reference: cand.ticket_reference ?? null,
      status: "pending",
      has_accessibility_needs: cand.has_accessibility_needs,
      accessibility_met: cand.accessibility_met,
      created_by: input.actor,
      created_at: input.at,
      updated_by: input.actor,
      updated_at: input.at,
    }

    if (forceOverride) {
      overridden.push(assignment)
    } else {
      created.push(assignment)
    }
  }

  return { created, skipped, overridden }
}
