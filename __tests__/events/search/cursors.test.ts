import { describe, expect, it } from "vitest"

import { decodeCursor, encodeCursor } from "@/lib/events/cursors"

describe("discovery cursors", () => {
  it("round-trips a nearby cursor", () => {
    const cursor = { kind: "nearby" as const, distanceMeters: 1234.5, startAt: "2026-09-01T02:00:00Z", eventId: "evt-1" }
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor)
  })

  it("round-trips an upcoming cursor with null start", () => {
    const cursor = { kind: "upcoming" as const, startAt: null, eventId: "evt-2" }
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor)
  })

  it("returns null for garbage input", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeNull()
    expect(decodeCursor(null)).toBeNull()
    expect(decodeCursor(undefined)).toBeNull()
  })

  it("returns null for wrong-shaped payloads", () => {
    const bad = Buffer.from(JSON.stringify({ kind: "sideways", eventId: "x" })).toString("base64url")
    expect(decodeCursor(bad)).toBeNull()
  })
})
