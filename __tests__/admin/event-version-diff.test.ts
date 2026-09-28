import { describe, expect, it } from "vitest"

import {
  buildEventVersionConflictDiff,
  EventVersionConflictError,
  summarizeEventVersionConflictDiff,
} from "@/lib/admin/event-version-diff"

describe("EVENT-104 event version conflict handling", () => {
  it("builds a safe field diff and flags tour-plan touch drift", () => {
    const diff = buildEventVersionConflictDiff({
      expectedVersion: 2,
      server: {
        eventVersion: 4,
        title: "Server Title",
        status: "confirmed",
        start_at: "2026-08-01T20:00:00.000Z",
        end_at: "2026-08-01T22:00:00.000Z",
        venue_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        capacity: 2000,
        timezone: "America/Los_Angeles",
        age_restrictions: "18+",
      },
      client: {
        eventVersion: 2,
        title: "Client Title",
        status: "confirmed",
        start_at: "2026-08-01T20:00:00.000Z",
        end_at: "2026-08-01T22:00:00.000Z",
        venue_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        capacity: 1800,
        timezone: "America/Los_Angeles",
        age_restrictions: "18+",
      },
      serverTourPlanTouchedAt: "2026-07-20T12:00:00.000Z",
      clientTourPlanTouchedAt: "2026-07-19T12:00:00.000Z",
    })

    expect(diff.currentVersion).toBe(4)
    expect(diff.fields.map((field) => field.path).sort()).toEqual(["capacity", "title"])
    expect(diff.tourPlanTouch.clientAware).toBe(false)
    expect(summarizeEventVersionConflictDiff(diff)).toMatch(/Tour plan updated/)
  })

  it("exposes 409 version_conflict error shape", () => {
    const diff = buildEventVersionConflictDiff({
      expectedVersion: 1,
      server: {
        eventVersion: 2,
        title: "A",
        status: null,
        start_at: null,
        end_at: null,
        venue_id: null,
        capacity: null,
        timezone: null,
        age_restrictions: null,
      },
      client: { eventVersion: 1, title: "B" },
    })
    const error = new EventVersionConflictError({
      currentVersion: 2,
      expectedVersion: 1,
      diff,
      serverEvent: { id: "e1", event_version: 2 },
    })
    expect(error.status).toBe(409)
    expect(error.code).toBe("version_conflict")
    expect(error.serverEvent).toMatchObject({ id: "e1" })
  })
})
