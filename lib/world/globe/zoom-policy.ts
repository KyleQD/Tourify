/**
 * P13 — Globe zoom/layer policy (pure, deterministic).
 *
 * Zoom meaning is frozen here so every surface (globe scene, viewport API,
 * docs) resolves tiers identically. Tiers are derived from camera altitude
 * in globe radii (OrbitControls distance; 1.0 = surface).
 *
 *   global    altitude > 2.6  — countries / major centers / scene heat only.
 *   regional  1.9–2.6         — cities, clusters, festivals.
 *   city      < 1.9           — venues, events, local artists, landmarks.
 *
 * Unknown inputs fail closed to the most conservative tier (`global`).
 */

export const ZOOM_TIERS = ["global", "regional", "city"] as const
export type ZoomTier = (typeof ZOOM_TIERS)[number]

/** Camera altitude thresholds in globe-radii units (matches OrbitControls distance). */
export const ZOOM_TIER_THRESHOLDS = {
  /** distance >= this → global */
  regionalMax: 2.6,
  /** distance >= this (> regionalMax is global; below is city) → regional */
  cityMax: 1.9,
} as const

/** World layers a viewport request can ask for. */
export const WORLD_LAYERS = [
  "places",
  "artists",
  "events",
  "venues",
  "scenes",
] as const
export type WorldLayer = (typeof WORLD_LAYERS)[number]

export function isWorldLayer(value: string): value is WorldLayer {
  return (WORLD_LAYERS as readonly string[]).includes(value)
}

/**
 * Per-tier visibility rules (P13-T03):
 * which layers render, whether items may appear as entities or aggregates
 * only, and how many markers each layer may draw.
 */
export interface TierRule {
  tier: ZoomTier
  /** Layers visible at this tier. */
  layers: readonly WorldLayer[]
  /**
   * `aggregate` = server must collapse items into cluster summaries;
   * `entity`   = individual markers allowed;
   * `heat`     = intensity-only rendering (no per-item identity).
   */
  granularity: "aggregate" | "entity" | "heat"
  /** Default marker cap per response at this tier (before client density hints). */
  defaultCap: number
}

export const TIER_RULES: Readonly<Record<ZoomTier, TierRule>> = Object.freeze({
  global: {
    tier: "global",
    layers: ["places", "scenes"],
    granularity: "heat",
    defaultCap: 120,
  },
  regional: {
    tier: "regional",
    layers: ["places", "artists", "events", "scenes"],
    granularity: "aggregate",
    defaultCap: 220,
  },
  city: {
    tier: "city",
    layers: ["places", "artists", "events", "venues"],
    granularity: "entity",
    defaultCap: 320,
  },
})

/** Resolve a tier from camera altitude. Out-of-range/non-finite fails closed to `global`. */
export function resolveZoomTier(cameraDistance: number): ZoomTier {
  if (!Number.isFinite(cameraDistance)) return "global"
  if (cameraDistance >= ZOOM_TIER_THRESHOLDS.regionalMax) return "global"
  if (cameraDistance >= ZOOM_TIER_THRESHOLDS.cityMax) return "regional"
  return "city"
}

/** Visibility rule lookup for a tier. */
export function ruleForTier(tier: ZoomTier): TierRule {
  return TIER_RULES[tier]
}

/**
 * Whether an individual entity of `layer` may render as itself at `tier`
 * (false ⇒ it must be aggregated or hidden).
 */
export function layerVisibleAt(layer: WorldLayer, tier: ZoomTier): boolean {
  return ruleForTier(tier).layers.includes(layer)
}

/**
 * Cluster cell size in degrees for a tier (P13-T04 input). Coarser cells at
 * coarser tiers keep cluster counts stable while panning.
 */
export function cellSizeDegreesForTier(tier: ZoomTier): number {
  switch (tier) {
    case "global":
      return 10
    case "regional":
      return 4
    case "city":
      return 0.5
  }
}
