/**
 * WORK-408 — Bulk shift generation tests.
 */

import { describe, it, expect } from "vitest"
import {
  generateShifts,
  isValidShiftWindow,
  type ShiftGenerationCandidate,
  type PersistedShift,
  type BulkShiftGenerationRequest,
} from "@/lib/admin/shift-generation"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seq = 0
function candidate(
  date: string,
  startLocal: string,
  endLocal: string,
  overrides: Partial<ShiftGenerationCandidate> = {},
): ShiftGenerationCandidate {
  const id = `slot-${++seq}`
  return {
    idempotency_key: overrides.idempotency_key ?? `tour-1:${date}:${id}`,
    tour_id: "tour-1",
    date,
    slot_id: overrides.slot_id ?? id,
    role_label: overrides.role_label ?? "Stage Hand",
    department: "Stage",
    day_type: overrides.day_type ?? "show",
    start_local: startLocal,
    end_local: endLocal,
    headcount_required: 1,
    skill_tags: [],
    ...overrides,
  }
}

function persisted(
  shiftId: string,
  date: string,
  startLocal: string,
  endLocal: string,
  isLocked = false,
  idempotencyKey?: string,
): PersistedShift {
  return {
    shift_id: shiftId,
    idempotency_key: idempotencyKey ?? null,
    date,
    start_local: startLocal,
    end_local: endLocal,
    is_locked: isLocked,
    role_label: "Existing",
  }
}

function req(
  candidates: ShiftGenerationCandidate[],
  existing: PersistedShift[] = [],
  opts: Partial<BulkShiftGenerationRequest> = {},
): BulkShiftGenerationRequest {
  return {
    tour_id: "tour-1",
    candidates,
    existing_shifts: existing,
    ...opts,
  }
}

// ---------------------------------------------------------------------------
// isValidShiftWindow
// ---------------------------------------------------------------------------

describe("WORK-408 — isValidShiftWindow", () => {
  it("valid when start < end", () => {
    expect(isValidShiftWindow("2026-10-15T09:00:00", "2026-10-15T17:00:00")).toBe(true)
  })

  it("invalid when start === end", () => {
    expect(isValidShiftWindow("2026-10-15T09:00:00", "2026-10-15T09:00:00")).toBe(false)
  })

  it("invalid when start > end", () => {
    expect(isValidShiftWindow("2026-10-15T17:00:00", "2026-10-15T09:00:00")).toBe(false)
  })

  it("invalid when either value is empty", () => {
    expect(isValidShiftWindow("", "2026-10-15T09:00:00")).toBe(false)
    expect(isValidShiftWindow("2026-10-15T09:00:00", "")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Happy path — all created
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: happy path", () => {
  it("creates all candidates when no conflicts or duplicates", () => {
    const cs = [
      candidate("2026-10-15", "2026-10-15T09:00:00", "2026-10-15T17:00:00"),
      candidate("2026-10-15", "2026-10-15T18:00:00", "2026-10-15T22:00:00"),
    ]
    const result = generateShifts(req(cs))
    expect(result.created_count).toBe(2)
    expect(result.skipped_count).toBe(0)
    expect(result.all_created).toBe(true)
    expect(result.items.every((i) => i.result === "created")).toBe(true)
  })

  it("supports all five day_types", () => {
    const dayTypes = ["show", "travel", "rehearsal", "warehouse", "other"] as const
    const cs = dayTypes.map((dt, i) =>
      candidate(`2026-10-${15 + i}`, `2026-10-${15 + i}T09:00:00`, `2026-10-${15 + i}T17:00:00`, {
        day_type: dt,
      }),
    )
    const result = generateShifts(req(cs))
    expect(result.created_count).toBe(5)
    const resultTypes = new Set(result.items.map((i) => i.day_type))
    for (const dt of dayTypes) expect(resultTypes.has(dt)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: idempotency", () => {
  it("skips candidate whose idempotency_key already exists in persisted shifts", () => {
    const key = "tour-1:2026-10-15:slot-x"
    const cs = [candidate("2026-10-15", "2026-10-15T09:00:00", "2026-10-15T17:00:00", {
      idempotency_key: key,
    })]
    const existing = [persisted("ex-1", "2026-10-15", "2026-10-15T09:00:00", "2026-10-15T17:00:00", false, key)]
    const result = generateShifts(req(cs, existing))
    expect(result.items[0].result).toBe("duplicate_idempotency")
    expect(result.skip_summary.duplicate_idempotency).toBe(1)
    expect(result.created_count).toBe(0)
  })

  it("skips duplicate idempotency_key within the same batch", () => {
    const key = "tour-1:2026-10-15:slot-dup"
    const cs = [
      candidate("2026-10-15", "2026-10-15T09:00:00", "2026-10-15T13:00:00", { idempotency_key: key }),
      candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T18:00:00", { idempotency_key: key }),
    ]
    const result = generateShifts(req(cs))
    expect(result.created_count).toBe(1)
    expect(result.skip_summary.duplicate_idempotency).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Locked conflicts
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: locked conflicts", () => {
  it("skips candidate overlapping a locked shift", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T20:00:00")]
    const existing = [
      persisted("locked-1", "2026-10-15", "2026-10-15T15:00:00", "2026-10-15T19:00:00", true),
    ]
    const result = generateShifts(req(cs, existing))
    expect(result.items[0].result).toBe("locked_conflict")
    expect(result.items[0].conflict_shift_ids).toContain("locked-1")
    expect(result.skip_summary.locked_conflict).toBe(1)
  })

  it("locked conflict takes priority over soft conflict when both present", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T22:00:00")]
    const existing = [
      persisted("locked-1", "2026-10-15", "2026-10-15T15:00:00", "2026-10-15T17:00:00", true),
      persisted("soft-1", "2026-10-15", "2026-10-15T18:00:00", "2026-10-15T20:00:00", false),
    ]
    const result = generateShifts(req(cs, existing))
    expect(result.items[0].result).toBe("locked_conflict")
  })
})

// ---------------------------------------------------------------------------
// Soft conflicts
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: soft conflicts", () => {
  it("skips candidate overlapping an unlocked shift (default)", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T20:00:00")]
    const existing = [
      persisted("soft-1", "2026-10-15", "2026-10-15T15:00:00", "2026-10-15T18:00:00", false),
    ]
    const result = generateShifts(req(cs, existing))
    expect(result.items[0].result).toBe("soft_conflict")
    expect(result.skip_summary.soft_conflict).toBe(1)
  })

  it("creates shift overlapping unlocked shift when override_soft_conflicts=true", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T20:00:00")]
    const existing = [
      persisted("soft-1", "2026-10-15", "2026-10-15T15:00:00", "2026-10-15T18:00:00", false),
    ]
    const result = generateShifts(req(cs, existing, { override_soft_conflicts: true }))
    expect(result.items[0].result).toBe("created")
    // Conflict IDs are still noted
    expect(result.items[0].conflict_shift_ids).toContain("soft-1")
  })

  it("only checks conflicts on matching date", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T20:00:00")]
    const existing = [
      // Same time window but different date — should not conflict
      persisted("other-date", "2026-10-16", "2026-10-16T14:00:00", "2026-10-16T20:00:00", false),
    ]
    const result = generateShifts(req(cs, existing))
    expect(result.items[0].result).toBe("created")
  })
})

// ---------------------------------------------------------------------------
// Invalid windows
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: invalid windows", () => {
  it("rejects candidate where end ≤ start", () => {
    const cs = [candidate("2026-10-15", "2026-10-15T17:00:00", "2026-10-15T09:00:00")]
    const result = generateShifts(req(cs))
    expect(result.items[0].result).toBe("invalid_window")
    expect(result.skip_summary.invalid_window).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Multi-date bulk generation
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: multi-date bulk", () => {
  it("handles candidates across multiple dates independently", () => {
    const cs = [
      candidate("2026-10-15", "2026-10-15T09:00:00", "2026-10-15T17:00:00"),
      candidate("2026-10-16", "2026-10-16T09:00:00", "2026-10-16T17:00:00"),
      candidate("2026-10-17", "2026-10-17T09:00:00", "2026-10-17T17:00:00"),
    ]
    const result = generateShifts(req(cs))
    expect(result.created_count).toBe(3)
    expect(result.all_created).toBe(true)
  })

  it("skip on one date does not affect other dates", () => {
    const cs = [
      candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T20:00:00"),
      candidate("2026-10-16", "2026-10-16T14:00:00", "2026-10-16T20:00:00"),
    ]
    const existing = [
      persisted("locked-1", "2026-10-15", "2026-10-15T15:00:00", "2026-10-15T18:00:00", true),
    ]
    const result = generateShifts(req(cs, existing))
    const day15 = result.items.find((i) => i.date === "2026-10-15")!
    const day16 = result.items.find((i) => i.date === "2026-10-16")!
    expect(day15.result).toBe("locked_conflict")
    expect(day16.result).toBe("created")
    expect(result.created_count).toBe(1)
    expect(result.skipped_count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Result summary
// ---------------------------------------------------------------------------

describe("WORK-408 — generateShifts: result summary", () => {
  it("produces correct skip_summary counts", () => {
    const dupKey = "tour-1:2026-10-15:slot-dup-fixed"
    const cs = [
      candidate("2026-10-15", "2026-10-15T09:00:00", "2026-10-15T10:00:00"), // created
      candidate("2026-10-15", "2026-10-15T17:00:00", "2026-10-15T09:00:00"), // invalid_window
      candidate("2026-10-15", "2026-10-15T14:00:00", "2026-10-15T18:00:00", {
        idempotency_key: dupKey,
      }), // duplicate
      candidate("2026-10-15", "2026-10-15T20:00:00", "2026-10-15T22:00:00"), // locked_conflict
    ]
    const existing = [
      persisted("locked-2", "2026-10-15", "2026-10-15T20:00:00", "2026-10-15T22:00:00", true),
      persisted("ex-dup", "2026-10-15", "2026-10-15T14:00:00", "2026-10-15T18:00:00", false, dupKey),
    ]
    const result = generateShifts(req(cs, existing))
    expect(result.skip_summary.invalid_window).toBe(1)
    expect(result.skip_summary.duplicate_idempotency).toBe(1)
    expect(result.skip_summary.locked_conflict).toBe(1)
    expect(result.created_count).toBe(1)
  })
})
