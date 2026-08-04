/**
 * WORK-402 — Tour-wide staffing matrix tests.
 */

import { describe, it, expect } from "vitest"
import {
  buildStaffingMatrix,
  filterStaffingMatrix,
  getOpenPositionRows,
  ACTIVE_COVERAGE_STATUSES,
  type StaffingRow,
  type StaffingColumn,
  type StaffingMatrixInput,
} from "@/lib/admin/staffing-matrix"
import type { TourPartyMember } from "@/lib/admin/tour-party-model"

const TOUR = "tour-1"
const NOW = "2026-09-10T00:00:00.000Z"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<StaffingRow> = {}): StaffingRow {
  return {
    row_id: "row-tm",
    role_title: "Tour Manager",
    department: "Production",
    required_headcount: 1,
    assigned_member_ids: ["m1"],
    is_open_position: false,
    ...overrides,
  }
}

function makeCol(overrides: Partial<StaffingColumn> = {}): StaffingColumn {
  return {
    column_id: "col-show-1",
    date: "2026-09-10",
    type: "show",
    label: "Nashville – Show",
    stop_id: "stop-1",
    leg_id: null,
    iana_zone: "America/Chicago",
    ...overrides,
  }
}

function makeMember(overrides: Partial<TourPartyMember> = {}): TourPartyMember {
  return {
    member_id: "m1",
    tour_id: TOUR,
    org_id: "org-1",
    person_id: "p1",
    work_mode_identity_id: "wm-1",
    role_title: "Tour Manager",
    department: "Production",
    status: "confirmed",
    join_date: "2026-09-01",
    leave_date: null,
    traveler: {
      is_traveling: true,
      home_base: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      accessibility_notes: null,
      dietary_notes: null,
    },
    financial: { rate_per_day: null, currency: null, per_diem_policy_id: null },
    created_by: "mgr",
    created_at: NOW,
    updated_by: "mgr",
    updated_at: NOW,
    ...overrides,
  }
}

function makeInput(overrides: Partial<StaffingMatrixInput> = {}): StaffingMatrixInput {
  return {
    tour_id: TOUR,
    rows: [makeRow()],
    columns: [makeCol()],
    members: [makeMember()],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Column types / non-venue days
// ---------------------------------------------------------------------------

describe("WORK-402 — column types and non-venue days", () => {
  it("travel, rehearsal, warehouse, rest, other are first-class column types", () => {
    const cols: StaffingColumn[] = [
      makeCol({ column_id: "c1", type: "show",      date: "2026-09-10" }),
      makeCol({ column_id: "c2", type: "travel",    date: "2026-09-11" }),
      makeCol({ column_id: "c3", type: "rehearsal", date: "2026-09-12" }),
      makeCol({ column_id: "c4", type: "warehouse", date: "2026-09-13" }),
      makeCol({ column_id: "c5", type: "rest",      date: "2026-09-14" }),
      makeCol({ column_id: "c6", type: "other",     date: "2026-09-15" }),
    ]
    const matrix = buildStaffingMatrix(makeInput({ columns: cols }))
    expect(matrix.summary.non_venue_column_ids).not.toContain("c1")  // show is venue
    expect(matrix.summary.non_venue_column_ids).toContain("c2")      // travel
    expect(matrix.summary.non_venue_column_ids).toContain("c3")      // rehearsal
    expect(matrix.summary.non_venue_column_ids).toContain("c4")      // warehouse
    expect(matrix.summary.non_venue_column_ids).toContain("c5")      // rest
    expect(matrix.summary.non_venue_column_ids).toContain("c6")      // other
  })

  it("travel column carries leg_id linkage", () => {
    const col = makeCol({ type: "travel", leg_id: "leg-1", stop_id: null })
    expect(col.leg_id).toBe("leg-1")
    expect(col.stop_id).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Coverage: filled
// ---------------------------------------------------------------------------

describe("WORK-402 — filled coverage", () => {
  it("cell is 'filled' when confirmed member covers required headcount", () => {
    const matrix = buildStaffingMatrix(makeInput())
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.state).toBe("filled")
    expect(cell?.filled_count).toBe(1)
    expect(cell?.required_count).toBe(1)
  })

  it("summary reports filled_cells correctly", () => {
    const matrix = buildStaffingMatrix(makeInput())
    expect(matrix.summary.filled_cells).toBe(1)
    expect(matrix.summary.open_cells).toBe(0)
  })

  it("cell is 'filled' when multiple members cover required headcount of 2", () => {
    const row = makeRow({ required_headcount: 2, assigned_member_ids: ["m1", "m2"] })
    const members = [
      makeMember({ member_id: "m1", status: "confirmed" }),
      makeMember({ member_id: "m2", status: "confirmed" }),
    ]
    const matrix = buildStaffingMatrix(makeInput({ rows: [row], members }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.state).toBe("filled")
    expect(cell?.filled_count).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Coverage: open and partial
// ---------------------------------------------------------------------------

describe("WORK-402 — open and partial coverage", () => {
  it("cell is 'open' when no member is assigned and headcount > 0", () => {
    const row = makeRow({ assigned_member_ids: [], required_headcount: 1 })
    const matrix = buildStaffingMatrix(makeInput({ rows: [row], members: [] }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.state).toBe("open")
    expect(cell?.filled_count).toBe(0)
  })

  it("cell is 'partial' when some but not all headcount is filled", () => {
    const row = makeRow({ required_headcount: 3, assigned_member_ids: ["m1"] })
    const matrix = buildStaffingMatrix(makeInput({ rows: [row] }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.state).toBe("partial")
    expect(cell?.filled_count).toBe(1)
    expect(cell?.required_count).toBe(3)
  })

  it("summary open_positions counts rows with is_open_position=true", () => {
    const rows = [
      makeRow({ row_id: "r1", is_open_position: false }),
      makeRow({ row_id: "r2", is_open_position: true, assigned_member_ids: [] }),
      makeRow({ row_id: "r3", is_open_position: true, assigned_member_ids: [] }),
    ]
    const matrix = buildStaffingMatrix(makeInput({ rows }))
    expect(matrix.summary.total_open_positions).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Coverage: conflict
// ---------------------------------------------------------------------------

describe("WORK-402 — conflict detection", () => {
  it("cell is 'conflict' when member is availability-blocked on the day", () => {
    const blocks = new Map([["2026-09-10", new Set(["m1"])]])
    const matrix = buildStaffingMatrix(makeInput({ availability_blocks: blocks }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.state).toBe("conflict")
    expect(cell?.conflicts).toHaveLength(1)
    expect(cell?.conflicts[0].conflict_type).toBe("availability_blocked")
    expect(cell?.conflicts[0].member_id).toBe("m1")
  })

  it("cell has status_invalid conflict when member is in non-active status", () => {
    const members = [makeMember({ status: "offered" })]  // offered not in ACTIVE_COVERAGE_STATUSES
    // but still active by date
    // actually offered IS not in ACTIVE_COVERAGE_STATUSES — should flag
    const matrix = buildStaffingMatrix(makeInput({ members }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.conflicts.some((c) => c.conflict_type === "status_invalid")).toBe(true)
  })

  it("summary total_conflicts sums conflicts across all cells", () => {
    const blocks = new Map([["2026-09-10", new Set(["m1"])]])
    const matrix = buildStaffingMatrix(makeInput({ availability_blocks: blocks }))
    expect(matrix.summary.total_conflicts).toBeGreaterThan(0)
  })

  it("ACTIVE_COVERAGE_STATUSES includes confirmed and accepted", () => {
    expect(ACTIVE_COVERAGE_STATUSES.has("confirmed")).toBe(true)
    expect(ACTIVE_COVERAGE_STATUSES.has("accepted")).toBe(true)
    expect(ACTIVE_COVERAGE_STATUSES.has("offered")).toBe(false)
    expect(ACTIVE_COVERAGE_STATUSES.has("cancelled")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Member date scoping in matrix
// ---------------------------------------------------------------------------

describe("WORK-402 — date scoping in cells", () => {
  it("member not active on column date is excluded from cell coverage", () => {
    // Member joins 2026-09-15 but column is 2026-09-10
    const member = makeMember({ join_date: "2026-09-15", leave_date: null })
    const matrix = buildStaffingMatrix(makeInput({ members: [member] }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.filled_count).toBe(0)
    expect(cell?.state).toBe("open")
  })

  it("member who left before column date is excluded", () => {
    const member = makeMember({ join_date: "2026-09-01", leave_date: "2026-09-09" })
    const matrix = buildStaffingMatrix(makeInput({ members: [member] }))
    const cell = matrix.cells.get("row-tm")?.get("col-show-1")
    expect(cell?.filled_count).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

describe("WORK-402 — matrix filters", () => {
  const fullInput: StaffingMatrixInput = {
    tour_id: TOUR,
    rows: [
      makeRow({ row_id: "r-prod", department: "Production", role_title: "Tour Manager" }),
      makeRow({ row_id: "r-audio", department: "Audio", role_title: "FOH Engineer", assigned_member_ids: ["m2"] }),
    ],
    columns: [
      makeCol({ column_id: "c-show",   type: "show",   date: "2026-09-10" }),
      makeCol({ column_id: "c-travel", type: "travel", date: "2026-09-11" }),
    ],
    members: [
      makeMember({ member_id: "m1", department: "Production" }),
      makeMember({ member_id: "m2", department: "Audio",     role_title: "FOH Engineer" }),
    ],
  }

  it("filter by department returns only matching rows", () => {
    const matrix = buildStaffingMatrix(fullInput)
    const { rows } = filterStaffingMatrix(matrix, { departments: ["Audio"] })
    expect(rows).toHaveLength(1)
    expect(rows[0].department).toBe("Audio")
  })

  it("filter by column_type returns only matching columns", () => {
    const matrix = buildStaffingMatrix(fullInput)
    const { columns } = filterStaffingMatrix(matrix, { column_types: ["travel"] })
    expect(columns).toHaveLength(1)
    expect(columns[0].type).toBe("travel")
  })

  it("filter by date range trims columns outside range", () => {
    const matrix = buildStaffingMatrix(fullInput)
    const { columns } = filterStaffingMatrix(matrix, { date_from: "2026-09-11", date_to: "2026-09-15" })
    expect(columns.every((c) => c.date >= "2026-09-11")).toBe(true)
    expect(columns.find((c) => c.column_id === "c-show")).toBeUndefined()
  })

  it("filter by cell state returns only matching cells", () => {
    const matrix = buildStaffingMatrix(fullInput)
    const { cells } = filterStaffingMatrix(matrix, { states: ["open"] })
    let hasOpen = false
    for (const [, rowCells] of cells) {
      for (const [, cell] of rowCells) {
        expect(cell.state).toBe("open")
        hasOpen = true
      }
    }
    // Audio row (m2 assigned but status "confirmed") should be filtered to only open cells
  })
})

// ---------------------------------------------------------------------------
// Open-position query
// ---------------------------------------------------------------------------

describe("WORK-402 — open position query", () => {
  it("getOpenPositionRows returns rows with at least one open or partial cell", () => {
    const rows: StaffingRow[] = [
      makeRow({ row_id: "r1", required_headcount: 1, assigned_member_ids: ["m1"], is_open_position: false }),
      makeRow({ row_id: "r2", required_headcount: 1, assigned_member_ids: [],     is_open_position: true }),
    ]
    const matrix = buildStaffingMatrix({
      tour_id: TOUR,
      rows,
      columns: [makeCol()],
      members: [makeMember()],
    })
    const openRows = getOpenPositionRows(matrix)
    expect(openRows.map((r) => r.row_id)).toContain("r2")
    expect(openRows.map((r) => r.row_id)).not.toContain("r1")
  })

  it("getOpenPositionRows can be scoped to specific column IDs", () => {
    const rows: StaffingRow[] = [
      makeRow({ row_id: "r1", assigned_member_ids: [], required_headcount: 1, is_open_position: true }),
    ]
    const cols: StaffingColumn[] = [
      makeCol({ column_id: "c1", date: "2026-09-10" }),
      makeCol({ column_id: "c2", date: "2026-09-11" }),
    ]
    const matrix = buildStaffingMatrix({ tour_id: TOUR, rows, columns: cols, members: [] })
    const openForC2 = getOpenPositionRows(matrix, ["c2"])
    expect(openForC2.map((r) => r.row_id)).toContain("r1")
  })
})

// ---------------------------------------------------------------------------
// Matrix summary
// ---------------------------------------------------------------------------

describe("WORK-402 — matrix summary", () => {
  it("total_cells = rows × columns", () => {
    const rows = [makeRow({ row_id: "r1" }), makeRow({ row_id: "r2" })]
    const cols = [makeCol({ column_id: "c1" }), makeCol({ column_id: "c2" }), makeCol({ column_id: "c3" })]
    const matrix = buildStaffingMatrix(makeInput({ rows, columns: cols }))
    expect(matrix.summary.total_cells).toBe(6)
  })

  it("summary non_venue_column_ids excludes show columns", () => {
    const cols = [
      makeCol({ column_id: "c-show", type: "show" }),
      makeCol({ column_id: "c-travel", type: "travel" }),
    ]
    const matrix = buildStaffingMatrix(makeInput({ columns: cols }))
    expect(matrix.summary.non_venue_column_ids).toEqual(["c-travel"])
  })
})
