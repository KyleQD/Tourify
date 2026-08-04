/**
 * TRAVEL-301 — Party manifest to route leg matrix (pure).
 *
 * Connects the tour party manifest (list of active party members) to every
 * required travel leg and lodging night. Produces a typed matrix where
 * each cell represents the travel disposition of one party member for
 * one leg/night:
 *
 *  • not_traveling   — member is not required on this leg/night (role exclusion)
 *  • self_arranged   — member handles their own travel (explicit flag)
 *  • assigned        — member has a confirmed or in-progress segment/room night
 *  • missing         — member should have a segment/room night but none exists
 *
 * The matrix identifies actionable gaps (missing cells) so operations staff
 * can immediately see what still needs to be arranged.
 *
 * Pure: no I/O, no `server-only`.
 */

import type { RouteLegContext } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManifestCellStatus =
  | "not_traveling" // member not required on this leg/night
  | "self_arranged" // member self-manages travel
  | "assigned"      // segment/room night exists and is in a valid state
  | "missing"       // required but no segment/room night found

export type ManifestCellKind = "travel_leg" | "lodging_night"

export interface PartyMember {
  /** Workforce / personnel id. */
  person_id: string
  /** Display name. */
  person_name: string
  /**
   * Role/department — used to determine which legs/nights are required.
   * e.g. "band", "crew", "management", "vendor"
   */
  role: string
  /**
   * Set of leg_ids / stop_ids this member is explicitly excluded from.
   * When excluded, cell status is "not_traveling".
   */
  excluded_leg_ids?: Set<string>
  /**
   * Set of leg_ids / stop_ids where member self-arranges.
   */
  self_arranged_ids?: Set<string>
}

/** A single required travel leg or lodging night row in the matrix. */
export interface ManifestRow {
  kind: ManifestCellKind
  /** For travel_leg: the route leg context. For lodging_night: stop context. */
  context: RouteLegContext
  /**
   * Human-readable label.
   * e.g. "Chicago → Detroit (drive)" or "Detroit night — 2026-08-03"
   */
  label: string
  /** YYYY-MM-DD for ordering and display. */
  date: string | null
}

/** One cell in the manifest matrix. */
export interface ManifestCell {
  person_id: string
  row_key: string // leg_id or stop_id — identifies the row
  kind: ManifestCellKind
  status: ManifestCellStatus
  /**
   * If "assigned": the id of the segment or room_night record.
   * null otherwise.
   */
  record_id: string | null
  /**
   * Transport mode (for travel_leg cells with assigned status).
   */
  transport_mode: string | null
}

/** Full matrix for one tour. */
export interface PartyManifestMatrix {
  /** All active party members (columns). */
  members: PartyMember[]
  /** All required legs and lodging nights (rows). */
  rows: ManifestRow[]
  /** Flat cell list. Length = members.length × rows.length. */
  cells: ManifestCell[]
  /** Summary of gap counts. */
  summary: {
    total_cells: number
    assigned: number
    missing: number
    self_arranged: number
    not_traveling: number
  }
}

// ---------------------------------------------------------------------------
// Assignment input — what is already booked
// ---------------------------------------------------------------------------

export interface TravelAssignment {
  /** Id of the segment or room_night record. */
  record_id: string
  /** party member this assignment is for. */
  person_id: string
  /**
   * The leg_id or stop_id this assignment covers.
   * For travel: leg_id; for lodging: stop_id.
   */
  ref_id: string
  kind: ManifestCellKind
  /** Transport mode (for travel_leg only). */
  transport_mode?: string | null
}

// ---------------------------------------------------------------------------
// Matrix builder
// ---------------------------------------------------------------------------

/**
 * Determine the row key for a ManifestRow.
 */
function rowKey(row: ManifestRow): string {
  return row.kind === "travel_leg"
    ? (row.context.leg_id ?? `stop-${row.context.from_stop_id}-${row.context.to_stop_id}`)
    : (row.context.stop_id ?? row.label)
}

/**
 * Build the full party manifest matrix.
 *
 * For each (member, row) pair:
 *  1. If the leg/night id is in member.excluded_leg_ids → "not_traveling"
 *  2. If the leg/night id is in member.self_arranged_ids → "self_arranged"
 *  3. If an assignment exists in `assignments` for this (person, ref) → "assigned"
 *  4. Otherwise → "missing"
 */
export function buildManifestMatrix(args: {
  members: PartyMember[]
  rows: ManifestRow[]
  assignments: TravelAssignment[]
}): PartyManifestMatrix {
  const { members, rows, assignments } = args

  // Index assignments by "person_id:ref_id:kind"
  const assignmentMap = new Map<string, TravelAssignment>()
  for (const a of assignments) {
    assignmentMap.set(`${a.person_id}:${a.ref_id}:${a.kind}`, a)
  }

  const cells: ManifestCell[] = []

  for (const member of members) {
    for (const row of rows) {
      const key = rowKey(row)
      let status: ManifestCellStatus

      if (member.excluded_leg_ids?.has(key)) {
        status = "not_traveling"
      } else if (member.self_arranged_ids?.has(key)) {
        status = "self_arranged"
      } else {
        const assignment = assignmentMap.get(`${member.person_id}:${key}:${row.kind}`)
        status = assignment ? "assigned" : "missing"
      }

      const assignment = assignmentMap.get(`${member.person_id}:${key}:${row.kind}`)

      cells.push({
        person_id: member.person_id,
        row_key: key,
        kind: row.kind,
        status,
        record_id: assignment?.record_id ?? null,
        transport_mode: assignment?.transport_mode ?? null,
      })
    }
  }

  const summary = {
    total_cells: cells.length,
    assigned: cells.filter((c) => c.status === "assigned").length,
    missing: cells.filter((c) => c.status === "missing").length,
    self_arranged: cells.filter((c) => c.status === "self_arranged").length,
    not_traveling: cells.filter((c) => c.status === "not_traveling").length,
  }

  return { members, rows, cells, summary }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get all missing cells — the actionable gap list.
 */
export function getMissingCells(matrix: PartyManifestMatrix): ManifestCell[] {
  return matrix.cells.filter((c) => c.status === "missing")
}

/**
 * Get all cells for a specific party member.
 */
export function getMemberCells(
  matrix: PartyManifestMatrix,
  personId: string,
): ManifestCell[] {
  return matrix.cells.filter((c) => c.person_id === personId)
}

/**
 * Get all cells for a specific row (leg or night).
 */
export function getRowCells(matrix: PartyManifestMatrix, rowKey: string): ManifestCell[] {
  return matrix.cells.filter((c) => c.row_key === rowKey)
}

/**
 * Check if any party member has a missing cell for the given row.
 */
export function rowHasGap(matrix: PartyManifestMatrix, rowKey: string): boolean {
  return getRowCells(matrix, rowKey).some((c) => c.status === "missing")
}

/**
 * Build a summary label like "5/8 assigned (2 missing, 1 self-arranged)"
 */
export function formatManifestSummary(summary: PartyManifestMatrix["summary"]): string {
  const parts: string[] = []
  if (summary.missing > 0) parts.push(`${summary.missing} missing`)
  if (summary.self_arranged > 0) parts.push(`${summary.self_arranged} self-arranged`)
  if (summary.not_traveling > 0) parts.push(`${summary.not_traveling} not traveling`)
  const detail = parts.length > 0 ? ` (${parts.join(", ")})` : ""
  return `${summary.assigned}/${summary.total_cells} assigned${detail}`
}
