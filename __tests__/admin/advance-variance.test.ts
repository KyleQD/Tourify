import { describe, it, expect } from "vitest"
import {
  detectVariances,
  assignVarianceFinding,
  transitionVarianceFinding,
  summarizeVariances,
  type TourStandardEntry,
  type LocalResponseValue,
  type AdvanceVarianceFinding,
} from "../../lib/admin/advance-variance"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STANDARDS: TourStandardEntry[] = [
  { id: "std-1", category: "production", field_key: "stage.width_m", label: "Stage width (m)", expected_value: "20", numeric_tolerance: 1, severity_if_variance: "warning", blocks_publication: false },
  { id: "std-2", category: "production", field_key: "power.amps", label: "Power (amps)", expected_value: "400", numeric_tolerance: 0, severity_if_variance: "critical", blocks_publication: true },
  { id: "std-3", category: "curfew", field_key: "curfew.time", label: "Curfew time", expected_value: "23:00", severity_if_variance: "critical", blocks_publication: true },
  { id: "std-4", category: "hospitality", field_key: "dressing_rooms.count", label: "Dressing rooms", expected_value: "4", numeric_tolerance: 0, severity_if_variance: "warning", blocks_publication: false },
  { id: "std-5", category: "budget", field_key: "production.budget_usd", label: "Production budget", expected_value: "50000", numeric_tolerance: 5000, severity_if_variance: "info", blocks_publication: false },
]

const MATCHING_RESPONSES: LocalResponseValue[] = [
  { field_key: "stage.width_m", raw_value: "20", is_missing: false },
  { field_key: "power.amps", raw_value: "400", is_missing: false },
  { field_key: "curfew.time", raw_value: "23:00", is_missing: false },
  { field_key: "dressing_rooms.count", raw_value: "4", is_missing: false },
  { field_key: "production.budget_usd", raw_value: "50000", is_missing: false },
]

// ---------------------------------------------------------------------------
// detectVariances — no findings when all match
// ---------------------------------------------------------------------------

describe("detectVariances — matching responses", () => {
  it("produces no findings when all values match", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: STANDARDS,
      local_responses: MATCHING_RESPONSES,
      now: "2025-06-01T00:00:00Z",
    })
    expect(findings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// detectVariances — missing values
// ---------------------------------------------------------------------------

describe("detectVariances — missing values", () => {
  it("finds MISSING when field has no local response", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[1]],  // power.amps
      local_responses: [],
      now: "2025-06-01T00:00:00Z",
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].actual_value).toBe("MISSING")
    expect(findings[0].blocks_publication).toBe(true)
  })

  it("finds MISSING when is_missing flag is true", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[0]],
      local_responses: [{ field_key: "stage.width_m", raw_value: "", is_missing: true }],
      now: "2025-06-01T00:00:00Z",
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].actual_value).toBe("MISSING")
  })
})

// ---------------------------------------------------------------------------
// detectVariances — numeric tolerance
// ---------------------------------------------------------------------------

describe("detectVariances — numeric tolerance", () => {
  it("passes when value is within tolerance", () => {
    // stage.width_m expected 20, tolerance 1 — 19.5 is within tolerance
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[0]],
      local_responses: [{ field_key: "stage.width_m", raw_value: "19.5", is_missing: false }],
    })
    expect(findings).toHaveLength(0)
  })

  it("finds variance when value exceeds tolerance", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[0]],
      local_responses: [{ field_key: "stage.width_m", raw_value: "17", is_missing: false }],
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe("warning")
  })

  it("finds variance for exact zero-tolerance numeric mismatch", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[1]],  // power.amps, tolerance 0
      local_responses: [{ field_key: "power.amps", raw_value: "380", is_missing: false }],
    })
    expect(findings[0].blocks_publication).toBe(true)
    expect(findings[0].severity).toBe("critical")
  })
})

// ---------------------------------------------------------------------------
// detectVariances — string comparison
// ---------------------------------------------------------------------------

describe("detectVariances — string comparison", () => {
  it("passes on case-insensitive match", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[2]],  // curfew.time
      local_responses: [{ field_key: "curfew.time", raw_value: "23:00", is_missing: false }],
    })
    expect(findings).toHaveLength(0)
  })

  it("finds variance on curfew mismatch", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[2]],
      local_responses: [{ field_key: "curfew.time", raw_value: "22:00", is_missing: false }],
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].category).toBe("curfew")
  })

  it("passes budget within 5000 tolerance", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[4]],
      local_responses: [{ field_key: "production.budget_usd", raw_value: "52000", is_missing: false }],
    })
    expect(findings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// assignVarianceFinding
// ---------------------------------------------------------------------------

describe("assignVarianceFinding", () => {
  it("sets assigned_to", () => {
    const base: AdvanceVarianceFinding = {
      id: "f1", advance_section_id: "sec-1", tour_standard_id: "std-1",
      field_key: "stage.width_m", category: "production", severity: "warning",
      blocks_publication: false, expected_value: "20", actual_value: "17",
      description: "Variance", status: "open", detected_at: "2025-06-01T00:00:00Z",
    }
    const updated = assignVarianceFinding(base, "user-pm")
    expect(updated.assigned_to).toBe("user-pm")
  })
})

// ---------------------------------------------------------------------------
// transitionVarianceFinding
// ---------------------------------------------------------------------------

describe("transitionVarianceFinding", () => {
  function baseFinding(status: AdvanceVarianceFinding["status"] = "open"): AdvanceVarianceFinding {
    return {
      id: "f1", advance_section_id: "sec-1", tour_standard_id: "std-1",
      field_key: "stage.width_m", category: "production", severity: "warning",
      blocks_publication: false, expected_value: "20", actual_value: "17",
      description: "Variance", status, detected_at: "2025-06-01T00:00:00Z",
    }
  }

  it("acknowledges an open finding", () => {
    const f = transitionVarianceFinding(baseFinding(), { status: "acknowledged", actor_id: "user-pm" })
    expect(f.status).toBe("acknowledged")
  })

  it("resolves an acknowledged finding", () => {
    const f = transitionVarianceFinding(baseFinding("acknowledged"), {
      status: "resolved", actor_id: "user-pm", resolution_notes: "Venue adjusted stage.",
      now: "2025-06-10T00:00:00Z",
    })
    expect(f.status).toBe("resolved")
    expect(f.resolved_at).toBe("2025-06-10T00:00:00Z")
    expect(f.resolution_notes).toBe("Venue adjusted stage.")
  })

  it("waives with reason", () => {
    const f = transitionVarianceFinding(baseFinding(), {
      status: "waived", actor_id: "user-pm", waive_reason: "Tour director approved exception",
    })
    expect(f.status).toBe("waived")
    expect(f.waive_reason).toBe("Tour director approved exception")
  })

  it("requires waive_reason for waived", () => {
    expect(() =>
      transitionVarianceFinding(baseFinding(), { status: "waived", actor_id: "u" }),
    ).toThrow(/waive_reason/)
  })

  it("throws when transitioning from a terminal status", () => {
    expect(() =>
      transitionVarianceFinding(baseFinding("resolved"), { status: "acknowledged", actor_id: "u" }),
    ).toThrow(/Cannot transition/)
  })
})

// ---------------------------------------------------------------------------
// summarizeVariances
// ---------------------------------------------------------------------------

describe("summarizeVariances", () => {
  it("computes can_publish when no blocking open findings", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: STANDARDS,
      local_responses: MATCHING_RESPONSES,
    })
    expect(summarizeVariances(findings).can_publish).toBe(true)
  })

  it("blocks publication when a critical finding is open", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[1]],  // power.amps critical + blocks_publication
      local_responses: [{ field_key: "power.amps", raw_value: "300", is_missing: false }],
    })
    const summary = summarizeVariances(findings)
    expect(summary.can_publish).toBe(false)
    expect(summary.blocking_publication).toBe(1)
    expect(summary.critical).toBe(1)
  })

  it("does not block if blocking finding is resolved", () => {
    let finding = detectVariances({
      advance_section_id: "sec-1",
      standards: [STANDARDS[1]],
      local_responses: [{ field_key: "power.amps", raw_value: "300", is_missing: false }],
    })[0]
    finding = transitionVarianceFinding(finding, {
      status: "resolved", actor_id: "u", resolution_notes: "Fixed",
    })
    const summary = summarizeVariances([finding])
    expect(summary.can_publish).toBe(true)
  })

  it("counts by_category correctly", () => {
    const findings = detectVariances({
      advance_section_id: "sec-1",
      standards: STANDARDS,
      local_responses: [],
      now: "2025-06-01T00:00:00Z",
    })
    const summary = summarizeVariances(findings)
    expect(summary.by_category["production"]).toBe(2)
    expect(summary.by_category["curfew"]).toBe(1)
  })
})
