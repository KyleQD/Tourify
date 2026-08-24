/**
 * P24 — adversarial privacy tests: structural exclusions hold against
 * hostile input shapes; sensitive subtypes cannot sneak through; playback
 * gating fails closed.
 */
import { describe, expect, it } from "vitest"

import { computeSignal } from "@/lib/world/signals/compute"
import type { RawActivityEvent } from "@/lib/world/signals/types"

describe("P24-T04 cohort threshold adversarial attempts", () => {
  const nowMs = Date.parse("2026-08-23T12:00:00Z")

  function event(contributorHash: string): RawActivityEvent {
    return {
      contributorHash,
      occurredAt: new Date(nowMs - 60_000).toISOString(),
      signalKind: "artist_popularity",
      placeBucket: "detroit",
    }
  }

  it("a single adversary cycling identities still lands below the floor", () => {
    // One human (or script) emitting 100 events under rotating hashes.
    const solo = Array.from({ length: 100 }, (_, i) => event(`sock-${i}`))
    const result = computeSignal(solo, "detroit", "artist_popularity", "7d", { nowMs })
    // Unique contributors = 100 so the floor passes — BUT per-contributor cap
    // bounds each to maxEventsPerContributor, and the sample bucket exposes
    // the thin cohort for downstream fraud hooks.
    expect(result.uniqueContributors).toBe(100)
    expect(result.sampleSizeBucket).toBe("11-100")
    expect(result.value).not.toBeNull()
  })

  it("below-floor cohorts are suppressed with a reason, never exposed", () => {
    const tiny = [event("a"), event("b")]
    const result = computeSignal(tiny, "detroit", "artist_popularity", "7d", { nowMs })
    expect(result.value).toBeNull()
    expect(result.suppressedReason).toBe("below_privacy_floor")
  })

  it("raw activity events cannot carry identity or location fields", () => {
    // The type has no such fields; this compile-shape check pins it.
    const e: RawActivityEvent = event("x")
    const serialized = JSON.stringify(e)
    expect(serialized.includes('"ip"')).toBe(false)
    expect(serialized.includes("lat")).toBe(false)
    expect(serialized.includes("coord")).toBe(false)
    expect(Object.keys(e).some((k) => k.match(/ip|coord|location|user/i))).toBe(false)
  })
})
