import { describe, it, expect } from "vitest"
import {
  buildAdvanceMatrix,
  filterMatrixRows,
  computeRollupStatus,
  previewBulkAssignOwner,
  buildBulkRemindTargets,
  previewBulkApplyTemplate,
  summarizeAdvanceMatrix,
  type AdvanceMatrixCell,
  type StopInput,
  type SectionSlot,
  type SectionStatusEntry,
} from "../../lib/admin/advance-matrix"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STOPS: StopInput[] = [
  { stop_id: "stop-1", event_id: "ev-1", stop_name: "New York", stop_date: "2025-09-10" },
  { stop_id: "stop-2", event_id: "ev-2", stop_name: "Chicago", stop_date: "2025-09-15" },
  { stop_id: "stop-3", event_id: "ev-3", stop_name: "Los Angeles", stop_date: "2025-09-20" },
]

const SLOTS: SectionSlot[] = [
  { template_section_id: "s1", section_title: "Venue Details", section_category: "venue_details", is_required: true, is_external: true },
  { template_section_id: "s2", section_title: "Production", section_category: "production", is_required: true, is_external: false },
  { template_section_id: "s3", section_title: "Hospitality", section_category: "hospitality", is_required: false, is_external: true },
]

const STATUS_ENTRIES: SectionStatusEntry[] = [
  { stop_id: "stop-1", template_section_id: "s1", status: "approved", owner_id: "user-pm", due_date: "2025-08-27", advance_section_id: "as-1" },
  { stop_id: "stop-1", template_section_id: "s2", status: "in_progress", owner_id: "user-pm", due_date: "2025-08-27", advance_section_id: "as-2" },
  { stop_id: "stop-2", template_section_id: "s1", status: "submitted", owner_id: "user-coord", due_date: "2025-09-01", advance_section_id: "as-3" },
  { stop_id: "stop-2", template_section_id: "s2", status: "not_started" },
  // stop-3 has no entries → all not_started
]

const TODAY = "2025-09-05"

// ---------------------------------------------------------------------------
// buildAdvanceMatrix
// ---------------------------------------------------------------------------

describe("buildAdvanceMatrix", () => {
  it("builds a row for each stop", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    expect(rows).toHaveLength(3)
  })

  it("builds a cell for each section slot per stop", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    expect(rows[0].cells).toHaveLength(3)
  })

  it("uses not_started for stops with no status entry", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const la = rows.find((r) => r.stop_id === "stop-3")!
    expect(la.cells.every((c) => c.status === "not_started")).toBe(true)
  })

  it("correctly marks is_overdue for past-due non-approved cells", () => {
    // stop-1 s2 has due_date 2025-08-27, today is 2025-09-05, status in_progress → overdue
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const s2Cell = rows[0].cells.find((c) => c.template_section_id === "s2")!
    expect(s2Cell.is_overdue).toBe(true)
  })

  it("does not mark approved cells as overdue", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const s1Cell = rows[0].cells.find((c) => c.template_section_id === "s1")!
    expect(s1Cell.is_overdue).toBe(false)
  })

  it("computes required_sections counts", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    expect(rows[0].required_sections_total).toBe(2) // s1 + s2 are required
    expect(rows[0].required_sections_approved).toBe(1) // only s1 is approved
  })

  it("sets has_overdue on row when any cell is overdue", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    expect(rows[0].has_overdue).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// computeRollupStatus
// ---------------------------------------------------------------------------

describe("computeRollupStatus", () => {
  const required = new Set(["s1", "s2"])

  function cell(sectionId: string, status: AdvanceMatrixCell["status"]): AdvanceMatrixCell {
    return {
      stop_id: "stop-1",
      event_id: "ev-1",
      template_section_id: sectionId,
      section_title: "X",
      section_category: "venue_details",
      status,
      is_overdue: false,
      is_external: false,
    }
  }

  it("returns approved when all required cells are approved", () => {
    expect(computeRollupStatus([cell("s1", "approved"), cell("s2", "approved")], required)).toBe("approved")
  })

  it("returns blocked when any required cell is blocked", () => {
    expect(computeRollupStatus([cell("s1", "approved"), cell("s2", "blocked")], required)).toBe("blocked")
  })

  it("returns not_started when all required cells are not_started", () => {
    expect(computeRollupStatus([cell("s1", "not_started"), cell("s2", "not_started")], required)).toBe("not_started")
  })

  it("ignores non-required sections for rollup", () => {
    // s3 is not required; s1+s2 are both approved → overall approved
    expect(
      computeRollupStatus([cell("s1", "approved"), cell("s2", "approved"), cell("s3", "blocked")], required),
    ).toBe("approved")
  })

  it("returns not_started when required set is empty", () => {
    expect(computeRollupStatus([], new Set())).toBe("not_started")
  })
})

// ---------------------------------------------------------------------------
// filterMatrixRows
// ---------------------------------------------------------------------------

describe("filterMatrixRows", () => {
  const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)

  it("filters by section_ids", () => {
    const filtered = filterMatrixRows(rows, { section_ids: ["s1"] })
    expect(filtered.every((r) => r.cells.every((c) => c.template_section_id === "s1"))).toBe(true)
  })

  it("filters by status", () => {
    const filtered = filterMatrixRows(rows, { statuses: ["approved"] })
    expect(filtered.every((r) => r.cells.every((c) => c.status === "approved"))).toBe(true)
  })

  it("filters overdue_only", () => {
    const filtered = filterMatrixRows(rows, { overdue_only: true })
    expect(filtered.every((r) => r.cells.every((c) => c.is_overdue))).toBe(true)
  })

  it("filters external_only", () => {
    const filtered = filterMatrixRows(rows, { external_only: true })
    expect(filtered.every((r) => r.cells.every((c) => c.is_external))).toBe(true)
  })

  it("filters by category", () => {
    const filtered = filterMatrixRows(rows, { category: "production" })
    expect(filtered.every((r) => r.cells.every((c) => c.section_category === "production"))).toBe(true)
  })

  it("returns empty when nothing matches", () => {
    const filtered = filterMatrixRows(rows, { statuses: ["needs_changes"] })
    expect(filtered).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// previewBulkAssignOwner
// ---------------------------------------------------------------------------

describe("previewBulkAssignOwner", () => {
  it("flags cells with a different existing owner as overwrites", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const allCells = rows.flatMap((r) => r.cells)
    const result = previewBulkAssignOwner(allCells, "user-new")
    expect(result.owner_id).toBe("user-new")
    expect(result.targets).toHaveLength(allCells.length)
    // cells with owner_id set (not equal to user-new) should be in overwrites
    const withExistingOwner = allCells.filter(
      (c) => c.owner_id !== undefined && c.owner_id !== "user-new",
    )
    expect(result.overwrites).toHaveLength(withExistingOwner.length)
  })

  it("no overwrites when assigning same owner as existing", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const cells = rows.flatMap((r) =>
      r.cells.filter((c) => c.owner_id === "user-pm"),
    )
    const result = previewBulkAssignOwner(cells, "user-pm")
    expect(result.overwrites).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// buildBulkRemindTargets
// ---------------------------------------------------------------------------

describe("buildBulkRemindTargets", () => {
  it("only includes cells with owner that are not approved/blocked", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const all = rows.flatMap((r) => r.cells)
    const targets = buildBulkRemindTargets(all)
    expect(targets.every((t) => t.owner_id !== undefined)).toBe(true)
    // Should not include approved cells
    const approvedCellIds = all
      .filter((c) => c.status === "approved" || c.status === "blocked")
      .map((c) => `${c.stop_id}:${c.template_section_id}`)
    const targetIds = targets.map((t) => `${t.stop_id}:${t.template_section_id}`)
    expect(targetIds.some((id) => approvedCellIds.includes(id))).toBe(false)
  })

  it("excludes cells with no owner", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const all = rows.flatMap((r) => r.cells)
    const noOwner = all.filter((c) => c.owner_id === undefined)
    const targets = buildBulkRemindTargets(all)
    const noOwnerIds = noOwner.map((c) => `${c.stop_id}:${c.template_section_id}`)
    const targetIds = targets.map((t) => `${t.stop_id}:${t.template_section_id}`)
    expect(targetIds.some((id) => noOwnerIds.includes(id))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// previewBulkApplyTemplate
// ---------------------------------------------------------------------------

describe("previewBulkApplyTemplate", () => {
  it("splits cells into new/existing/skipped_approved", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const all = rows.flatMap((r) => r.cells)
    const preview = previewBulkApplyTemplate(all)
    // Approved cells go to skipped_approved
    const approvedCount = all.filter((c) => c.status === "approved").length
    expect(preview.skipped_approved).toHaveLength(approvedCount)
    // Cells with advance_section_id but not approved → existing_advances
    const existingCount = all.filter(
      (c) => c.advance_section_id && c.status !== "approved",
    ).length
    expect(preview.existing_advances).toHaveLength(existingCount)
    // Remainder → new_advances
    expect(
      preview.new_advances.length + preview.existing_advances.length + preview.skipped_approved.length,
    ).toBe(all.length)
  })
})

// ---------------------------------------------------------------------------
// summarizeAdvanceMatrix
// ---------------------------------------------------------------------------

describe("summarizeAdvanceMatrix", () => {
  it("counts totals correctly", () => {
    const rows = buildAdvanceMatrix(STOPS, SLOTS, STATUS_ENTRIES, TODAY)
    const summary = summarizeAdvanceMatrix(rows)
    expect(summary.total_stops).toBe(3)
    expect(summary.sections_total).toBe(9) // 3 stops × 3 sections
    // stop-1 s1 is approved
    expect(summary.sections_approved).toBe(1)
    // stop-1 has overdue, so stops_with_overdue >= 1
    expect(summary.stops_with_overdue).toBeGreaterThanOrEqual(1)
  })

  it("reports fully approved stops", () => {
    // All required sections for stop-1 approved
    const entries: SectionStatusEntry[] = [
      { stop_id: "stop-1", template_section_id: "s1", status: "approved" },
      { stop_id: "stop-1", template_section_id: "s2", status: "approved" },
    ]
    const rows = buildAdvanceMatrix([STOPS[0]], SLOTS, entries, "2025-08-01")
    const summary = summarizeAdvanceMatrix(rows)
    expect(summary.stops_fully_approved).toBe(1)
  })
})
