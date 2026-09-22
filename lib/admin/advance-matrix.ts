/**
 * ADV-402 — Build tour-wide advance matrix
 *
 * Provides a stop × section matrix view of advance status across an entire
 * tour.  Supports filtering by section/status/owner/due date, and bulk
 * operations (assign owner, send reminder, apply template) that preserve
 * per-event differences.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { AdvanceSectionCategory } from "./advance-template"

// ---------------------------------------------------------------------------
// Section status
// ---------------------------------------------------------------------------

export type AdvanceSectionStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "blocked"

export const ADVANCE_SECTION_STATUS_ORDER: AdvanceSectionStatus[] = [
  "not_started",
  "in_progress",
  "submitted",
  "needs_changes",
  "approved",
  "blocked",
]

// ---------------------------------------------------------------------------
// Matrix cell — one stop × one section
// ---------------------------------------------------------------------------

export interface AdvanceMatrixCell {
  stop_id: string
  event_id: string
  template_section_id: string
  section_title: string
  section_category: AdvanceSectionCategory
  status: AdvanceSectionStatus
  owner_id?: string
  due_date?: string        // YYYY-MM-DD
  is_overdue: boolean
  is_external: boolean
  /** Set when an advance for this stop/section exists; null otherwise */
  advance_section_id?: string
}

// ---------------------------------------------------------------------------
// Matrix row — one stop
// ---------------------------------------------------------------------------

export interface AdvanceMatrixRow {
  stop_id: string
  event_id: string
  stop_name: string        // market / city name
  stop_date: string        // YYYY-MM-DD (local event date)
  cells: AdvanceMatrixCell[]
  /** Rollup status for this stop: worst-case across required sections */
  rollup_status: AdvanceSectionStatus
  required_sections_total: number
  required_sections_approved: number
  has_overdue: boolean
}

// ---------------------------------------------------------------------------
// Matrix filter
// ---------------------------------------------------------------------------

export interface AdvanceMatrixFilter {
  section_ids?: string[]
  statuses?: AdvanceSectionStatus[]
  owner_ids?: string[]
  overdue_only?: boolean
  external_only?: boolean
  category?: AdvanceSectionCategory
}

// ---------------------------------------------------------------------------
// Build matrix from raw data
// ---------------------------------------------------------------------------

export interface StopInput {
  stop_id: string
  event_id: string
  stop_name: string
  stop_date: string
}

export interface SectionSlot {
  template_section_id: string
  section_title: string
  section_category: AdvanceSectionCategory
  is_required: boolean
  is_external: boolean
}

export interface SectionStatusEntry {
  stop_id: string
  template_section_id: string
  status: AdvanceSectionStatus
  owner_id?: string
  due_date?: string
  advance_section_id?: string
}

/**
 * Computes the rollup status for a stop based on its cell statuses.
 * Priority: blocked > needs_changes > not_started > in_progress > submitted > approved
 */
export function computeRollupStatus(
  cells: AdvanceMatrixCell[],
  requiredSectionIds: Set<string>,
): AdvanceSectionStatus {
  const required = cells.filter((c) => requiredSectionIds.has(c.template_section_id))
  if (required.length === 0) return "not_started"
  const priority: AdvanceSectionStatus[] = [
    "blocked",
    "needs_changes",
    "not_started",
    "in_progress",
    "submitted",
    "approved",
  ]
  for (const status of priority) {
    if (required.some((c) => c.status === status)) return status
  }
  return "approved"
}

export function buildAdvanceMatrix(
  stops: StopInput[],
  sectionSlots: SectionSlot[],
  statusEntries: SectionStatusEntry[],
  today: string,
): AdvanceMatrixRow[] {
  const requiredSectionIds = new Set(
    sectionSlots.filter((s) => s.is_required).map((s) => s.template_section_id),
  )

  return stops.map((stop) => {
    const cells: AdvanceMatrixCell[] = sectionSlots.map((slot) => {
      const entry = statusEntries.find(
        (e) => e.stop_id === stop.stop_id && e.template_section_id === slot.template_section_id,
      )
      const status: AdvanceSectionStatus = entry?.status ?? "not_started"
      const due_date = entry?.due_date
      const is_overdue =
        !!due_date && due_date < today && status !== "approved" && status !== "blocked"

      return {
        stop_id: stop.stop_id,
        event_id: stop.event_id,
        template_section_id: slot.template_section_id,
        section_title: slot.section_title,
        section_category: slot.section_category,
        status,
        owner_id: entry?.owner_id,
        due_date,
        is_overdue,
        is_external: slot.is_external,
        advance_section_id: entry?.advance_section_id,
      }
    })

    const approvedCount = cells.filter(
      (c) => requiredSectionIds.has(c.template_section_id) && c.status === "approved",
    ).length

    return {
      stop_id: stop.stop_id,
      event_id: stop.event_id,
      stop_name: stop.stop_name,
      stop_date: stop.stop_date,
      cells,
      rollup_status: computeRollupStatus(cells, requiredSectionIds),
      required_sections_total: requiredSectionIds.size,
      required_sections_approved: approvedCount,
      has_overdue: cells.some((c) => c.is_overdue),
    }
  })
}

// ---------------------------------------------------------------------------
// Filter matrix rows/cells
// ---------------------------------------------------------------------------

export function filterMatrixRows(
  rows: AdvanceMatrixRow[],
  filter: AdvanceMatrixFilter,
): AdvanceMatrixRow[] {
  return rows
    .map((row) => {
      let cells = row.cells
      if (filter.section_ids && filter.section_ids.length > 0) {
        cells = cells.filter((c) => filter.section_ids!.includes(c.template_section_id))
      }
      if (filter.statuses && filter.statuses.length > 0) {
        cells = cells.filter((c) => filter.statuses!.includes(c.status))
      }
      if (filter.owner_ids && filter.owner_ids.length > 0) {
        cells = cells.filter(
          (c) => c.owner_id !== undefined && filter.owner_ids!.includes(c.owner_id),
        )
      }
      if (filter.overdue_only) {
        cells = cells.filter((c) => c.is_overdue)
      }
      if (filter.external_only) {
        cells = cells.filter((c) => c.is_external)
      }
      if (filter.category) {
        cells = cells.filter((c) => c.section_category === filter.category)
      }
      return { ...row, cells }
    })
    .filter((row) => row.cells.length > 0)
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export interface BulkAdvanceTarget {
  stop_id: string
  template_section_id: string
}

export interface BulkAssignOwnerResult {
  targets: BulkAdvanceTarget[]
  owner_id: string
  /** Targets where an owner was already set and will be overwritten */
  overwrites: BulkAdvanceTarget[]
}

/**
 * Previews a bulk owner assignment.  Per-event differences are preserved:
 * cells that already have the same owner are no-ops; cells with a different
 * owner are flagged as overwrites so the caller can confirm.
 */
export function previewBulkAssignOwner(
  cells: AdvanceMatrixCell[],
  newOwnerId: string,
): BulkAssignOwnerResult {
  const targets: BulkAdvanceTarget[] = cells.map((c) => ({
    stop_id: c.stop_id,
    template_section_id: c.template_section_id,
  }))
  const overwrites: BulkAdvanceTarget[] = cells
    .filter((c) => c.owner_id !== undefined && c.owner_id !== newOwnerId)
    .map((c) => ({ stop_id: c.stop_id, template_section_id: c.template_section_id }))

  return { targets, owner_id: newOwnerId, overwrites }
}

// ---------------------------------------------------------------------------
// Bulk remind — returns targets eligible for a reminder
// ---------------------------------------------------------------------------

export interface BulkRemindTarget {
  stop_id: string
  template_section_id: string
  owner_id: string
  due_date?: string
}

/** Only targets with an assigned owner and non-approved/non-blocked status. */
export function buildBulkRemindTargets(
  cells: AdvanceMatrixCell[],
): BulkRemindTarget[] {
  return cells
    .filter(
      (c) =>
        c.owner_id !== undefined &&
        c.status !== "approved" &&
        c.status !== "blocked",
    )
    .map((c) => ({
      stop_id: c.stop_id,
      template_section_id: c.template_section_id,
      owner_id: c.owner_id!,
      due_date: c.due_date,
    }))
}

// ---------------------------------------------------------------------------
// Bulk apply template — preview only; execute is caller's responsibility
// ---------------------------------------------------------------------------

export interface BulkTemplateApplyPreview {
  /** Stops that do not yet have any advance for this section */
  new_advances: BulkAdvanceTarget[]
  /** Stops that already have an advance for this section (in_progress or further) */
  existing_advances: BulkAdvanceTarget[]
  /** Stops whose advance will not be changed (already approved) */
  skipped_approved: BulkAdvanceTarget[]
}

export function previewBulkApplyTemplate(
  cells: AdvanceMatrixCell[],
): BulkTemplateApplyPreview {
  const new_advances: BulkAdvanceTarget[] = []
  const existing_advances: BulkAdvanceTarget[] = []
  const skipped_approved: BulkAdvanceTarget[] = []

  for (const cell of cells) {
    const t: BulkAdvanceTarget = {
      stop_id: cell.stop_id,
      template_section_id: cell.template_section_id,
    }
    if (cell.status === "approved") {
      skipped_approved.push(t)
    } else if (cell.advance_section_id) {
      existing_advances.push(t)
    } else {
      new_advances.push(t)
    }
  }

  return { new_advances, existing_advances, skipped_approved }
}

// ---------------------------------------------------------------------------
// Matrix summary
// ---------------------------------------------------------------------------

export interface AdvanceMatrixSummary {
  total_stops: number
  stops_fully_approved: number
  stops_with_overdue: number
  sections_approved: number
  sections_total: number
  by_status: Record<AdvanceSectionStatus, number>
}

export function summarizeAdvanceMatrix(rows: AdvanceMatrixRow[]): AdvanceMatrixSummary {
  const byStatus = {} as Record<AdvanceSectionStatus, number>
  let sections_approved = 0
  let sections_total = 0
  let stops_fully_approved = 0
  let stops_with_overdue = 0

  for (const row of rows) {
    if (row.rollup_status === "approved") stops_fully_approved++
    if (row.has_overdue) stops_with_overdue++
    for (const cell of row.cells) {
      byStatus[cell.status] = (byStatus[cell.status] ?? 0) + 1
      sections_total++
      if (cell.status === "approved") sections_approved++
    }
  }

  return {
    total_stops: rows.length,
    stops_fully_approved,
    stops_with_overdue,
    sections_approved,
    sections_total,
    by_status: byStatus,
  }
}
