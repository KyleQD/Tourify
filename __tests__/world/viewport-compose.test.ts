/**
 * P13 — viewport composition tests (T01): bounded payloads independent of
 * record count, tier semantics, frozen-contract compatibility, fail-closed
 * validation.
 */
import { describe, expect, it } from "vitest"

import type { WorldViewportPayload } from "@/lib/world/contracts/v2-payloads"

import { composeViewport, VIEWPORT_HARD_CAP, type ViewportPoint } from "@/lib/world/globe/viewport"

const BOUNDS = { north: 45, south: 41, east: -82, west: -86 }

function source(count: number): ViewportPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${String(i).padStart(6, "0")}`,
    lat: 41 + ((i * 7919) % 400) / 100,
    lng: -86 + ((i * 104729) % 400) / 100,
    weight: (i % 13) + 1,
    // Pilot places are visible at every tier, so tier filtering never
    // masks the density/bounding assertions below.
    layer: "places" as const,
    kind: "pilot_place",
  }))
}

describe("composeViewport — validation", () => {
  it("fails closed on inverted or out-of-range bounds", () => {
    const inverted = composeViewport({ bounds: { north: 40, south: 44, east: 0, west: -5 } }, () => [])
    expect(inverted).toEqual({ ok: false, error: "invalid_bounds" })
    const outOfRange = composeViewport({ bounds: { north: 91, south: 0, east: 0, west: -5 } }, () => [])
    expect(outOfRange).toEqual({ ok: false, error: "invalid_bounds" })
  })
})

describe("composeViewport — tiers", () => {
  it("city zoom returns entity-level places capped at the request", () => {
    const result = composeViewport({ bounds: BOUNDS, zoom: 1.6, cap: 25 }, () => source(500))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.tier).toBe("city")
    expect(result.payload.granularity).toBe("entity")
    expect(result.payload.places).toHaveLength(25)
    expect(result.payload.clusters).toHaveLength(0)
    expect(result.payload.truncated).toBe(true)
  })

  it("global zoom returns heat clusters only, bounded independently of input size", () => {
    const small = composeViewport({ bounds: BOUNDS, zoom: 3.4 }, () => source(200))
    const large = composeViewport({ bounds: BOUNDS, zoom: 3.4 }, () => source(20000))
    if (!small.ok || !large.ok) throw new Error("expected ok")
    expect(small.payload.tier).toBe("global")
    expect(small.payload.granularity).toBe("heat")
    // Payload stays bounded no matter how dense the world gets.
    expect(large.payload.clusters.length).toBeLessThanOrEqual(VIEWPORT_HARD_CAP)
    expect(large.payload.clusters.length).toBeLessThanOrEqual(small.payload.clusters.length + 60)
    expect(large.payload.totalInBounds).toBeGreaterThan(small.payload.totalInBounds)
  })

  it("explicit tier overrides zoom derivation", () => {
    const result = composeViewport({ bounds: BOUNDS, zoom: 3.4, tier: "city" }, () => source(10))
    expect(result.ok && result.payload.tier === "city").toBe(true)
  })
})

describe("composeViewport — layers and facets", () => {
  const mixed: ViewportPoint[] = [
    { id: "artist-1", lat: 42.3, lng: -83.0, weight: 3, layer: "artists" },
    { id: "venue-1", lat: 42.31, lng: -83.01, weight: 2, layer: "venues" },
    {
      id: "event-1", lat: 42.32, lng: -83.02, weight: 4, layer: "events",
      genres: ["techno"], scenes: ["midwest"], occurredAt: "2026-08-20T00:00:00Z",
    },
  ]

  it("hides layers the tier does not expose", () => {
    const result = composeViewport({ bounds: BOUNDS, zoom: 3.4, layers: ["venues"] }, () => mixed)
    expect(result.ok && result.payload.totalInBounds === 0).toBe(true)
  })

  it("filters by genre and time window; points without the facet are dropped", () => {
    const recent = Date.parse("2026-08-21T00:00:00Z")
    const result = composeViewport(
      { bounds: BOUNDS, tier: "regional", genre: "Techno", timeWindow: "7d" },
      () => mixed,
      recent,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.totalInBounds).toBe(1)
    const cluster = result.payload.clusters[0]
    expect(cluster.representativeId).toBe("event-1")
  })

  it("drops stale events outside the requested window", () => {
    const now = Date.parse("2027-08-21T00:00:00Z")
    const result = composeViewport({ bounds: BOUNDS, tier: "regional", timeWindow: "7d" }, () => mixed, now)
    expect(result.ok && result.payload.totalInBounds === 0).toBe(true)
  })
})

describe("composeViewport — density hints and hard caps", () => {
  it("mobile hint tightens density deterministically", () => {
    const desktop = composeViewport({ bounds: BOUNDS, zoom: 1.6 }, () => source(1000), 0)
    const mobile = composeViewport(
      { bounds: BOUNDS, zoom: 1.6, densityHint: "mobile" },
      () => source(1000),
      0,
    )
    if (!desktop.ok || !mobile.ok) throw new Error("expected ok")
    expect(mobile.payload.densityHint).toBe("mobile")
    expect(mobile.payload.places.length).toBeLessThan(desktop.payload.places.length)
  })

  it("requested caps above the hard ceiling are clamped server-side", () => {
    // Route clamps to VIEWPORT_HARD_CAP before compose; compose itself never
    // emits more than the effective cap even with a huge explicit number.
    const result = composeViewport({ bounds: BOUNDS, zoom: 1.6, cap: 999999 }, () => source(5000))
    if (!result.ok) throw new Error("expected ok")
    expect(result.payload.places.length).toBeLessThanOrEqual(VIEWPORT_HARD_CAP)
  })
})

describe("P23-T09 synthetic large-dataset stress", () => {
  it("50k points stay bounded and fast to compose", () => {
    const t0 = performance.now()
    const result = composeViewport({ bounds: { north: 85, south: -85, east: 180, west: -180 }, zoom: 3.4 }, () =>
      Array.from({ length: 50_000 }, (_, i) => ({
        id: `q${i}`,
        lat: (i % 170) - 85,
        lng: ((i * 7) % 360) - 180,
        weight: (i % 9) + 1,
        layer: "places" as const,
      })),
    )
    const elapsed = performance.now() - t0
    if (!result.ok) throw new Error("expected ok")
    expect(result.payload.clusters.length).toBeLessThanOrEqual(VIEWPORT_HARD_CAP)
    // Composition is pure array work; 50k rows must finish in well under a second.
    expect(elapsed).toBeLessThan(1000)
  })
})

describe("frozen contract compatibility (P2-T08)", () => {
  it("v1.1 payload structurally satisfies the frozen v1.0 base fields", () => {
    const result = composeViewport({ bounds: BOUNDS, zoom: 2.2 }, () => source(50))
    if (!result.ok) throw new Error("expected ok")
    const payload = result.payload
    // Frozen base: schemaVersion string, numeric zoom, bounds box, summaries.
    const frozenView: WorldViewportPayload = {
      schemaVersion: "world-viewport-v1.0",
      zoom: payload.zoom,
      bounds: payload.bounds,
      places: payload.places.map((p) => ({
        placeKey: p.placeKey,
        center: p.center,
        weight: p.weight,
        ...(p.children ? { children: p.children } : {}),
      })),
    }
    expect(frozenView.places.length).toBe(payload.places.length)
    for (const place of payload.places) {
      expect(Number.isFinite(place.center.lat)).toBe(true)
      expect(Number.isFinite(place.weight)).toBe(true)
    }
  })

  it("is deterministic for identical inputs", () => {
    const a = composeViewport({ bounds: BOUNDS, zoom: 2.2 }, () => source(300), 12345)
    const b = composeViewport({ bounds: BOUNDS, zoom: 2.2 }, () => source(300), 12345)
    expect(a).toEqual(b)
  })
})
