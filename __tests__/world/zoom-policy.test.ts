/**
 * P13 — zoom/layer policy tests (T02/T03): tier resolution is total and
 * fails closed; tier visibility rules match the frozen product semantics.
 */
import { describe, expect, it } from "vitest"

import {
  cellSizeDegreesForTier,
  layerVisibleAt,
  resolveZoomTier,
  ruleForTier,
  TIER_RULES,
  WORLD_LAYERS,
  ZOOM_TIER_THRESHOLDS,
  ZOOM_TIERS,
} from "@/lib/world/globe/zoom-policy"

describe("resolveZoomTier", () => {
  it("global at or above the regional threshold", () => {
    expect(resolveZoomTier(ZOOM_TIER_THRESHOLDS.regionalMax)).toBe("global")
    expect(resolveZoomTier(4.2)).toBe("global")
  })

  it("regional between thresholds", () => {
    expect(resolveZoomTier(2.2)).toBe("regional")
    expect(resolveZoomTier(ZOOM_TIER_THRESHOLDS.cityMax)).toBe("regional")
  })

  it("city below the city threshold", () => {
    expect(resolveZoomTier(1.55)).toBe("city")
    expect(resolveZoomTier(1.89)).toBe("city")
  })

  it("fails closed to global on non-finite input", () => {
    expect(resolveZoomTier(Number.NaN)).toBe("global")
    expect(resolveZoomTier(Infinity)).toBe("global")
  })
})

describe("tier visibility rules (P13-T03)", () => {
  it("global exposes only places/scenes as heat", () => {
    const rule = ruleForTier("global")
    expect(rule.granularity).toBe("heat")
    expect(rule.layers).toEqual(["places", "scenes"])
    expect(layerVisibleAt("venues", "global")).toBe(false)
    expect(layerVisibleAt("events", "global")).toBe(false)
  })

  it("regional aggregates cities/clusters/festivals", () => {
    const rule = ruleForTier("regional")
    expect(rule.granularity).toBe("aggregate")
    expect(layerVisibleAt("events", "regional")).toBe(true)
    expect(layerVisibleAt("venues", "regional")).toBe(false)
  })

  it("city returns individual entities including venues/artists", () => {
    const rule = ruleForTier("city")
    expect(rule.granularity).toBe("entity")
    for (const layer of ["places", "artists", "events", "venues"] as const) {
      expect(layerVisibleAt(layer, "city")).toBe(true)
    }
  })

  it("every tier defines a positive cap and every layer is reachable somewhere", () => {
    for (const tier of ZOOM_TIERS) {
      expect(TIER_RULES[tier].defaultCap).toBeGreaterThan(0)
    }
    const reachable = new Set(ZOOM_TIERS.flatMap((t) => [...TIER_RULES[t].layers]))
    for (const layer of WORLD_LAYERS) expect(reachable.has(layer)).toBe(true)
  })
})

describe("cluster cell sizes", () => {
  it("are coarser at coarser tiers", () => {
    expect(cellSizeDegreesForTier("global")).toBeGreaterThan(cellSizeDegreesForTier("regional"))
    expect(cellSizeDegreesForTier("regional")).toBeGreaterThan(cellSizeDegreesForTier("city"))
  })
})
