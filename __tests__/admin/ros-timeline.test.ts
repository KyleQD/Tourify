import { describe, it, expect } from "vitest"
import {
  transitionRosVersion,
  makeRosItem,
  addRosItemNote,
  recordActualTime,
  addDependency,
  detectDependencyCycle,
  computePlannedEndUtc,
  publishRosVersion,
  createNewRosDraft,
  diffRosItems,
  summarizeRosTimeline,
  type RosVersion,
  type RosItem,
} from "../../lib/admin/ros-timeline"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseVersion(overrides: Partial<RosVersion> = {}): RosVersion {
  return {
    id: "ros-v1",
    org_id: "org-1",
    event_id: "ev-1",
    version_number: 1,
    status: "draft",
    content_checksum: "",
    created_by: "user-pm",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

function item(id: string, startUtc: string, durationMinutes = 60, overrides: Partial<RosItem> = {}): RosItem {
  return makeRosItem({
    id,
    ros_version_id: "ros-v1",
    event_id: "ev-1",
    category: "show",
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
// transitionRosVersion
// ---------------------------------------------------------------------------

describe("transitionRosVersion", () => {
  it("allows draft → review", () => expect(transitionRosVersion("draft", "review").ok).toBe(true))
  it("allows review → published", () => expect(transitionRosVersion("review", "published").ok).toBe(true))
  it("allows published → superseded", () => expect(transitionRosVersion("published", "superseded").ok).toBe(true))
  it("allows review → draft (send back)", () => expect(transitionRosVersion("review", "draft").ok).toBe(true))
  it("blocks superseded → draft (terminal)", () => expect(transitionRosVersion("superseded", "draft").ok).toBe(false))
  it("blocks draft → published directly", () => expect(transitionRosVersion("draft", "published").ok).toBe(false))
})

// ---------------------------------------------------------------------------
// makeRosItem
// ---------------------------------------------------------------------------

describe("makeRosItem", () => {
  it("creates item with correct defaults", () => {
    const i = item("i1", "2025-09-15T00:00:00Z")
    expect(i.notes).toHaveLength(0)
    expect(i.ordered_after).toHaveLength(0)
    expect(i.source.type).toBe("manual")
    expect(i.is_critical).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// computePlannedEndUtc
// ---------------------------------------------------------------------------

describe("computePlannedEndUtc", () => {
  it("adds duration to start", () => {
    expect(computePlannedEndUtc("2025-09-15T20:00:00Z", 90)).toBe("2025-09-15T21:30:00.000Z")
  })
  it("handles midnight crossover", () => {
    const end = computePlannedEndUtc("2025-09-15T23:30:00Z", 60)
    expect(end).toBe("2025-09-16T00:30:00.000Z")
  })
})

// ---------------------------------------------------------------------------
// addRosItemNote
// ---------------------------------------------------------------------------

describe("addRosItemNote", () => {
  it("appends public note", () => {
    const i = item("i1", "2025-09-15T20:00:00Z")
    const updated = addRosItemNote(i, { body: "All crew report backstage", visibility: "public", author_id: "user-pm", now: "2025-06-01T00:00:00Z" })
    expect(updated.notes).toHaveLength(1)
    expect(updated.notes[0].visibility).toBe("public")
  })
  it("appends internal note without exposing it publicly", () => {
    const i = item("i1", "2025-09-15T20:00:00Z")
    const updated = addRosItemNote(i, { body: "Sensitive note", visibility: "internal", author_id: "user-pm" })
    const internals = updated.notes.filter((n) => n.visibility === "internal")
    expect(internals).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// recordActualTime
// ---------------------------------------------------------------------------

describe("recordActualTime", () => {
  it("records actual timing without mutating planned fields", () => {
    const i = item("i1", "2025-09-15T20:00:00Z")
    const updated = recordActualTime(i, {
      actual_start_utc: "2025-09-15T20:05:00Z",
      actual_end_utc: "2025-09-15T21:10:00Z",
      delay_minutes: 5,
      delay_reason: "Late load-in",
      recorded_by: "user-ld",
      recorded_at: "2025-09-15T21:10:00Z",
    })
    expect(updated.actual?.delay_minutes).toBe(5)
    // planned_start_utc must be unchanged
    expect(updated.planned_start_utc).toBe("2025-09-15T20:00:00Z")
  })
})

// ---------------------------------------------------------------------------
// addDependency
// ---------------------------------------------------------------------------

describe("addDependency", () => {
  it("adds a dependency", () => {
    const i = item("i2", "2025-09-15T21:00:00Z")
    const updated = addDependency(i, "i1")
    expect(updated.ordered_after).toContain("i1")
  })
  it("is idempotent", () => {
    const i = item("i2", "2025-09-15T21:00:00Z")
    const once = addDependency(i, "i1")
    const twice = addDependency(once, "i1")
    expect(twice.ordered_after).toHaveLength(1)
  })
  it("throws for self-dependency", () => {
    expect(() => addDependency(item("i1", "2025-09-15T20:00:00Z"), "i1")).toThrow(/itself/)
  })
})

// ---------------------------------------------------------------------------
// detectDependencyCycle
// ---------------------------------------------------------------------------

describe("detectDependencyCycle", () => {
  it("returns null when no cycle", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z"),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
      item("c", "2025-09-15T20:00:00Z", 60, { ordered_after: ["b"] }),
    ]
    expect(detectDependencyCycle(items)).toBeNull()
  })

  it("detects a direct cycle: a → b → a", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 60, { ordered_after: ["b"] }),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
    ]
    expect(detectDependencyCycle(items)).not.toBeNull()
  })

  it("detects a longer cycle: a → b → c → a", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 60, { ordered_after: ["c"] }),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
      item("c", "2025-09-15T20:00:00Z", 60, { ordered_after: ["b"] }),
    ]
    expect(detectDependencyCycle(items)).not.toBeNull()
  })

  it("handles empty list", () => {
    expect(detectDependencyCycle([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// publishRosVersion
// ---------------------------------------------------------------------------

describe("publishRosVersion", () => {
  it("publishes a review-status version", () => {
    const v = baseVersion({ status: "review" })
    const published = publishRosVersion(v, "user-pm", "chk-abc", "2025-08-01T00:00:00Z")
    expect(published.status).toBe("published")
    expect(published.published_by).toBe("user-pm")
    expect(published.published_at).toBe("2025-08-01T00:00:00Z")
    expect(published.content_checksum).toBe("chk-abc")
  })

  it("throws for draft status (must go through review)", () => {
    expect(() => publishRosVersion(baseVersion(), "user-pm", "chk")).toThrow()
  })
})

// ---------------------------------------------------------------------------
// createNewRosDraft
// ---------------------------------------------------------------------------

describe("createNewRosDraft", () => {
  it("creates draft v2 and supersedes v1", () => {
    const published = baseVersion({ status: "published", version_number: 1 })
    const { superseded, draft } = createNewRosDraft(published, "ros-v2", "user-pm", "2025-09-01T00:00:00Z")
    expect(superseded.status).toBe("superseded")
    expect(draft.version_number).toBe(2)
    expect(draft.status).toBe("draft")
    expect(draft.previous_version_id).toBe("ros-v1")
  })

  it("throws when branching from non-published", () => {
    expect(() => createNewRosDraft(baseVersion({ status: "draft" }), "v2", "u")).toThrow(/published/)
  })
})

// ---------------------------------------------------------------------------
// diffRosItems
// ---------------------------------------------------------------------------

describe("diffRosItems", () => {
  const v1items = [
    item("a", "2025-09-15T18:00:00Z"),
    item("b", "2025-09-15T19:00:00Z"),
  ]

  it("detects added item", () => {
    const v2items = [...v1items, item("c", "2025-09-15T20:00:00Z")]
    const diff = diffRosItems(v1items, v2items)
    expect(diff.find((d) => d.item_id === "c")?.diff_status).toBe("added")
  })

  it("detects removed item", () => {
    const diff = diffRosItems(v1items, [v1items[0]])
    expect(diff.find((d) => d.item_id === "b")?.diff_status).toBe("removed")
  })

  it("detects updated item (title changed)", () => {
    const v2items = [
      item("a", "2025-09-15T18:00:00Z", 60, { title: "Updated title" }),
      v1items[1],
    ]
    const diff = diffRosItems(v1items, v2items)
    const updated = diff.find((d) => d.item_id === "a")!
    expect(updated.diff_status).toBe("updated")
    expect(updated.changed_fields).toContain("title")
  })

  it("marks unchanged items", () => {
    const diff = diffRosItems(v1items, v1items)
    expect(diff.every((d) => d.diff_status === "unchanged")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// summarizeRosTimeline
// ---------------------------------------------------------------------------

describe("summarizeRosTimeline", () => {
  it("summarises correctly", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 90),
      item("b", "2025-09-15T20:00:00Z", 120, { is_critical: true }),
    ]
    const summary = summarizeRosTimeline(baseVersion({ status: "published" }), items)
    expect(summary.total_items).toBe(2)
    expect(summary.critical_items).toBe(1)
    expect(summary.has_dependency_cycle).toBe(false)
    expect(summary.first_item_utc).toBe("2025-09-15T18:00:00Z")
    expect(summary.last_item_utc).toBe("2025-09-15T22:00:00.000Z")
  })

  it("detects cycle in summary", () => {
    const items = [
      item("a", "2025-09-15T18:00:00Z", 60, { ordered_after: ["b"] }),
      item("b", "2025-09-15T19:00:00Z", 60, { ordered_after: ["a"] }),
    ]
    const summary = summarizeRosTimeline(baseVersion(), items)
    expect(summary.has_dependency_cycle).toBe(true)
  })
})
