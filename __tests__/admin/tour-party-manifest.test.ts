/**
 * TRAVEL-301 — Party manifest matrix tests.
 *
 * Acceptance criteria:
 *  - Matrix shows every active member versus every required leg/night.
 *  - Cells identify not_traveling, self_arranged, assigned, or missing.
 *  - getMissingCells returns actionable gaps.
 */

import { describe, it, expect } from "vitest"
import {
  buildManifestMatrix,
  getMissingCells,
  getMemberCells,
  getRowCells,
  rowHasGap,
  formatManifestSummary,
  type PartyMember,
  type ManifestRow,
  type TravelAssignment,
} from "@/lib/admin/tour-party-manifest"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeMember = (id: string, role = "band", overrides: Partial<PartyMember> = {}): PartyMember => ({
  person_id: id,
  person_name: `Person ${id}`,
  role,
  ...overrides,
})

const makeLegRow = (legId: string, fromId: string, toId: string): ManifestRow => ({
  kind: "travel_leg",
  context: {
    tour_id: "t1",
    tour_version_id: "tv1",
    leg_id: legId,
    from_stop_id: fromId,
    to_stop_id: toId,
    stop_id: null,
  },
  label: `${fromId} → ${toId}`,
  date: "2026-08-01",
})

const makeNightRow = (stopId: string, date: string): ManifestRow => ({
  kind: "lodging_night",
  context: {
    tour_id: "t1",
    tour_version_id: "tv1",
    leg_id: null,
    from_stop_id: null,
    to_stop_id: null,
    stop_id: stopId,
  },
  label: `${stopId} night`,
  date,
})

const makeAssignment = (
  recordId: string,
  personId: string,
  refId: string,
  kind: TravelAssignment["kind"],
): TravelAssignment => ({
  record_id: recordId,
  person_id: personId,
  ref_id: refId,
  kind,
  transport_mode: kind === "travel_leg" ? "drive" : null,
})

// ---------------------------------------------------------------------------
// buildManifestMatrix — basic structure
// ---------------------------------------------------------------------------

describe("buildManifestMatrix — structure", () => {
  it("produces cells count = members × rows", () => {
    const members = [makeMember("p1"), makeMember("p2")]
    const rows = [makeLegRow("l1", "s1", "s2"), makeNightRow("s2", "2026-08-01")]
    const { cells } = buildManifestMatrix({ members, rows, assignments: [] })
    expect(cells).toHaveLength(4) // 2 members × 2 rows
  })

  it("empty members or rows yields no cells", () => {
    expect(buildManifestMatrix({ members: [], rows: [makeLegRow("l1", "s1", "s2")], assignments: [] }).cells).toHaveLength(0)
    expect(buildManifestMatrix({ members: [makeMember("p1")], rows: [], assignments: [] }).cells).toHaveLength(0)
  })

  it("all cells are 'missing' when no assignments exist", () => {
    const members = [makeMember("p1")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const { cells } = buildManifestMatrix({ members, rows, assignments: [] })
    expect(cells.every((c) => c.status === "missing")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Cell status rules
// ---------------------------------------------------------------------------

describe("buildManifestMatrix — cell statuses", () => {
  it("marks cell as 'assigned' when assignment exists", () => {
    const members = [makeMember("p1")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const { cells } = buildManifestMatrix({ members, rows, assignments })
    expect(cells[0].status).toBe("assigned")
    expect(cells[0].record_id).toBe("seg1")
  })

  it("marks cell as 'not_traveling' when leg is excluded", () => {
    const member: PartyMember = { ...makeMember("p1"), excluded_leg_ids: new Set(["l1"]) }
    const rows = [makeLegRow("l1", "s1", "s2")]
    const { cells } = buildManifestMatrix({ members: [member], rows, assignments: [] })
    expect(cells[0].status).toBe("not_traveling")
  })

  it("marks cell as 'self_arranged' when leg is in self_arranged_ids", () => {
    const member: PartyMember = { ...makeMember("p1"), self_arranged_ids: new Set(["l1"]) }
    const rows = [makeLegRow("l1", "s1", "s2")]
    const { cells } = buildManifestMatrix({ members: [member], rows, assignments: [] })
    expect(cells[0].status).toBe("self_arranged")
  })

  it("not_traveling takes priority over self_arranged", () => {
    const member: PartyMember = {
      ...makeMember("p1"),
      excluded_leg_ids: new Set(["l1"]),
      self_arranged_ids: new Set(["l1"]),
    }
    const rows = [makeLegRow("l1", "s1", "s2")]
    const { cells } = buildManifestMatrix({ members: [member], rows, assignments: [] })
    expect(cells[0].status).toBe("not_traveling")
  })

  it("lodging night cells work the same way", () => {
    const members = [makeMember("p1")]
    const rows = [makeNightRow("s2", "2026-08-01")]
    const assignments = [makeAssignment("rn1", "p1", "s2", "lodging_night")]
    const { cells } = buildManifestMatrix({ members, rows, assignments })
    expect(cells[0].status).toBe("assigned")
    expect(cells[0].kind).toBe("lodging_night")
  })

  it("assigns transport_mode for travel_leg cells", () => {
    const members = [makeMember("p1")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const { cells } = buildManifestMatrix({ members, rows, assignments })
    expect(cells[0].transport_mode).toBe("drive")
  })
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

describe("buildManifestMatrix — summary", () => {
  it("counts all four statuses correctly", () => {
    const members = [
      makeMember("p1"),
      makeMember("p2", "crew", { excluded_leg_ids: new Set(["l1"]) }),
      makeMember("p3", "management", { self_arranged_ids: new Set(["l1"]) }),
    ]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const { summary } = buildManifestMatrix({ members, rows, assignments })
    expect(summary.assigned).toBe(1)
    expect(summary.not_traveling).toBe(1)
    expect(summary.self_arranged).toBe(1)
    expect(summary.missing).toBe(0)
    expect(summary.total_cells).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// getMissingCells
// ---------------------------------------------------------------------------

describe("getMissingCells", () => {
  it("returns only missing cells", () => {
    const members = [makeMember("p1"), makeMember("p2")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const matrix = buildManifestMatrix({ members, rows, assignments })
    const missing = getMissingCells(matrix)
    expect(missing).toHaveLength(1)
    expect(missing[0].person_id).toBe("p2")
  })

  it("returns empty when all assigned", () => {
    const members = [makeMember("p1")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const matrix = buildManifestMatrix({ members, rows, assignments })
    expect(getMissingCells(matrix)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getMemberCells / getRowCells / rowHasGap
// ---------------------------------------------------------------------------

describe("getMemberCells", () => {
  it("returns all cells for a specific person", () => {
    const members = [makeMember("p1"), makeMember("p2")]
    const rows = [makeLegRow("l1", "s1", "s2"), makeLegRow("l2", "s2", "s3")]
    const matrix = buildManifestMatrix({ members, rows, assignments: [] })
    const p1Cells = getMemberCells(matrix, "p1")
    expect(p1Cells).toHaveLength(2)
    expect(p1Cells.every((c) => c.person_id === "p1")).toBe(true)
  })
})

describe("getRowCells", () => {
  it("returns all cells for a specific row", () => {
    const members = [makeMember("p1"), makeMember("p2")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const matrix = buildManifestMatrix({ members, rows, assignments: [] })
    const rowCells = getRowCells(matrix, "l1")
    expect(rowCells).toHaveLength(2)
  })
})

describe("rowHasGap", () => {
  it("returns true when any cell in the row is missing", () => {
    const members = [makeMember("p1"), makeMember("p2")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const matrix = buildManifestMatrix({ members, rows, assignments })
    expect(rowHasGap(matrix, "l1")).toBe(true)
  })

  it("returns false when all cells in the row are not missing", () => {
    const members = [makeMember("p1")]
    const rows = [makeLegRow("l1", "s1", "s2")]
    const assignments = [makeAssignment("seg1", "p1", "l1", "travel_leg")]
    const matrix = buildManifestMatrix({ members, rows, assignments })
    expect(rowHasGap(matrix, "l1")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatManifestSummary
// ---------------------------------------------------------------------------

describe("formatManifestSummary", () => {
  it("shows assigned/total when clean", () => {
    const summary = { total_cells: 6, assigned: 6, missing: 0, self_arranged: 0, not_traveling: 0 }
    expect(formatManifestSummary(summary)).toBe("6/6 assigned")
  })

  it("includes missing count", () => {
    const summary = { total_cells: 6, assigned: 4, missing: 2, self_arranged: 0, not_traveling: 0 }
    expect(formatManifestSummary(summary)).toContain("2 missing")
  })

  it("includes self_arranged and not_traveling", () => {
    const summary = { total_cells: 6, assigned: 3, missing: 1, self_arranged: 1, not_traveling: 1 }
    const label = formatManifestSummary(summary)
    expect(label).toContain("self-arranged")
    expect(label).toContain("not traveling")
  })
})
