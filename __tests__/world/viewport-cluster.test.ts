/**
 * P13 — deterministic clustering + density caps (T04/T08).
 */
import { describe, expect, it } from "vitest"

import { applyDensityCap, cellKeyFor, clusterPoints, comparePoints, type ClusterablePoint } from "@/lib/world/globe/cluster"

function point(id: string, lat: number, lng: number, weight = 1, priority: ClusterablePoint["priority"] = "derived"): ClusterablePoint {
  return { id, lat, lng, weight, priority }
}

describe("cellKeyFor", () => {
  it("assigns the same cell to nearby points", () => {
    expect(cellKeyFor(42.3, -83.1, 4)).toBe(cellKeyFor(42.5, -83.0, 4))
  })

  it("wraps longitude into [-180,180) so antimeridian points are stable", () => {
    expect(cellKeyFor(0, 180, 10)).toBe(cellKeyFor(0, -180, 10))
    expect(cellKeyFor(0, -181, 10)).toBe(cellKeyFor(0, 179, 10))
  })
})

describe("clusterPoints", () => {
  const detroitish = [
    point("a", 42.33, -83.05, 5),
    point("b", 42.35, -83.08, 3),
    point("c", 42.31, -83.02, 1),
  ]

  it("collapses co-located points into one cluster with weighted centroid", () => {
    const clusters = clusterPoints(detroitish, 4)
    expect(clusters).toHaveLength(1)
    const [c] = clusters
    expect(c.count).toBe(3)
    // Weighted centroid ≈ (42.3344, -83.0567)
    expect(c.centerLat).toBeCloseTo(42.3344, 3)
    expect(c.centerLng).toBeCloseTo(-83.0567, 3)
    expect(c.totalWeight).toBe(9)
    // Representative is deterministic: curated/weight ordering → "a".
    expect(c.representativeId).toBe("a")
  })

  it("is independent of input order (byte-identical output)", () => {
    const shuffled = [detroitish[2], detroitish[0], detroitish[1]]
    expect(clusterPoints(shuffled, 4)).toEqual(clusterPoints(detroitish, 4))
  })

  it("separates distant points into distinct clusters", () => {
    const clusters = clusterPoints(
      [...detroitish, point("lon", 51.5, -0.12, 7)],
      4,
    )
    expect(clusters).toHaveLength(2)
    expect(clusters.map((c) => c.count).sort()).toEqual([1, 3])
  })

  it("summarizes kind breakdown with deterministic ordering", () => {
    const clusters = clusterPoints(
      [
        { ...point("a", 42.3, -83.0), kind: "venue" },
        { ...point("b", 42.31, -83.01), kind: "artist" },
        { ...point("c", 42.29, -82.99), kind: "artist" },
      ],
      2,
    )
    expect(clusters[0].kinds).toEqual([
      { kind: "artist", count: 2 },
      { kind: "venue", count: 1 },
    ])
  })

  it("drops invalid coordinates instead of guessing", () => {
    expect(clusterPoints([point("x", Number.NaN, 0), point("y", 95, 0), ...detroitish], 4)).toHaveLength(1)
  })

  it("returns nothing for a non-positive cell size", () => {
    expect(clusterPoints(detroitish, 0)).toEqual([])
  })
})

describe("comparePoints / applyDensityCap", () => {
  it("curated outranks signal outranks derived, then weight desc, then id asc", () => {
    const items = [
      point("derived-heavy", 0, 0, 100, "derived"),
      point("signal-light", 0, 0, 1, "signal"),
      point("curated-light", 0, 0, 1, "curated"),
      point("b-tie", 0, 0, 50, "derived"),
      point("a-tie", 0, 0, 50, "derived"),
    ]
    const sorted = [...items].sort(comparePoints)
    expect(sorted.map((p) => p.id)).toEqual([
      "curated-light",
      "signal-light",
      "derived-heavy",
      "a-tie",
      "b-tie",
    ])
  })

  it("density cap bounds output regardless of input size", () => {
    const many: ClusterablePoint[] = Array.from({ length: 10000 }, (_, i) =>
      point(`p${String(i).padStart(5, "0")}`, Math.random() * 80, Math.random() * 160, i % 97),
    )
    const capped = applyDensityCap(many, 120, (p) => p)
    expect(capped).toHaveLength(120)
  })

  it("cap of zero or negative yields an empty page rather than everything", () => {
    expect(applyDensityCap([point("a", 0, 0)], 0, (p) => p)).toEqual([])
  })
})
