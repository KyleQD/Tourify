/**
 * P13 — Viewport composition (pure, deterministic).
 *
 * Bounds filter → zoom tier → layer visibility → server-side clustering →
 * density cap ⇒ bounded `world-viewport-v1.1` payload. Payload size is
 * bounded independent of total World record count: every path terminates in
 * `applyDensityCap`.
 *
 * Additive extension of the frozen `world-viewport-v1.0` contract
 * (`lib/world/contracts/v2-payloads.ts`): base fields (`zoom`, `bounds`,
 * `places`) keep their shapes and are contract-tested against the frozen
 * type.
 */
import type { EntityKind } from "@/lib/world/contracts/v1"
import type { ViewportPlaceSummary } from "@/lib/world/contracts/v2-payloads"

import { applyDensityCap, cellKeyFor, clusterPoints, type ClusterablePoint } from "./cluster"
import {
  cellSizeDegreesForTier,
  isWorldLayer,
  resolveZoomTier,
  ruleForTier,
  type WorldLayer,
  type ZoomTier,
} from "./zoom-policy"

export const WORLD_VIEWPORT_PAYLOAD_V1_1 = "world-viewport-v1.1"

/** Hard ceiling regardless of request — payloads stay bounded by construction. */
export const VIEWPORT_HARD_CAP = 400

export interface ViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

export type ViewportTimeWindow = "7d" | "30d" | "1y" | "all"

export interface ViewportQueryParams {
  bounds: ViewportBounds
  /** Camera distance in globe radii; tier derived when `tier` omitted. */
  zoom?: number
  tier?: ZoomTier
  layers?: readonly string[]
  timeWindow?: ViewportTimeWindow
  genre?: string | null
  scene?: string | null
  cap?: number
  densityHint?: "desktop" | "mobile"
}

/** A viewport data point: clustering input + layer/facet metadata. */
export interface ViewportPoint extends ClusterablePoint {
  layer: WorldLayer
  genres?: readonly string[]
  scenes?: readonly string[]
  occurredAt?: string | null
}

/** Injectable data source — static pilots today, live projections later. */
export type ViewportSource = () => readonly ViewportPoint[]

export interface ViewportClusterSummary {
  key: string
  center: { lat: number; lng: number }
  count: number
  totalWeight: number
  maxWeight: number
  representativeId: string
  kinds: Array<{ kind: string; count: number }>
}

/**
 * world-viewport-v1.1 — additive superset of frozen `WorldViewportPayload`
 * (schemaVersion/zoom/bounds/places keep the frozen shapes).
 */
export interface WorldViewportPayloadV1_1 {
  schemaVersion: typeof WORLD_VIEWPORT_PAYLOAD_V1_1
  zoom: number
  bounds: ViewportBounds
  /** Frozen-base field: entity-level summaries (city tier). */
  places: ViewportPlaceSummary[]
  /** v1.1 additions ↓ */
  tier: ZoomTier
  granularity: "aggregate" | "entity" | "heat"
  layers: WorldLayer[]
  clusters: ViewportClusterSummary[]
  totalInBounds: number
  truncated: boolean
  densityHint: "desktop" | "mobile"
}

export type ViewportComposeResult =
  | { ok: true; payload: WorldViewportPayloadV1_1 }
  | { ok: false; error: string }

const LAYER_KIND: Record<WorldLayer, EntityKind> = {
  places: "place",
  artists: "artist",
  events: "event",
  venues: "venue",
  scenes: "cultural_entity",
}

function boundsAreValid(b: ViewportBounds): boolean {
  const finite =
    [b.north, b.south, b.east, b.west].every((n) => Number.isFinite(n))
  if (!finite) return false
  if (b.north < -90 || b.north > 90 || b.south < -90 || b.south > 90) return false
  if (b.east < -180 || b.east > 180 || b.west < -180 || b.west > 180) return false
  return b.north >= b.south && b.east >= b.west
}

const TIME_WINDOW_MS: Record<ViewportTimeWindow, number | null> = {
  "7d": 7 * 24 * 3600_000,
  "30d": 30 * 24 * 3600_000,
  "1y": 365 * 24 * 3600_000,
  all: null,
}

/**
 * Compose a bounded viewport payload. Fails closed on invalid input rather
 * than clamping silently (callers surface 400s).
 */
export function composeViewport(
  params: ViewportQueryParams,
  source: ViewportSource,
  nowMs: number = Date.now(),
): ViewportComposeResult {
  if (!boundsAreValid(params.bounds)) {
    return { ok: false, error: "invalid_bounds" }
  }

  const tier = params.tier ?? (params.zoom !== undefined ? resolveZoomTier(params.zoom) : "global")
  const rule = ruleForTier(tier)

  // Requested layers ∩ tier-visible layers (fail closed to tier policy).
  const requested = new Set(
    (params.layers ?? []).filter((l): l is WorldLayer => isWorldLayer(l)),
  )
  const layers = rule.layers.filter((l) => requested.size === 0 || requested.has(l))

  // Facet + time filters (points without facets pass through).
  const windowMs = TIME_WINDOW_MS[params.timeWindow ?? "all"]
  const genre = params.genre?.trim().toLowerCase() || null
  const scene = params.scene?.trim().toLowerCase() || null
  const cutoff = windowMs === null ? 0 : nowMs - windowMs

  const all = source()
  const inBounds: ViewportPoint[] = []
  for (const point of all) {
    if (!layers.includes(point.layer)) continue
    if (
      point.lat < params.bounds.south ||
      point.lat > params.bounds.north ||
      point.lng < params.bounds.west ||
      point.lng > params.bounds.east
    ) {
      continue
    }
    if (genre && !(point.genres ?? []).some((g) => g.toLowerCase() === genre)) continue
    if (scene && !(point.scenes ?? []).some((s) => s.toLowerCase() === scene)) continue
    if (windowMs !== null) {
      if (!point.occurredAt) continue
      if (new Date(point.occurredAt).getTime() < cutoff) continue
    }
    inBounds.push(point)
  }

  // Density cap: tier default unless overridden; mobile hint tightens further.
  const hintFactor = params.densityHint === "mobile" ? 0.6 : 1
  const requestedCap = params.cap ?? rule.defaultCap
  const effectiveCap = Math.max(
    1,
    Math.min(Math.floor(requestedCap * hintFactor), VIEWPORT_HARD_CAP),
  )

  // City tier returns entities; coarser tiers collapse into clusters.
  let places: ViewportPlaceSummary[] = []
  let clusters: ViewportClusterSummary[] = []

  if (rule.granularity === "entity") {
    const capped = applyDensityCap(inBounds, effectiveCap, (p) => p)
    places = capped.map((p) => ({
      placeKey: p.id,
      center: { lat: p.lat, lng: p.lng },
      weight: Math.round(p.weight * 10000) / 10000,
      children: p.kind ? [{ kind: LAYER_KIND[p.layer], count: 1 }] : undefined,
    }))
  } else {
    const cellSizeDeg = cellSizeDegreesForTier(tier)
    const built = clusterPoints(inBounds, cellSizeDeg)
    const cappedClusters = applyDensityCap(built, effectiveCap, (c) => ({
      id: c.representativeId,
      lat: c.centerLat,
      lng: c.centerLng,
      weight: c.totalWeight,
    }))
    clusters = cappedClusters.map((c) => ({
      key: c.key,
      center: { lat: c.centerLat, lng: c.centerLng },
      count: c.count,
      totalWeight: c.totalWeight,
      maxWeight: c.maxWeight,
      representativeId: c.representativeId,
      kinds: c.kinds,
    }))
    // Frozen base field stays populated even in aggregate mode: one summary
    // per delivered cluster keeps older renderers working unchanged.
    places = clusters.map((c) => ({
      placeKey: c.representativeId,
      center: c.center,
      weight: c.totalWeight,
    }))
  }

  return {
    ok: true,
    payload: {
      schemaVersion: WORLD_VIEWPORT_PAYLOAD_V1_1,
      zoom: round2(params.zoom ?? defaultZoomForTier(tier)),
      bounds: params.bounds,
      places,
      tier,
      granularity: rule.granularity,
      layers,
      clusters,
      totalInBounds: inBounds.length,
      truncated: inBounds.length > places.length + clusters.length,
      densityHint: params.densityHint === "mobile" ? "mobile" : "desktop",
    },
  }
}

/** Canonical cache-key material for a viewport request (P13-T05). */
export function viewportCacheKeyPrefix(tier: ZoomTier, cellSizeDeg: number): string {
  return `${tier}@${cellSizeDeg.toFixed(2)}`
}

export { cellKeyFor }

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function defaultZoomForTier(tier: ZoomTier): number {
  switch (tier) {
    case "global":
      return 3.4
    case "regional":
      return 2.2
    case "city":
      return 1.6
  }
}
