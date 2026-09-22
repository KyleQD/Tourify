import { describe, expect, it } from "vitest"

import {
  isValidLatLng,
  metersToMiles,
  milesToMeters,
  resolveDatePreset,
} from "@/lib/events/location"

describe("geo helpers", () => {
  it("converts miles and meters", () => {
    expect(milesToMeters(1)).toBeCloseTo(1609.344)
    expect(metersToMiles(1609.344)).toBeCloseTo(1)
  })

  it("validates coordinate ranges", () => {
    expect(isValidLatLng({ latitude: 36.17, longitude: -115.14 })).toBe(true)
    expect(isValidLatLng({ latitude: 91, longitude: 0 })).toBe(false)
    expect(isValidLatLng({ latitude: 0, longitude: 181 })).toBe(false)
    expect(isValidLatLng({ latitude: "x", longitude: 0 })).toBe(false)
  })
})

describe("resolveDatePreset", () => {
  // 2026-08-04 is a Tuesday.
  const now = new Date("2026-08-04T12:00:00Z")

  it("today → [midnight, next midnight) in the zone", () => {
    const { start, end } = resolveDatePreset("today", now, "UTC")
    expect(start).toBe("2026-08-04T00:00:00.000Z")
    expect(end).toBe("2026-08-05T00:00:00.000Z")
  })

  it("tomorrow starts at next midnight", () => {
    const { start } = resolveDatePreset("tomorrow", now, "UTC")
    expect(start).toBe("2026-08-05T00:00:00.000Z")
  })

  it("this_weekend spans Saturday 00:00 → Monday 00:00", () => {
    const { start, end } = resolveDatePreset("this_weekend", now, "UTC")
    expect(start).toBe("2026-08-08T00:00:00.000Z")
    expect(end).toBe("2026-08-10T00:00:00.000Z")
  })

  it("on a Saturday, this_weekend starts the same day", () => {
    const saturday = new Date("2026-08-08T15:00:00Z")
    const { start } = resolveDatePreset("this_weekend", saturday, "UTC")
    expect(start).toBe("2026-08-08T00:00:00.000Z")
  })

  it("respects timezone offsets (America/Los_Angeles is UTC-7 in August)", () => {
    const { start } = resolveDatePreset("today", now, "America/Los_Angeles")
    expect(start).toBe("2026-08-04T07:00:00.000Z")
  })

  it("handles DST spring-forward boundary (America/New_York 2026-03-08)", () => {
    const beforeDst = new Date("2026-03-08T06:00:00Z") // 01:00 EST
    const { start } = resolveDatePreset("today", beforeDst, "America/New_York")
    expect(start).toBe("2026-03-08T05:00:00.000Z") // midnight EST = 05:00Z
    const afterDst = new Date("2026-03-09T12:00:00Z") // EDT now in effect
    const { start: start2 } = resolveDatePreset("today", afterDst, "America/New_York")
    expect(start2).toBe("2026-03-09T04:00:00.000Z") // midnight EDT = 04:00Z
  })

  it("handles DST fall-back boundary (America/New_York 2026-11-01)", () => {
    const beforeFallback = new Date("2026-11-01T05:00:00Z") // 01:00 EDT
    const { start } = resolveDatePreset("today", beforeFallback, "America/New_York")
    expect(start).toBe("2026-11-01T04:00:00.000Z") // midnight EDT
  })
})
