/**
 * TRAVEL-303 — Passenger assignment workflow tests.
 */

import { describe, it, expect } from "vitest"
import {
  previewBulkAssignment,
  executeBulkAssignment,
  type BulkAssignInput,
} from "@/lib/admin/travel-passenger-assignment"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const ACTOR = "user-1"
const SEG_ID = "seg1"
const DEP = "2026-08-01T08:00:00Z"
const ARR = "2026-08-01T10:00:00Z"

const baseInput = (overrides: Partial<BulkAssignInput> = {}): BulkAssignInput => ({
  segment_id: SEG_ID,
  segment_capacity: 10,
  segment_is_ticketed: false,
  departure_utc: DEP,
  arrival_utc: ARR,
  existing_assignments: [],
  candidates: [
    { person_id: "p1", person_name: "Alice", has_accessibility_needs: false, accessibility_met: true, active_segments: [] },
    { person_id: "p2", person_name: "Bob", has_accessibility_needs: false, accessibility_met: true, active_segments: [] },
  ],
  actor: ACTOR,
  at: NOW,
  ...overrides,
})

// ---------------------------------------------------------------------------
// previewBulkAssignment
// ---------------------------------------------------------------------------

describe("previewBulkAssignment — clean batch", () => {
  it("returns no conflicts for clean candidates", () => {
    const preview = previewBulkAssignment(baseInput())
    expect(preview.can_proceed).toBe(true)
    expect(preview.blocked_count).toBe(0)
    expect(preview.assignable_count).toBe(2)
    for (const item of preview.candidates) {
      expect(item.conflicts).toHaveLength(0)
      expect(item.can_assign).toBe(true)
    }
  })
})

describe("previewBulkAssignment — capacity conflict", () => {
  it("blocks when capacity would be exceeded", () => {
    const input = baseInput({ segment_capacity: 1 })
    const preview = previewBulkAssignment(input)
    // p1 is #1 (1/1 capacity OK), p2 is #2 (2/1 → blocked)
    const p2 = preview.candidates.find((c) => c.person_id === "p2")!
    expect(p2.conflicts.some((c) => c.conflict_type === "capacity")).toBe(true)
    expect(p2.can_assign).toBe(false)
  })
})

describe("previewBulkAssignment — duplicate conflict", () => {
  it("blocks when person is already assigned", () => {
    const input = baseInput({
      existing_assignments: [
        {
          assignment_id: "existing",
          segment_id: SEG_ID,
          person_id: "p1",
          person_name: "Alice",
          status: "confirmed",
          has_accessibility_needs: false,
          accessibility_met: true,
          created_by: ACTOR,
          created_at: NOW,
          updated_by: ACTOR,
          updated_at: NOW,
        },
      ],
    })
    const preview = previewBulkAssignment(input)
    const p1 = preview.candidates.find((c) => c.person_id === "p1")!
    expect(p1.conflicts.some((c) => c.conflict_type === "duplicate")).toBe(true)
    expect(p1.can_assign).toBe(false)
  })
})

describe("previewBulkAssignment — overlap conflict", () => {
  it("flags overridable overlap when times overlap", () => {
    const input = baseInput({
      candidates: [
        {
          person_id: "p1",
          person_name: "Alice",
          has_accessibility_needs: false,
          accessibility_met: true,
          active_segments: [
            { segment_id: "other-seg", departure_utc: "2026-08-01T07:00:00Z", arrival_utc: "2026-08-01T09:00:00Z" },
          ],
        },
      ],
    })
    const preview = previewBulkAssignment(input)
    const p1 = preview.candidates[0]
    expect(p1.conflicts.some((c) => c.conflict_type === "overlap")).toBe(true)
    expect(p1.conflicts.find((c) => c.conflict_type === "overlap")!.blocking).toBe(false)
    expect(p1.can_assign).toBe(true) // overridable, not blocking
  })

  it("no overlap conflict when times do not overlap", () => {
    const input = baseInput({
      candidates: [
        {
          person_id: "p1",
          person_name: "Alice",
          has_accessibility_needs: false,
          accessibility_met: true,
          active_segments: [
            { segment_id: "other-seg", departure_utc: "2026-08-01T11:00:00Z", arrival_utc: "2026-08-01T14:00:00Z" },
          ],
        },
      ],
    })
    const preview = previewBulkAssignment(input)
    expect(preview.candidates[0].conflicts).toHaveLength(0)
  })
})

describe("previewBulkAssignment — accessibility conflict", () => {
  it("flags overridable accessibility conflict", () => {
    const input = baseInput({
      candidates: [
        { person_id: "p1", person_name: "Alice", has_accessibility_needs: true, accessibility_met: false, active_segments: [] },
      ],
    })
    const preview = previewBulkAssignment(input)
    const p1 = preview.candidates[0]
    expect(p1.conflicts.some((c) => c.conflict_type === "accessibility")).toBe(true)
    expect(p1.conflicts.find((c) => c.conflict_type === "accessibility")!.blocking).toBe(false)
    expect(p1.can_assign).toBe(true) // overridable
  })
})

describe("previewBulkAssignment — missing ticket", () => {
  it("flags missing_ticket when segment is ticketed and no ticket_reference", () => {
    const input = baseInput({
      segment_is_ticketed: true,
      candidates: [
        { person_id: "p1", person_name: "Alice", has_accessibility_needs: false, accessibility_met: true, active_segments: [] },
      ],
    })
    const preview = previewBulkAssignment(input)
    expect(preview.candidates[0].conflicts.some((c) => c.conflict_type === "missing_ticket")).toBe(true)
  })

  it("no missing_ticket when ticket_reference is provided", () => {
    const input = baseInput({
      segment_is_ticketed: true,
      candidates: [
        { person_id: "p1", person_name: "Alice", has_accessibility_needs: false, accessibility_met: true, active_segments: [], ticket_reference: "TKT-001" },
      ],
    })
    const preview = previewBulkAssignment(input)
    expect(preview.candidates[0].conflicts.some((c) => c.conflict_type === "missing_ticket")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// executeBulkAssignment
// ---------------------------------------------------------------------------

describe("executeBulkAssignment — clean batch", () => {
  it("creates assignments for all candidates", () => {
    const result = executeBulkAssignment(baseInput())
    expect(result.created).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)
    expect(result.overridden).toHaveLength(0)
  })

  it("created assignments have correct fields", () => {
    const result = executeBulkAssignment(baseInput())
    const a = result.created[0]
    expect(a.segment_id).toBe(SEG_ID)
    expect(a.status).toBe("pending")
    expect(a.created_by).toBe(ACTOR)
  })
})

describe("executeBulkAssignment — skipping blocked", () => {
  it("skips candidates with blocking conflicts", () => {
    // p1 is already assigned
    const input = baseInput({
      existing_assignments: [
        {
          assignment_id: "e1",
          segment_id: SEG_ID,
          person_id: "p1",
          person_name: "Alice",
          status: "confirmed",
          has_accessibility_needs: false,
          accessibility_met: true,
          created_by: ACTOR,
          created_at: NOW,
          updated_by: ACTOR,
          updated_at: NOW,
        },
      ],
    })
    const result = executeBulkAssignment(input)
    expect(result.created.map((a) => a.person_id)).not.toContain("p1")
    expect(result.skipped.some((s) => s.person_id === "p1")).toBe(true)
  })
})

describe("executeBulkAssignment — override", () => {
  it("force-assigns people with only overridable conflicts when in override_ids", () => {
    const input = baseInput({
      segment_is_ticketed: true, // triggers missing_ticket (overridable)
      candidates: [
        { person_id: "p1", person_name: "Alice", has_accessibility_needs: false, accessibility_met: true, active_segments: [] },
      ],
      override_ids: new Set(["p1"]),
    })
    const result = executeBulkAssignment(input)
    expect(result.overridden).toHaveLength(1)
    expect(result.overridden[0].person_id).toBe("p1")
  })

  it("skips (not overrides) when overridable conflict exists but person not in override_ids", () => {
    const input = baseInput({
      segment_is_ticketed: true,
      candidates: [
        { person_id: "p1", person_name: "Alice", has_accessibility_needs: false, accessibility_met: true, active_segments: [] },
      ],
    })
    const result = executeBulkAssignment(input)
    expect(result.skipped).toHaveLength(1)
    expect(result.overridden).toHaveLength(0)
  })
})
