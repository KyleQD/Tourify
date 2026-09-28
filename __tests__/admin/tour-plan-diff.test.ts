import { describe, expect, it } from "vitest"

import {
  buildTourPlanConflictDiff,
  summarizeTourPlanConflictDiff,
} from "@/lib/admin/tour-plan-diff"

describe("PLAN-102 optimistic plan version conflict diff", () => {
  it("builds a safe field + stop diff without silent equality", () => {
    const diff = buildTourPlanConflictDiff({
      expectedVersion: 1,
      server: {
        planVersion: 3,
        name: "Server Name",
        description: "server desc",
        status: "planning",
        start_date: "2026-08-01",
        end_date: "2026-08-10",
        main_artist: "Ada",
        route_notes: "note a",
        stops: [
          {
            event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            ordinal: 0,
            name: "LA",
            venue: "Forum",
            date: "2026-08-01",
            time: "20:00",
            market: "LA",
            advance_status: "ready",
          },
          {
            event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            ordinal: 1,
            name: "SD",
            venue: "Arena",
            date: "2026-08-03",
            time: "19:00",
            market: "SD",
            advance_status: "not_started",
          },
        ],
      },
      client: {
        name: "Local Name",
        description: "server desc",
        status: "planning",
        start_date: "2026-08-01",
        end_date: "2026-08-12",
        main_artist: "Ada",
        route_notes: "note b",
        stops: [
          {
            event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            ordinal: 0,
            name: "LA Show",
            venue: "Forum",
            date: "2026-08-01",
            time: "20:00",
            market: "LA",
            advance_status: "ready",
          },
          {
            event_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            ordinal: 1,
            name: "SF",
            venue: "Chase",
            date: "2026-08-05",
            time: "21:00",
            market: "SF",
            advance_status: "not_started",
          },
        ],
      },
    })

    expect(diff.currentVersion).toBe(3)
    expect(diff.expectedVersion).toBe(1)
    expect(diff.fields.map((field) => field.path).sort()).toEqual(
      ["end_date", "name", "route_notes"].sort(),
    )
    expect(diff.stops.onlyOnServer.some((stop) => stop.name === "SD")).toBe(true)
    expect(diff.stops.onlyOnClient.some((stop) => stop.name === "SF")).toBe(true)
    expect(diff.stops.changed.some((stop) => stop.fields.includes("name"))).toBe(true)
    expect(diff.stops.orderChanged).toBe(true)

    const summary = summarizeTourPlanConflictDiff(diff)
    expect(summary).toContain("v3")
    expect(summary).toContain("Local edits were not saved")
  })

  it("reports clean equality when client matches server", () => {
    const stop = {
      event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ordinal: 0,
      name: "LA",
      venue: "Forum",
      date: "2026-08-01",
      time: null,
      market: null,
      advance_status: "not_started",
    }
    const diff = buildTourPlanConflictDiff({
      expectedVersion: 2,
      server: {
        planVersion: 4,
        name: "Same",
        stops: [stop],
      },
      client: {
        name: "Same",
        stops: [stop],
      },
    })
    expect(diff.fields).toEqual([])
    expect(diff.stops.changed).toEqual([])
    expect(diff.stops.onlyOnServer).toEqual([])
    expect(diff.stops.onlyOnClient).toEqual([])
    expect(diff.stops.orderChanged).toBe(false)
  })
})
