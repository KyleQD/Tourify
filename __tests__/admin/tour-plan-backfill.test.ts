import { describe, expect, it } from "vitest"

import { buildTourPlanBackfill } from "@/lib/admin/tour-plan-backfill"

const TOUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const EVENT_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const EVENT_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

describe("PLAN-201 deterministic tour plan backfill", () => {
  it("builds stops from tour_events and merges compatible route JSON", () => {
    const result = buildTourPlanBackfill({
      orgId: ORG,
      tourId: TOUR,
      tourEvents: [
        {
          id: "link-1",
          event_id: EVENT_A,
          ordinal: 0,
          event_title: "Opening Night",
          event_start_at: "2026-08-01T20:00:00.000Z",
          market: "NYC",
        },
        {
          id: "link-2",
          event_id: EVENT_B,
          ordinal: 1,
          event_title: "Second City",
          event_start_at: "2026-08-03T19:30:00.000Z",
        },
      ],
      routeJson: [
        {
          order: 1,
          event_id: EVENT_A,
          venue: "Madison Garden",
          name: "Opening Night",
        },
        {
          order: 2,
          event_id: EVENT_B,
          market: "CHI",
        },
      ],
    })

    expect(result.canPersist).toBe(true)
    expect(result.stops).toHaveLength(2)
    expect(result.stops[0].venue_label).toBe("Madison Garden")
    expect(result.stops[0].source).toBe("merged")
    expect(result.stops[1].market).toBe("CHI")
    expect(result.quarantine).toHaveLength(0)
  })

  it("quarantines missing org instead of inventing org_id", () => {
    const result = buildTourPlanBackfill({
      orgId: null,
      tourId: TOUR,
      tourEvents: [{ id: "link-1", event_id: EVENT_A, ordinal: 0 }],
      routeJson: [],
    })
    expect(result.canPersist).toBe(false)
    expect(result.stops).toHaveLength(0)
    expect(result.quarantine[0]?.conflict_type).toBe("unresolvable_org")
  })

  it("quarantines route event not in tour_events and ordinal conflicts", () => {
    const result = buildTourPlanBackfill({
      orgId: ORG,
      tourId: TOUR,
      tourEvents: [
        {
          id: "link-1",
          event_id: EVENT_A,
          ordinal: 0,
          event_title: "Show A",
        },
      ],
      routeJson: [
        { order: 1, event_id: EVENT_B, name: "Ghost show" },
        { order: 1, name: "Travel day", date: "2026-08-02", stop_type: "travel" },
      ],
    })

    expect(result.quarantine.some((row) => row.conflict_type === "missing_event")).toBe(true)
    expect(result.quarantine.some((row) => row.conflict_type === "ordinal_mismatch")).toBe(true)
    // Existing tour_events stop still persisted
    expect(result.stops).toHaveLength(1)
    expect(result.stops[0].event_id).toBe(EVENT_A)
  })

  it("creates route-only non-show stops when ordinal is free", () => {
    const result = buildTourPlanBackfill({
      orgId: ORG,
      tourId: TOUR,
      tourEvents: [
        {
          id: "link-1",
          event_id: EVENT_A,
          ordinal: 0,
          event_title: "Show A",
        },
      ],
      routeJson: [
        { order: 1, event_id: EVENT_A, name: "Show A" },
        { order: 2, name: "Travel", date: "2026-08-02", stop_type: "travel" },
      ],
    })

    expect(result.stops).toHaveLength(2)
    expect(result.stops[1].stop_type).toBe("travel")
    expect(result.stops[1].event_id).toBeNull()
    expect(result.stops[1].source).toBe("route_json")
    expect(result.quarantine).toHaveLength(0)
  })

  it("is deterministic for the same inputs", () => {
    const input = {
      orgId: ORG,
      tourId: TOUR,
      tourEvents: [
        { id: "b", event_id: EVENT_B, ordinal: 1, event_title: "B" },
        { id: "a", event_id: EVENT_A, ordinal: 0, event_title: "A" },
      ],
      routeJson: [{ order: 1, event_id: EVENT_A, venue: "Hall" }],
    }
    const first = buildTourPlanBackfill(input)
    const second = buildTourPlanBackfill(input)
    expect(first).toEqual(second)
    expect(first.stops.map((stop) => stop.event_id)).toEqual([EVENT_A, EVENT_B])
  })
})
