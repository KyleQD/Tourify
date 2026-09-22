/**
 * World globe index builder.
 *
 * Server-only (fs access). Produces the renderer-neutral marker set for the
 * Discover globe from the same reviewed corpus that powers the parity-proven
 * world-place-v0.1 fixtures — one source of truth, no parallel data system.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

export { GLOBE_SCHEMA_VERSION } from "./types"
export type {
  GlobeMarkerCounts,
  GlobePlace,
  GlobeIndex,
  PilotKey,
} from "./types"

import {
  GLOBE_SCHEMA_VERSION,
  PILOT_KEYS,
  type GlobeMarkerCounts,
  type GlobePlace,
  type GlobeIndex,
  type PilotKey,
} from "./types"

interface SeedEntity {
  entity_type: string
}

interface SeedBundle {
  pilot_key: string
  place_path: string
  overview?: { musical_identity?: string | null }
  entities: SeedEntity[]
}

interface PlaceSeed {
  slug: string
  name: string
  country_code?: string | null
  center?: { lat: number; lng: number } | null
}

function readJson<T>(relative: string): T {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "world", relative), "utf8"),
  ) as T
}

function countEntities(entities: SeedEntity[]): GlobeMarkerCounts {
  const by = (type: string): number => entities.filter((e) => e.entity_type === type).length
  return {
    artists: by("artist_reference"),
    recordings: by("recording_reference"),
    milestones: by("historical_milestone"),
    genresAndScenes: by("genre") + by("scene") + by("movement"),
    instruments: by("instrument"),
    landmarks: by("studio_landmark"),
  }
}

function totalWeight(counts: GlobeMarkerCounts): number {
  const { artists, recordings, milestones, genresAndScenes, instruments, landmarks } = counts
  return (
    artists * 3 +
    recordings * 2 +
    milestones * 2 +
    genresAndScenes * 2 +
    instruments +
    landmarks
  )
}

let cached: GlobeIndex | null = null

/**
 * Deterministic, memoized per server process. Order is stable (sorted by
 * canonical path) so the API response and tests are reproducible.
 */
export function buildGlobeIndex(): GlobeIndex {
  if (cached) return cached

  const reference = readJson<{ places: PlaceSeed[] }>("/reference/places.json")
  const bySlug = new Map(reference.places.map((place) => [place.slug, place]))

  const places: GlobePlace[] = []
  for (const key of PILOT_KEYS) {
    const bundle = readJson<SeedBundle>(`/pilots/${key}.json`)
    const seed = bySlug.get(key)
    const lastSegment = bundle.place_path.split("/").pop()
    // The city-level seed carries the authoritative center coordinates.
    const citySeed =
      bySlug.get(lastSegment ?? key) ??
      seed ?? {
        slug: key,
        name: key,
        country_code: null,
        center: null,
      }

    if (!citySeed.center) continue

    const counts = countEntities(bundle.entities)
    places.push({
      key,
      canonicalPath: bundle.place_path,
      name: citySeed.name,
      countryName: seed?.name ?? citySeed.name,
      countryCode: citySeed.country_code ?? null,
      center: { lat: citySeed.center.lat, lng: citySeed.center.lng },
      musicalIdentity: bundle.overview?.musical_identity ?? null,
      counts,
      weight: totalWeight(counts),
    })
  }

  places.sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath))

  cached = {
    schemaVersion: GLOBE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    places,
  }
  return cached
}
