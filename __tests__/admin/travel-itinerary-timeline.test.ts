/**
 * TRAVEL-304 — Itinerary timeline builder tests.
 */

import { describe, it, expect } from "vitest"
import {
  buildPersonItinerary,
  buildGroupItinerary,
  type RawTimelineEntry,
} from "@/lib/admin/travel-itinerary-timeline"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-08-01T20:00:00.000Z"

const makeEntry = (
  id: string,
  kind: RawTimelineEntry["kind"],
  startUtc: string,
  endUtc: string,
  overrides: Partial<RawTimelineEntry> = {},
): RawTimelineEntry => ({
  entry_id: id,
  kind,
  coverage: "confirmed",
  label: `Entry ${id}`,
  start_utc: startUtc,
  end_utc: endUtc,
  ianaZone: "America/Chicago",
  source_id: id,
  data_updated_at: "2026-08-01T18:00:00Z",
  nowIso: NOW,
  ...overrides,
})

// ---------------------------------------------------------------------------
// buildPersonItinerary
// ---------------------------------------------------------------------------

describe("buildPersonItinerary — basic structure", () => {
  it("sorts entries chronologically", () => {
    const entries = [
      makeEntry("b", "travel", "2026-08-01T14:00:00Z", "2026-08-01T16:00:00Z"),
      makeEntry("a", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z"),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.entries[0].entry_id).toBe("b")
    expect(itin.entries[1].entry_id).toBe("a")
  })

  it("enriches entries with local date/time", () => {
    const entries = [makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z")]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.entries[0].local_date).toBe("2026-08-01")
    expect(itin.entries[0].local_start_time).toBeTruthy()
    expect(itin.entries[0].local_end_time).toBeTruthy()
  })

  it("summary counts are correct", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z"),
      makeEntry("e2", "travel", "2026-08-02T08:00:00Z", "2026-08-02T12:00:00Z", { coverage: "proposed" }),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.summary.total_entries).toBe(2)
    expect(itin.summary.confirmed).toBe(1)
    expect(itin.summary.proposed).toBe(1)
  })
})

describe("buildPersonItinerary — gap detection", () => {
  it("detects a gap between two entries", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z"),
      // 9-hour gap
      makeEntry("e2", "show", "2026-08-02T08:00:00Z", "2026-08-02T11:00:00Z"),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries, minGapMinutes: 60 })
    expect(itin.gaps).toHaveLength(1)
    expect(itin.gaps[0].gap_minutes).toBe(540) // 9h = 540min
  })

  it("no gap when entries are back-to-back", () => {
    const entries = [
      makeEntry("e1", "travel", "2026-08-01T08:00:00Z", "2026-08-01T12:00:00Z"),
      makeEntry("e2", "show", "2026-08-01T12:00:00Z", "2026-08-01T15:00:00Z"),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries, minGapMinutes: 60 })
    expect(itin.gaps).toHaveLength(0)
  })

  it("ignores gaps shorter than minGapMinutes", () => {
    const entries = [
      makeEntry("e1", "travel", "2026-08-01T08:00:00Z", "2026-08-01T10:00:00Z"),
      makeEntry("e2", "show", "2026-08-01T10:30:00Z", "2026-08-01T13:00:00Z"), // 30min gap
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries, minGapMinutes: 60 })
    expect(itin.gaps).toHaveLength(0)
  })

  it("gap summary count", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z"),
      makeEntry("e2", "show", "2026-08-03T20:00:00Z", "2026-08-03T23:00:00Z"), // 2-day gap
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.summary.gap_count).toBe(1)
  })
})

describe("buildPersonItinerary — overlap detection", () => {
  it("detects overlapping entries", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T19:00:00Z", "2026-08-01T22:00:00Z"),
      makeEntry("e2", "call", "2026-08-01T20:00:00Z", "2026-08-01T21:00:00Z"), // 1h overlap
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.overlaps).toHaveLength(1)
    expect(itin.overlaps[0].overlap_minutes).toBe(60)
  })

  it("no overlap when entries are sequential", () => {
    const entries = [
      makeEntry("e1", "travel", "2026-08-01T08:00:00Z", "2026-08-01T12:00:00Z"),
      makeEntry("e2", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z"),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.overlaps).toHaveLength(0)
  })
})

describe("buildPersonItinerary — stale data", () => {
  it("marks entry as stale when data_updated_at is old", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z", {
        data_updated_at: "2026-07-01T00:00:00Z", // 1 month ago
        maxAgeMinutes: 60,
        nowIso: NOW,
      }),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.entries[0].is_stale).toBe(true)
    expect(itin.stale_entries).toHaveLength(1)
  })

  it("marks entry as stale when data_updated_at is null", () => {
    const entries = [
      makeEntry("e1", "lodging", "2026-08-01T14:00:00Z", "2026-08-02T11:00:00Z", {
        data_updated_at: null,
      }),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.entries[0].is_stale).toBe(true)
  })

  it("not stale when freshly updated", () => {
    const entries = [
      makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z", {
        data_updated_at: "2026-08-01T19:30:00Z",
        maxAgeMinutes: 60,
        nowIso: NOW,
      }),
    ]
    const itin = buildPersonItinerary({ person_id: "p1", rawEntries: entries })
    expect(itin.entries[0].is_stale).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildGroupItinerary
// ---------------------------------------------------------------------------

describe("buildGroupItinerary", () => {
  it("builds itinerary for each group member", () => {
    const group = [
      { person_id: "p1", rawEntries: [makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z")] },
      { person_id: "p2", rawEntries: [makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z")] },
    ]
    const group_itin = buildGroupItinerary({ group })
    expect(group_itin.entries_by_person.size).toBe(2)
  })

  it("identifies shared entries (same source_id across all members)", () => {
    const group = [
      { person_id: "p1", rawEntries: [makeEntry("shared-e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z", { source_id: "shared-e1" })] },
      { person_id: "p2", rawEntries: [makeEntry("shared-e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z", { source_id: "shared-e1" })] },
    ]
    const group_itin = buildGroupItinerary({ group })
    expect(group_itin.shared_entries.some((e) => e.source_id === "shared-e1")).toBe(true)
  })

  it("lists people requiring attention when they have gaps or overlaps", () => {
    const show = makeEntry("e1", "show", "2026-08-01T20:00:00Z", "2026-08-01T23:00:00Z")
    const showLater = makeEntry("e2", "show", "2026-08-04T20:00:00Z", "2026-08-04T23:00:00Z") // 3-day gap
    const group = [
      { person_id: "p1", rawEntries: [show, showLater] }, // has gap
      { person_id: "p2", rawEntries: [show] },             // no gaps
    ]
    const group_itin = buildGroupItinerary({ group, minGapMinutes: 60 })
    expect(group_itin.attention_required).toContain("p1")
    expect(group_itin.attention_required).not.toContain("p2")
  })
})
