/**
 * GET /api/world/viewport
 *
 * Viewport-aware marker feed for the Discover globe (P13). Accepts bbox
 * camera bounds, zoom tier, layers, time window, genre/scene filters and a
 * response cap; returns a bounded, stably sorted world-viewport-v1.1 payload
 * whose size never scales with total World record count.
 *
 * Preview-flag gated like every World surface; public rollout is authorized
 * by later phases only.
 */
import { NextRequest, NextResponse } from "next/server"

import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"
import {
  composeViewport,
  VIEWPORT_HARD_CAP,
  type ViewportPoint,
  type ViewportQueryParams,
  type ViewportTimeWindow,
} from "@/lib/world/globe/viewport"
import { ZOOM_TIERS, WORLD_LAYERS, type ZoomTier } from "@/lib/world/globe/zoom-policy"

export const dynamic = "force-dynamic"

const TIME_WINDOWS: readonly ViewportTimeWindow[] = ["7d", "30d", "1y", "all"]

/**
 * Static pilot source — same reviewed corpus as /api/world/globe.
 * Live projection sources plug into the same ViewportSource shape once
 * governed ingestion scheduling activates (P15); this route stays unchanged.
 */
export function staticPilotViewportSource(): ViewportPoint[] {
  const index = buildGlobeIndex()
  return index.places.map((place) => ({
    id: place.key,
    lat: place.center.lat,
    lng: place.center.lng,
    weight: place.weight,
    priority: "curated" as const,
    layer: "places" as const,
    kind: "pilot_place",
  }))
}

function num(value: string | null): number | null {
  if (value === null || value.trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseParams(url: URL): ViewportQueryParams | { error: string } {
  const q = url.searchParams
  const north = num(q.get("north"))
  const south = num(q.get("south"))
  const east = num(q.get("east"))
  const west = num(q.get("west"))
  if (north === null || south === null || east === null || west === null) {
    return { error: "bounds_required" }
  }

  const zoom = num(q.get("zoom")) ?? undefined

  let tier: ZoomTier | undefined
  const tierParam = q.get("tier")
  if (tierParam) {
    if (!(ZOOM_TIERS as readonly string[]).includes(tierParam)) return { error: "invalid_tier" }
    tier = tierParam as ZoomTier
  }
  if (tier !== undefined && zoom !== undefined) return { error: "tier_xor_zoom" }

  const layersParam = q.get("layers")
  if (layersParam) {
    const parts = layersParam.split(",").map((s) => s.trim()).filter(Boolean)
    if (parts.some((p) => !(WORLD_LAYERS as readonly string[]).includes(p))) {
      return { error: "invalid_layers" }
    }
  }

  const timeWindow = q.get("timeWindow")
  if (timeWindow && !TIME_WINDOWS.includes(timeWindow as ViewportTimeWindow)) {
    return { error: "invalid_time_window" }
  }

  const cap = num(q.get("cap"))
  if (cap !== null && (cap < 1 || cap > VIEWPORT_HARD_CAP)) return { error: "cap_out_of_range" }

  const densityParam = q.get("densityHint")
  if (densityParam && densityParam !== "desktop" && densityParam !== "mobile") {
    return { error: "invalid_density_hint" }
  }

  return {
    bounds: { north: north!, south: south!, east: east!, west: west! },
    ...(zoom !== undefined ? { zoom } : {}),
    ...(tier !== undefined ? { tier } : {}),
    ...(layersParam ? { layers: layersParam.split(",").map((s) => s.trim()) } : {}),
    ...(timeWindow ? { timeWindow: timeWindow as ViewportTimeWindow } : {}),
    genre: q.get("genre"),
    scene: q.get("scene"),
    ...(cap !== null ? { cap } : {}),
    ...(densityParam ? { densityHint: densityParam as "desktop" | "mobile" } : {}),
  }
}

function etagFor(payload: unknown): string {
  const json = JSON.stringify(payload)
  let hash = 2166136261
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `"viewport-${(hash >>> 0).toString(16)}"`
}

export async function GET(request: NextRequest) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const parsed = parseParams(new URL(request.url))
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const result = composeViewport(parsed, staticPilotViewportSource)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const etag = etagFor(result.payload)
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  return NextResponse.json(result.payload, {
    headers: {
      ETag: etag,
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    },
  })
}
