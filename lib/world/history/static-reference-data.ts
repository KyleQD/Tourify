import placesData from "@/data/world/reference/places.json"
import sourcesData from "@/data/world/reference/sources.json"

export interface SeedPlace {
  canonical_path: string
  slug: string
  name: string
  place_type: string
  country_code?: string
  admin1_code?: string
  parent_path?: string | null
  publication_status: "draft"
  aliases?: string[]
  center?: { lat: number; lng: number; source_key: string }
  external_refs?: Array<Record<string, unknown>>
  timezone?: string
  languages?: string[]
}

export interface SeedSource {
  source_key: string
  name: string
  url: string
  source_type: string
  license_class?: string | null
  attribution?: string | null
  authority?: string | null
  ingestion_permission?: string | null
  media_reuse_permission?: string | null
  commercial_use_permission?: string | null
}

const placeRows = (placesData as { places: SeedPlace[] }).places
const sourceDoc = sourcesData as { retrieved_at?: string; sources: SeedSource[] }
const sourceRows = sourceDoc.sources

const BY_PATH = new Map(placeRows.map((place) => [place.canonical_path, place]))
const SOURCES_BY_KEY = new Map(sourceRows.map((source) => [source.source_key, source]))

export function getSeedPlaceByPath(path: string): SeedPlace | null {
  return BY_PATH.get(path) ?? null
}

export function getSeedPlaceBreadcrumb(path: string): SeedPlace[] {
  const pieces = path.split("/")
  const result: SeedPlace[] = []
  for (let index = 1; index <= pieces.length; index += 1) {
    const current = BY_PATH.get(pieces.slice(0, index).join("/"))
    if (current) result.push(current)
  }
  return result
}

export function getSeedSourceByKey(key: string): SeedSource | null {
  return SOURCES_BY_KEY.get(key) ?? null
}

export function getSeedSourcesRetrievedAt(): string | null {
  return sourceDoc.retrieved_at ?? null
}
