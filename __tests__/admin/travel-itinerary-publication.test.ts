/**
 * TRAVEL-306 — Traveler itinerary publication tests.
 */

import { describe, it, expect } from "vitest"
import {
  projectTravelerItinerary,
  acknowledgeTravelerItinerary,
  diffTravelerItineraries,
  type ItineraryProjectionInput,
  type TravelerItineraryPublication,
} from "@/lib/admin/travel-itinerary-publication"
import type { TimelineEntry } from "@/lib/admin/travel-itinerary-timeline"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-08-01T10:00:00.000Z"

const makeEntry = (id: string, sourceId: string | null = id): TimelineEntry => ({
  entry_id: id,
  kind: "show",
  coverage: "confirmed",
  label: `Entry ${id}`,
  start_utc: "2026-08-01T20:00:00Z",
  end_utc: "2026-08-01T23:00:00Z",
  ianaZone: "America/Chicago",
  local_date: "2026-08-01",
  local_start_time: "15:00",
  local_end_time: "18:00",
  location: "Chicago Venue",
  source_id: sourceId,
  data_updated_at: NOW,
  is_stale: false,
})

const baseInput = (overrides: Partial<ItineraryProjectionInput> = {}): ItineraryProjectionInput => ({
  person_id: "p1",
  person_name: "Alice",
  tour_id: "t1",
  tour_version_id: "tv1",
  entries: [makeEntry("e1")],
  rooms: [],
  shared_source_ids: new Set(),
  nowIso: NOW,
  ...overrides,
})

const makePub = (overrides: Partial<TravelerItineraryPublication> = {}): TravelerItineraryPublication =>
  projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1, ...overrides })

// ---------------------------------------------------------------------------
// projectTravelerItinerary
// ---------------------------------------------------------------------------

describe("projectTravelerItinerary — basic structure", () => {
  it("creates a publication with the correct person and tour", () => {
    const pub = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    expect(pub.person_id).toBe("p1")
    expect(pub.tour_id).toBe("t1")
    expect(pub.version).toBe(1)
    expect(pub.published_at).toBe(NOW)
  })

  it("projects all entries", () => {
    const pub = projectTravelerItinerary(
      baseInput({ entries: [makeEntry("e1"), makeEntry("e2")] }),
      { publicationId: "pub1", version: 1 },
    )
    expect(pub.entries).toHaveLength(2)
  })

  it("marks shared entries as is_group_entry=true", () => {
    const pub = projectTravelerItinerary(
      baseInput({ shared_source_ids: new Set(["e1"]) }),
      { publicationId: "pub1", version: 1 },
    )
    expect(pub.entries[0].is_group_entry).toBe(true)
  })

  it("marks non-shared entries as is_group_entry=false", () => {
    const pub = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    expect(pub.entries[0].is_group_entry).toBe(false)
  })
})

describe("projectTravelerItinerary — rooms projection", () => {
  it("projects room assignments with roommate names only", () => {
    const pub = projectTravelerItinerary(
      baseInput({
        rooms: [
          {
            room_night_id: "rn1",
            property_name: "Grand Hotel",
            check_in_date: "2026-08-01",
            check_out_date: "2026-08-02",
            confirmation_number: "CONF-123",
            roommate_names: ["Bob"],
          },
        ],
      }),
      { publicationId: "pub1", version: 1 },
    )
    expect(pub.rooms).toHaveLength(1)
    expect(pub.rooms[0].roommate_names).toContain("Bob")
    expect(pub.rooms[0].confirmation_number).toBe("CONF-123")
  })
})

describe("projectTravelerItinerary — offline token", () => {
  it("generates an offline token and expiry", () => {
    const pub = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    expect(pub.offline_token).toMatch(/^oit_/)
    expect(pub.offline_token_expires_at).toBeTruthy()
    // Expiry should be after NOW
    expect(new Date(pub.offline_token_expires_at).getTime()).toBeGreaterThan(new Date(NOW).getTime())
  })
})

describe("projectTravelerItinerary — acknowledgement", () => {
  it("starts unacknowledged on first publish", () => {
    const pub = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    expect(pub.acknowledgement.acknowledged).toBe(false)
    expect(pub.acknowledgement.needs_reacknowledgement).toBe(false) // v1 never needs re-ack
  })

  it("needs_reacknowledgement=true when a new version is published without re-ack", () => {
    const v1 = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    const v1acked = acknowledgeTravelerItinerary(v1, NOW)
    // Publish v2 with v1 as previous
    const v2 = projectTravelerItinerary(
      baseInput(),
      { publicationId: "pub1", version: 2, previousVersion: v1acked },
    )
    expect(v2.acknowledgement.needs_reacknowledgement).toBe(true)
  })

  it("needs_reacknowledgement=false when already acked at current version", () => {
    const v1 = projectTravelerItinerary(baseInput(), { publicationId: "pub1", version: 1 })
    const v1acked = acknowledgeTravelerItinerary(v1, NOW)
    // Republish at same version
    const v1b = projectTravelerItinerary(
      baseInput(),
      { publicationId: "pub1", version: 1, previousVersion: v1acked },
    )
    expect(v1b.acknowledgement.needs_reacknowledgement).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// acknowledgeTravelerItinerary
// ---------------------------------------------------------------------------

describe("acknowledgeTravelerItinerary", () => {
  it("marks itinerary as acknowledged", () => {
    const pub = makePub()
    const acked = acknowledgeTravelerItinerary(pub, "2026-08-01T12:00:00Z")
    expect(acked.acknowledgement.acknowledged).toBe(true)
    expect(acked.acknowledgement.acknowledged_at).toBe("2026-08-01T12:00:00Z")
    expect(acked.acknowledgement.acknowledged_version).toBe(pub.version)
    expect(acked.acknowledgement.needs_reacknowledgement).toBe(false)
  })

  it("does not mutate the original publication", () => {
    const pub = makePub()
    acknowledgeTravelerItinerary(pub, NOW)
    expect(pub.acknowledgement.acknowledged).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// diffTravelerItineraries
// ---------------------------------------------------------------------------

describe("diffTravelerItineraries", () => {
  it("no diff when entries are identical", () => {
    const v1 = makePub()
    const v2 = makePub()
    const diff = diffTravelerItineraries(v1, v2)
    expect(diff.has_changes).toBe(false)
    expect(diff.changes).toHaveLength(0)
  })

  it("detects added entry", () => {
    const v1 = makePub()
    const v2 = projectTravelerItinerary(
      baseInput({ entries: [makeEntry("e1"), makeEntry("e2")] }),
      { publicationId: "pub1", version: 2 },
    )
    const diff = diffTravelerItineraries(v1, v2)
    expect(diff.changes.some((c) => c.kind === "added" && c.entry_id === "e2")).toBe(true)
  })

  it("detects removed entry", () => {
    const v1 = projectTravelerItinerary(
      baseInput({ entries: [makeEntry("e1"), makeEntry("e2")] }),
      { publicationId: "pub1", version: 1 },
    )
    const v2 = makePub() // only e1
    const diff = diffTravelerItineraries(v1, v2)
    expect(diff.changes.some((c) => c.kind === "removed" && c.entry_id === "e2")).toBe(true)
  })

  it("detects changed entry (time change)", () => {
    const entry1: TimelineEntry = { ...makeEntry("e1"), local_start_time: "15:00" }
    const entry2: TimelineEntry = { ...makeEntry("e1"), local_start_time: "16:00" }
    const v1 = projectTravelerItinerary(
      baseInput({ entries: [entry1] }),
      { publicationId: "pub1", version: 1 },
    )
    const v2 = projectTravelerItinerary(
      baseInput({ entries: [entry2] }),
      { publicationId: "pub1", version: 2 },
    )
    const diff = diffTravelerItineraries(v1, v2)
    const change = diff.changes.find((c) => c.kind === "changed" && c.entry_id === "e1")
    expect(change).toBeDefined()
    expect(change!.changed_fields).toContain("local_start_time")
  })
})
