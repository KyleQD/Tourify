/**
 * WORK-402 — Tour-wide staffing matrix (pure).
 *
 * Builds a matrix with:
 *   - Rows: role/department slots (required headcount per role)
 *   - Columns: stops/days in the tour (incl. travel and non-venue days)
 *   - Cells: coverage state per role × column (filled/partial/open/conflict/N/A)
 *   - Open positions: unfilled required headcount
 *   - Conflict flags: double-booked or availability-blocked assignments
 *   - Filters: by department, stop type, person, status, date range
 *
 * Column types are first-class:
 *   "show"       — event/venue day
 *   "travel"     — travel leg between stops
 *   "rehearsal"  — rehearsal day
 *   "warehouse"  — warehouse / production day
 *   "rest"       — rest / day off
 *   "other"      — any other non-venue day
 *
 * Pure: no I/O, no `server-only`.
 */

import type { TourPartyMember, TourPartyMemberStatus } from "@/lib/admin/tour-party-model"
import { memberIsActiveOnDate } from "@/lib/admin/tour-party-model"

// ---------------------------------------------------------------------------
// Column types (stops / days)
// ---------------------------------------------------------------------------

export type StaffingColumnType =
  | "show"
  | "travel"
  | "rehearsal"
  | "warehouse"
  | "rest"
  | "other"

export interface StaffingColumn {
  column_id: string
  /** ISO date (YYYY-MM-DD) this column represents. */
  date: string
  type: StaffingColumnType
  /** Human label, e.g. "Nashville – Show" or "Travel DAL→NYC". */
  label: string
  /** Linked stop or leg ID in the tour plan. */
  stop_id: string | null
  leg_id: string | null
  /** IANA timezone for displaying local times on this day. */
  iana_zone: string
}

// ---------------------------------------------------------------------------
// Row types (role slots)
// ---------------------------------------------------------------------------

export interface StaffingRow {
  row_id: string
  role_title: string
  department: string | null
  /** Required headcount for this role across the tour. */
  required_headcount: number
  /** IDs of party members assigned to this role. */
  assigned_member_ids: string[]
  /** True when this role is an open/unfilled position. */
  is_open_position: boolean
}

// ---------------------------------------------------------------------------
// Cell coverage state
// ---------------------------------------------------------------------------

export type StaffingCellState =
  | "filled"        // required headcount met, no conflicts
  | "partial"       // some but not all required headcount filled
  | "open"          // zero filled (role required on this day)
  | "conflict"      // filled but at least one conflict present
  | "not_applicable"// role not required on this day / member not active

export interface StaffingConflict {
  conflict_type:
    | "double_booked"       // same person assigned to overlapping shifts
    | "availability_blocked"// person marked unavailable on this date
    | "credential_expired"  // required credential not held/valid
    | "status_invalid"      // member not in an active status
  member_id: string
  detail: string
}

export interface StaffingCell {
  row_id: string
  column_id: string
  state: StaffingCellState
  /** Number of active confirmed/accepted assignments for this role on this day. */
  filled_count: number
  required_count: number
  /** Members assigned (operational projection only). */
  assigned_member_ids: string[]
  conflicts: StaffingConflict[]
}

// ---------------------------------------------------------------------------
// Matrix input
// ---------------------------------------------------------------------------

export interface StaffingMatrixInput {
  tour_id: string
  rows: StaffingRow[]
  columns: StaffingColumn[]
  members: TourPartyMember[]
  /** Member IDs with known availability blocks (date → blocked member IDs). */
  availability_blocks?: Map<string, Set<string>>
  /** Member IDs with active status when building the matrix. */
  active_statuses?: Set<TourPartyMemberStatus>
}

/** Default statuses treated as "active" for coverage counting. */
export const ACTIVE_COVERAGE_STATUSES: Set<TourPartyMemberStatus> = new Set([
  "confirmed",
  "accepted",
])

// ---------------------------------------------------------------------------
// Cell builder
// ---------------------------------------------------------------------------

function buildCell(
  row: StaffingRow,
  col: StaffingColumn,
  members: TourPartyMember[],
  availabilityBlocks: Map<string, Set<string>>,
  activeStatuses: Set<TourPartyMemberStatus>,
): StaffingCell {
  // Members assigned to this role who are active on this date
  const assignedActive = members.filter(
    (m) =>
      row.assigned_member_ids.includes(m.member_id) &&
      memberIsActiveOnDate(m, col.date),
  )

  // Check which of these are in a coverage-counting status
  const coveringMembers = assignedActive.filter((m) => activeStatuses.has(m.status))

  const conflicts: StaffingConflict[] = []

  // Detect availability blocks
  const blockedOnDay = availabilityBlocks.get(col.date) ?? new Set<string>()
  for (const m of assignedActive) {
    if (blockedOnDay.has(m.member_id)) {
      conflicts.push({
        conflict_type: "availability_blocked",
        member_id: m.member_id,
        detail: `${m.role_title} is unavailable on ${col.date}`,
      })
    }
  }

  // Detect status conflicts (assigned but not in a valid status)
  for (const m of assignedActive) {
    if (!activeStatuses.has(m.status)) {
      conflicts.push({
        conflict_type: "status_invalid",
        member_id: m.member_id,
        detail: `Member status '${m.status}' is not active for scheduling`,
      })
    }
  }

  const filledCount = coveringMembers.length
  const requiredCount = row.required_headcount

  let state: StaffingCellState
  if (row.assigned_member_ids.length === 0 && requiredCount === 0) {
    state = "not_applicable"
  } else if (conflicts.length > 0 && filledCount >= requiredCount) {
    state = "conflict"
  } else if (filledCount >= requiredCount) {
    state = "filled"
  } else if (filledCount > 0) {
    state = "partial"
  } else if (assignedActive.length === 0 && requiredCount > 0) {
    state = "open"
  } else {
    state = "partial"
  }

  return {
    row_id: row.row_id,
    column_id: col.column_id,
    state,
    filled_count: filledCount,
    required_count: requiredCount,
    assigned_member_ids: assignedActive.map((m) => m.member_id),
    conflicts,
  }
}

// ---------------------------------------------------------------------------
// Matrix output
// ---------------------------------------------------------------------------

export interface StaffingMatrix {
  tour_id: string
  rows: StaffingRow[]
  columns: StaffingColumn[]
  /** Indexed as cells[row_id][column_id]. */
  cells: Map<string, Map<string, StaffingCell>>
  summary: StaffingMatrixSummary
}

export interface StaffingMatrixSummary {
  total_cells: number
  filled_cells: number
  partial_cells: number
  open_cells: number
  conflict_cells: number
  total_open_positions: number
  total_conflicts: number
  /** Column IDs of travel/non-venue days included in the matrix. */
  non_venue_column_ids: string[]
}

export function buildStaffingMatrix(input: StaffingMatrixInput): StaffingMatrix {
  const {
    tour_id,
    rows,
    columns,
    members,
    availability_blocks = new Map(),
    active_statuses = ACTIVE_COVERAGE_STATUSES,
  } = input

  const cells = new Map<string, Map<string, StaffingCell>>()
  let filled = 0, partial = 0, open = 0, conflict = 0, totalConflicts = 0

  for (const row of rows) {
    const rowCells = new Map<string, StaffingCell>()
    for (const col of columns) {
      const cell = buildCell(row, col, members, availability_blocks, active_statuses)
      rowCells.set(col.column_id, cell)

      switch (cell.state) {
        case "filled":           filled++;   break
        case "partial":          partial++;  break
        case "open":             open++;     break
        case "conflict":         conflict++; break
        case "not_applicable":              break
      }
      totalConflicts += cell.conflicts.length
    }
    cells.set(row.row_id, rowCells)
  }

  const openPositionRows = rows.filter((r) => r.is_open_position)
  const nonVenueCols = columns
    .filter((c) => c.type !== "show")
    .map((c) => c.column_id)

  return {
    tour_id,
    rows,
    columns,
    cells,
    summary: {
      total_cells: rows.length * columns.length,
      filled_cells: filled,
      partial_cells: partial,
      open_cells: open,
      conflict_cells: conflict,
      total_open_positions: openPositionRows.length,
      total_conflicts: totalConflicts,
      non_venue_column_ids: nonVenueCols,
    },
  }
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface StaffingMatrixFilter {
  departments?: string[]
  column_types?: StaffingColumnType[]
  date_from?: string
  date_to?: string
  member_ids?: string[]
  states?: StaffingCellState[]
}

/** Filter rows and columns for a focused view. */
export function filterStaffingMatrix(
  matrix: StaffingMatrix,
  filter: StaffingMatrixFilter,
): { rows: StaffingRow[]; columns: StaffingColumn[]; cells: Map<string, Map<string, StaffingCell>> } {
  const filteredRows = matrix.rows.filter((r) => {
    if (filter.departments?.length && !filter.departments.includes(r.department ?? "")) return false
    return true
  })

  const filteredCols = matrix.columns.filter((c) => {
    if (filter.column_types?.length && !filter.column_types.includes(c.type)) return false
    if (filter.date_from && c.date < filter.date_from) return false
    if (filter.date_to && c.date > filter.date_to) return false
    return true
  })

  const filteredColIds = new Set(filteredCols.map((c) => c.column_id))
  const filteredCells = new Map<string, Map<string, StaffingCell>>()

  for (const row of filteredRows) {
    const rowCells = matrix.cells.get(row.row_id)
    if (!rowCells) continue
    const filtered = new Map<string, StaffingCell>()
    for (const [colId, cell] of rowCells) {
      if (!filteredColIds.has(colId)) continue
      if (filter.states?.length && !filter.states.includes(cell.state)) continue
      if (filter.member_ids?.length) {
        const hasMatch = cell.assigned_member_ids.some((id) => filter.member_ids!.includes(id))
        if (!hasMatch && cell.assigned_member_ids.length > 0) continue
      }
      filtered.set(colId, cell)
    }
    filteredCells.set(row.row_id, filtered)
  }

  return { rows: filteredRows, columns: filteredCols, cells: filteredCells }
}

// ---------------------------------------------------------------------------
// Open-position query
// ---------------------------------------------------------------------------

/** Returns all rows that have at least one open cell in the given columns. */
export function getOpenPositionRows(
  matrix: StaffingMatrix,
  columnIds?: string[],
): StaffingRow[] {
  const targetCols = new Set(columnIds ?? matrix.columns.map((c) => c.column_id))
  return matrix.rows.filter((row) => {
    if (!row.is_open_position && row.required_headcount === 0) return false
    const rowCells = matrix.cells.get(row.row_id)
    if (!rowCells) return false
    for (const [colId, cell] of rowCells) {
      if (!targetCols.has(colId)) continue
      if (cell.state === "open" || cell.state === "partial") return true
    }
    return false
  })
}
