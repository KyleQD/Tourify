import { describe, expect, it } from "vitest"

import {
  PRIVACY_FLOOR,
  sampleSizeBucket,
} from "@/lib/world/signals/types"
import { computeAllSignals, computeSignal } from "@/lib/world/signals/compute"
import type { RawActivityEvent } from "@/lib/world/signals/types"

const NOW = Date.parse("2026-08-22T12:00:00Z")
const HOUR = 3600_000

function event(contributor: string, hoursAgo: number, weight = 1): RawActivityEvent {
  return {
    contributorHash: contributor,
    occurredAt: new Date(NOW - hoursAgo * HOUR).toISOString(),
    placeBucket: "us/mi/detroit",
    signalKind: "artist_popularity",
    weight,
  }
}

const opts = { nowMs: NOW, minUniqueContributors: 3, maxEventsPerContributor: 5 }

describe("P9 signal computation", () => {
  it("is deterministic for the same input snapshot", () => {
    const events = [event("a", 1), event("b", 2), event("c", 5)]
    const r1 = computeSignal(events, "place", "artist_popularity", "7d", opts)
    const shuffled = [...events].reverse()
    const r2 = computeSignal(shuffled, "place", "artist_popularity", "7d", opts)
    expect(r2.value).toBe(r1.value)
    expect(r2.uniqueContributors).toBe(r1.uniqueContributors)
  })

  it("T03: suppresses below-floor cohorts with a reason, never exposes them", () => {
    const result = computeSignal([event("a", 1), event("b", 2)], "p", "k", "7d", opts)
    expect(result.value).toBeNull()
    expect(result.suppressedReason).toBe("below_privacy_floor")
    expect(result.sampleSizeBucket).toBe("<3")
  })

  it("T05: caps per-contributor contribution before summing", () => {
    const five = Array.from({ length: 5 }, (_, i) => event("solo", i))
    const ten = Array.from({ length: 10 }, (_, i) => event("solo", i))
    const fiveResult = computeSignal(five, "p", "k", "7d", { ...opts, minUniqueContributors: 1 })
    const tenResult = computeSignal(ten, "p", "k", "7d", { ...opts, minUniqueContributors: 1 })
    // Capping 10 down to 5 must yield exactly the same value as 5 events.
    expect(tenResult.value).toBe(fiveResult.value)
  })

  it("applies exponential time decay (newer events weigh more)", () => {
    const recent = [event("a", 1), event("b", 1), event("c", 1)]
    const old = [event("a", 24 * 7), event("b", 24 * 7), event("c", 24 * 7)]
    const recentResult = computeSignal(recent, "p", "k", "30d", opts)
    const oldResult = computeSignal(old, "p", "k", "30d", opts)
    expect(recentResult.value).toBeGreaterThan(oldResult.value)
  })

  it("T04 structural: input type carries no IP or precise coordinate fields", () => {
    const e = event("a", 1) as Record<string, unknown>
    expect(e.ip_address).toBeUndefined()
    expect(e.lat).toBeUndefined()
    expect(e.lng).toBeUndefined()
    expect(e.exact_coordinates).toBeUndefined()
  })

  it("computes all windows for all groups in stable sort order", () => {
    const events = [
      { ...event("a", 1), placeBucket: "gb/eng/london", signalKind: "venue_activity" },
      event("b", 2),
      event("c", 3),
    ]
    const results = computeAllSignals(events, ["7d", "30d"], opts)
    expect(results.length).toBe(4)
    // Sorted by place then kind.
    expect(results[0].placeBucket <= results[results.length - 1].placeBucket).toBe(true)
  })

  it("sampleSizeBucket boundaries", () => {
    expect(sampleSizeBucket(0)).toBe("<3")
    expect(sampleSizeBucket(2)).toBe("<3")
    expect(sampleSizeBucket(3)).toBe("3-10")
    expect(sampleSizeBucket(100)).toBe("11-100")
    expect(sampleSizeBucket(101)).toBe("100+")
  })
})
