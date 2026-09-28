import { describe, expect, it } from "vitest"

import { createGeoTelemetry, summarizeForTelemetry } from "@/lib/geo/telemetry"
import type { ResolvePlaceResult } from "@/lib/geo/types"

function result(overrides: Partial<ResolvePlaceResult>): ResolvePlaceResult {
  return {
    placeId: null,
    canonicalPath: null,
    canonicalLabel: null,
    confidence: 0,
    matchMethod: "unresolved",
    needsReview: true,
    candidates: [],
    normalizedInput: {},
    ...overrides,
  }
}

describe("geo telemetry", () => {
  it("bands results without exposing coordinates", () => {
    const accepted = summarizeForTelemetry(
      result({ matchMethod: "external_id", placeId: "p1", needsReview: false }),
    )
    expect(accepted).toEqual({
      matchMethod: "external_id",
      confidenceBand: "accept",
      resolved: true,
      ambiguityCount: 0,
    })
    const review = summarizeForTelemetry(
      result({ matchMethod: "text_exact", needsReview: true, candidates: [{}, {}] as never }),
    )
    expect(review.confidenceBand).toBe("review")
    const unresolved = summarizeForTelemetry(result({}))
    expect(unresolved.confidenceBand).toBe("unresolved")
  })

  it("is a no-op until a sink is provided (flag-gated at call sites)", () => {
    let calls = 0
    const off = createGeoTelemetry(null)
    off.record(result({}))
    expect(calls).toBe(0)
    const on = createGeoTelemetry(() => {
      calls += 1
    })
    on.record(result({}))
    expect(calls).toBe(1)
  })

  it("never includes coordinates or raw input in the event shape", () => {
    const event = summarizeForTelemetry(
      result({
        normalizedInput: { coordinates: { latitude: 30, longitude: -97 } } as never,
      }),
    )
    expect(JSON.stringify(event)).not.toContain("latitude")
  })
})
