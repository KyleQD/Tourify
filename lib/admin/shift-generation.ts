/**
 * WORK-408 — Bulk shift generation (pure, transactional semantics).
 *
 * Accepts a generation request (one or more dates × shift definitions) and
 * produces an item-level result for every candidate shift. The caller owns the
 * actual DB write; this module provides the pure decision engine.
 *
 * Key guarantees:
 *   - Idempotency key per candidate: (tour_id, date, slot_id). Duplicate keys
 *     in the input or against already-existing shifts are detected and skipped.
 *   - Locked shifts are never overwritten.
 *   - All five StaffingColumnType days are first-class (show/travel/rehearsal/
 *     warehouse/other).
 *   - Returns a typed item-level result array plus summary counts.
 *   - No I/O — caller passes pre-fetched existing shifts.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Matches StaffingColumnType from WORK-402. */
export type ShiftDayType = "show" | "travel" | "rehearsal" | "warehouse" | "other"

export interface ShiftGenerationCandidate {
  /** Stable idempotency key scoped to (tour_id, date, slot_id). */
  idempotency_key: string
  tour_id: string
  event_id?: string | null
  /** YYYY-MM-DD */
  date: string
  slot_id: string
  role_label: string
  department: string
  day_type: ShiftDayType
  /** ISO local-wall datetime. */
  start_local: string
  /** ISO local-wall datetime. */
  end_local: string
  headcount_required: number
  skill_tags: string[]
  location_label?: string | null
  notes?: string | null
}

/** An already-persisted shift used for conflict/idempotency checks. */
export interface PersistedShift {
  shift_id: string
  idempotency_key?: string | null
  date: string
  slot_id?: string | null
  role_label: string
  start_local: string
  end_local: string
  is_locked: boolean
}

export interface BulkShiftGenerationRequest {
  tour_id: string
  /** Candidate shifts to generate. May span multiple dates/day-types. */
  candidates: ShiftGenerationCandidate[]
  /** Already-persisted shifts for the dates covered by this request. */
  existing_shifts: PersistedShift[]
  /** When true, soft conflicts (non-locked) are overridden and created anyway. */
  override_soft_conflicts?: boolean
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type ShiftGenerationResultCode =
  | "created"                  // new shift will be written
  | "duplicate_idempotency"    // exact idempotency_key already exists → skip
  | "locked_conflict"          // overlaps a locked shift → blocked
  | "soft_conflict"            // overlaps an unlocked shift → skipped (unless override)
  | "invalid_window"           // end_local ≤ start_local or malformed dates

export interface ShiftGenerationItem {
  idempotency_key: string
  slot_id: string
  role_label: string
  date: string
  day_type: ShiftDayType
  result: ShiftGenerationResultCode
  start_local: string | null
  end_local: string | null
  /** IDs of conflicting persisted shifts (if applicable). */
  conflict_shift_ids: string[]
  detail?: string | null
}

export interface BulkShiftGenerationResult {
  tour_id: string
  items: ShiftGenerationItem[]
  created_count: number
  skipped_count: number
  /** True when every candidate produced result=created. */
  all_created: boolean
  /** Summary of skip reasons. */
  skip_summary: {
    duplicate_idempotency: number
    locked_conflict: number
    soft_conflict: number
    invalid_window: number
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** True when two [start, end) local-wall ISO intervals overlap. */
function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** True when window is valid (start < end, both are non-empty strings). */
export function isValidShiftWindow(startLocal: string, endLocal: string): boolean {
  if (!startLocal || !endLocal) return false
  return startLocal < endLocal
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

export function generateShifts(request: BulkShiftGenerationRequest): BulkShiftGenerationResult {
  const { candidates, existing_shifts, tour_id, override_soft_conflicts = false } = request

  // Build lookup sets from existing shifts
  const existingIdempotencyKeys = new Set(
    existing_shifts.filter((s) => s.idempotency_key).map((s) => s.idempotency_key as string),
  )

  const items: ShiftGenerationItem[] = []

  // Track idempotency keys seen within this batch (to detect intra-batch duplicates)
  const seenInBatch = new Set<string>()

  for (const candidate of candidates) {
    const { idempotency_key, slot_id, role_label, date, day_type, start_local, end_local } = candidate

    // 1. Validate window
    if (!isValidShiftWindow(start_local, end_local)) {
      items.push({
        idempotency_key,
        slot_id,
        role_label,
        date,
        day_type,
        result: "invalid_window",
        start_local: null,
        end_local: null,
        conflict_shift_ids: [],
        detail: `Invalid shift window: start='${start_local}' end='${end_local}'`,
      })
      continue
    }

    // 2. Idempotency check (existing + within-batch)
    if (existingIdempotencyKeys.has(idempotency_key) || seenInBatch.has(idempotency_key)) {
      items.push({
        idempotency_key,
        slot_id,
        role_label,
        date,
        day_type,
        result: "duplicate_idempotency",
        start_local,
        end_local,
        conflict_shift_ids: [],
        detail: `Shift with idempotency_key '${idempotency_key}' already exists.`,
      })
      continue
    }

    // 3. Conflict check against existing shifts on the same date
    const sameDateShifts = existing_shifts.filter((s) => s.date === date)

    const lockedConflicts = sameDateShifts.filter(
      (s) => s.is_locked && intervalsOverlap(start_local, end_local, s.start_local, s.end_local),
    )

    if (lockedConflicts.length > 0) {
      items.push({
        idempotency_key,
        slot_id,
        role_label,
        date,
        day_type,
        result: "locked_conflict",
        start_local,
        end_local,
        conflict_shift_ids: lockedConflicts.map((s) => s.shift_id),
        detail: `Locked conflict with shift(s): ${lockedConflicts.map((s) => s.shift_id).join(", ")}`,
      })
      continue
    }

    const softConflicts = sameDateShifts.filter(
      (s) => !s.is_locked && intervalsOverlap(start_local, end_local, s.start_local, s.end_local),
    )

    if (softConflicts.length > 0 && !override_soft_conflicts) {
      items.push({
        idempotency_key,
        slot_id,
        role_label,
        date,
        day_type,
        result: "soft_conflict",
        start_local,
        end_local,
        conflict_shift_ids: softConflicts.map((s) => s.shift_id),
        detail: `Soft conflict with shift(s): ${softConflicts.map((s) => s.shift_id).join(", ")}`,
      })
      continue
    }

    // 4. Create
    seenInBatch.add(idempotency_key)
    items.push({
      idempotency_key,
      slot_id,
      role_label,
      date,
      day_type,
      result: "created",
      start_local,
      end_local,
      conflict_shift_ids: softConflicts.map((s) => s.shift_id), // soft conflicts noted even when overridden
    })
  }

  // Tally
  const createdCount = items.filter((i) => i.result === "created").length
  const skippedCount = items.filter((i) => i.result !== "created").length

  const skipSummary = {
    duplicate_idempotency: items.filter((i) => i.result === "duplicate_idempotency").length,
    locked_conflict: items.filter((i) => i.result === "locked_conflict").length,
    soft_conflict: items.filter((i) => i.result === "soft_conflict").length,
    invalid_window: items.filter((i) => i.result === "invalid_window").length,
  }

  return {
    tour_id,
    items,
    created_count: createdCount,
    skipped_count: skippedCount,
    all_created: skippedCount === 0,
    skip_summary: skipSummary,
  }
}
