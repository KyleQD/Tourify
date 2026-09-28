import { describe, it, expect } from "vitest"
import {
  validateRosTimeline,
  DEFAULT_VALIDATION_CONFIG,
  type RosValidationConfig,
} from "../../lib/admin/ros-validation"
import { makeRosItem, computePlannedEndUtc, type RosItem } from "../../lib/admin/ros-timeline"

// ---------------------------------------------------------------------------
// Item builder helper
// ---------------------------------------------------------------------------

function item(
  id: string,
  startUtc: string,
  durationMinutes = 60,
  overrides: Partial<RosItem> = {},
): RosItem {
  return makeRosItem({
    id,
    ros_version_id: "ros-v1",
    event_id: "ev-1",
    category: "other",
    title: `Item ${id}`,
    planned_start_local: "20:00",
    planned_start_utc: startUtc,
    planned_end_utc: computePlannedEndUtc(startUtc, durationMinutes),
    duration_minutes: durationMinutes,
    time_zone: "America/New_York",
    ...overrides,
  }, "2025-01-01T00:00:00Z")
}

// ---------------------------------------------------------------------------
// Clean timeline
// ---------------------------------------------------------------------------

describe("validateRosTimeline — clean", () => {
  it("passes a clean timeline with no issues", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 120, { owner_id: "user-pm", location: { label: "Stage" } }),
      item("b", "2025-09-15T20:00:00Z", 120, { owner_id: "user-pm" }),
    ]
    const result = validateRosTimeline(items)
    // Only missing_owner warning for b (no location required for "other" category)
    const blocking = result.issues.filter((i) => i.severity === "blocking")
    expect(blocking).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 1. Overlap
// ---------------------------------------------------------------------------

describe("overlap", () => {
  it("detects overlap for same owner", () => {
    const items = [
      item("a", "2025-09-15T20:00:00Z", 90, { owner_id: "user-pm" }),
      item("b", "2025-09-15T21:00:00Z", 60, { owner_id: "user-pm" }),
    ]
    const result = validateRosTimeline(items)
    const overlap = result.issues.filter((i) => i.code === "overlap")
    expect(overlap).toHaveLength(1)
    expect(overlap[0].severity).toBe("blocking")
  })

  it("detects overlap for same location", () => {
    const items = [
      item("a", "2025-09-15T20:00:00Z", 90, { owner_id: "user-a", location: { label: "Stage" } }),
      item("b", "2025-09-15T21:00:00Z", 60, { owner_id: "user-b", location: { label: "Stage" } }),
    ]
    const result = validateRosTimeline(items)
    expect(result.issues.filter((i) => i.code === "overlap")).toHaveLength(1)
  })

  it("no overlap when sequential", () => {
    const items = [
      item("a", "2025-09-15T20:00:00Z", 60, { owner_id: "user-pm", location: { label: "Stage" } }),
      item("b", "2025-09-15T21:00:00Z", 60, { owner_id: "user-pm", location: { label: "Stage" } }),
    ]
    const result = validateRosTimeline(items)
    expect(result.issues.filter((i) => i.code === "overlap")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Dependency inversion
// ---------------------------------------------------------------------------

describe("dependency_inversion", () => {
  it("detects item that starts before its dependency ends", () => {
    const items = [
      item("load", "2025-09-15T18:00:00Z", 120),
      item("sound", "2025-09-15T18:30:00Z", 60, { ordered_after: ["load"] }),
    ]
    const result = validateRosTimeline(items)
    expect(result.issues.filter((i) => i.code === "dependency_inversion")).toHaveLength(1)
  })

  it("passes when item starts after dependency ends", () => {
    const items = [
      item("load", "2025-09-15T18:00:00Z", 120),
      item("sound", "2025-09-15T20:00:00Z", 60, { ordered_after: ["load"] }),
    ]
    const result = validateRosTimeline(items)
    expect(result.issues.filter((i) => i.code === "dependency_inversion")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Dependency cycle
// ---------------------------------------------------------------------------

describe("dependency_cycle", () => {
  it("detects a→b→a cycle", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 60, { ordered_after: ["b"] }),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
    ]
    const result = validateRosTimeline(items)
    expect(result.issues.filter((i) => i.code === "dependency_cycle")).toHaveLength(1)
  })

  it("no cycle for linear chain", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z"),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
    ]
    expect(validateRosTimeline(items).issues.filter((i) => i.code === "dependency_cycle")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Missing location
// ---------------------------------------------------------------------------

describe("missing_location", () => {
  it("flags load_in without location", () => {
    const items = [item("li", "2025-09-15T14:00:00Z", 120, { category: "load_in", owner_id: "u" })]
    const issues = validateRosTimeline(items).issues.filter((i) => i.code === "missing_location")
    expect(issues).toHaveLength(1)
  })

  it("does not flag 'other' category without location", () => {
    const items = [item("x", "2025-09-15T14:00:00Z", 30, { category: "other", owner_id: "u" })]
    const issues = validateRosTimeline(items).issues.filter((i) => i.code === "missing_location")
    expect(issues).toHaveLength(0)
  })

  it("is blocking for critical items missing location", () => {
    const items = [item("show", "2025-09-15T20:00:00Z", 120, { category: "show", is_critical: true, owner_id: "u" })]
    const issues = validateRosTimeline(items).issues.filter((i) => i.code === "missing_location")
    expect(issues[0].severity).toBe("blocking")
  })
})

// ---------------------------------------------------------------------------
// 5. Missing owner
// ---------------------------------------------------------------------------

describe("missing_owner", () => {
  it("flags item with no owner", () => {
    const items = [item("x", "2025-09-15T20:00:00Z")]
    const issues = validateRosTimeline(items).issues.filter((i) => i.code === "missing_owner")
    expect(issues).toHaveLength(1)
  })

  it("is blocking for critical items missing owner (unstaffed_critical)", () => {
    const items = [item("x", "2025-09-15T20:00:00Z", 60, { is_critical: true })]
    const blocking = validateRosTimeline(items).issues.filter((i) => i.code === "unstaffed_critical")
    expect(blocking[0].severity).toBe("blocking")
  })
})

// ---------------------------------------------------------------------------
// 6. Travel / load timing conflict
// ---------------------------------------------------------------------------

describe("travel_load_conflict", () => {
  it("flags load_out → travel with too short gap", () => {
    // load_out ends at T+60; travel starts at T+75 → 15 min gap (min 30)
    const lo = item("lo", "2025-09-15T14:00:00Z", 60, { category: "load_out", owner_id: "u" })
    const tr = item("tr", "2025-09-15T15:15:00Z", 120, { category: "travel", owner_id: "u" })
    const result = validateRosTimeline([lo, tr])
    expect(result.issues.filter((i) => i.code === "travel_load_conflict")).toHaveLength(1)
  })

  it("passes load_out → travel with sufficient gap", () => {
    const lo = item("lo", "2025-09-15T14:00:00Z", 60, { category: "load_out", owner_id: "u" })
    const tr = item("tr", "2025-09-15T15:30:00Z", 120, { category: "travel", owner_id: "u" })
    expect(validateRosTimeline([lo, tr]).issues.filter((i) => i.code === "travel_load_conflict")).toHaveLength(0)
  })

  it("flags travel → load_in with too short gap", () => {
    const tr = item("tr", "2025-09-15T08:00:00Z", 120, { category: "travel", owner_id: "u" })
    const li = item("li", "2025-09-15T10:10:00Z", 120, { category: "load_in", owner_id: "u", location: { label: "Stage" } })
    expect(validateRosTimeline([tr, li]).issues.filter((i) => i.code === "travel_load_conflict")).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 7. Curfew breach
// ---------------------------------------------------------------------------

describe("curfew_breach", () => {
  const config: RosValidationConfig = { ...DEFAULT_VALIDATION_CONFIG, curfew_utc: "2025-09-16T04:00:00Z" }

  it("flags item that ends after curfew", () => {
    const items = [item("show", "2025-09-16T03:00:00Z", 120, { owner_id: "u" })]  // ends 05:00 UTC
    const result = validateRosTimeline(items, config)
    expect(result.issues.filter((i) => i.code === "curfew_breach")).toHaveLength(1)
    expect(result.issues[0].severity).toBe("blocking")
  })

  it("passes when item ends before curfew", () => {
    const items = [item("show", "2025-09-16T02:00:00Z", 60, { owner_id: "u" })]  // ends 03:00 UTC
    expect(validateRosTimeline(items, config).issues.filter((i) => i.code === "curfew_breach")).toHaveLength(0)
  })

  it("no curfew check when curfew_utc not configured", () => {
    const items = [item("show", "2025-09-16T03:00:00Z", 180, { owner_id: "u" })]
    expect(validateRosTimeline(items).issues.filter((i) => i.code === "curfew_breach")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Unstaffed critical
// ---------------------------------------------------------------------------

describe("unstaffed_critical", () => {
  it("flags critical item with no owner", () => {
    const items = [item("x", "2025-09-15T20:00:00Z", 60, { is_critical: true })]
    expect(validateRosTimeline(items).issues.filter((i) => i.code === "unstaffed_critical")).toHaveLength(1)
  })

  it("passes when critical item has owner", () => {
    const items = [item("x", "2025-09-15T20:00:00Z", 60, { is_critical: true, owner_id: "user-pm" })]
    expect(validateRosTimeline(items).issues.filter((i) => i.code === "unstaffed_critical")).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Summary fields
// ---------------------------------------------------------------------------

describe("validateRosTimeline — summary", () => {
  it("reports valid=false when blocking issues exist", () => {
    const items = [item("a", "2025-09-15T20:00:00Z", 60, { is_critical: true })]  // unstaffed_critical
    const result = validateRosTimeline(items)
    expect(result.valid).toBe(false)
    expect(result.blocking_count).toBeGreaterThan(0)
  })

  it("reports valid=true when only warnings", () => {
    const config: RosValidationConfig = { ...DEFAULT_VALIDATION_CONFIG, missing_owner_severity: "warning" }
    const items = [item("a", "2025-09-15T20:00:00Z", 60)]  // missing owner, not critical
    const result = validateRosTimeline(items, config)
    expect(result.valid).toBe(true)
    expect(result.warning_count).toBeGreaterThan(0)
  })
})
