import type { WorldHistoryRepository } from "./repository"
import type { WorldPlaceKnowledgeSnapshot } from "./contracts"
import { getWorldHistoryPilotByKey, getWorldHistoryPilotByPath, listWorldHistoryPilotKeys } from "./pilot-corpus"
import {
  getSeedPlaceBreadcrumb,
  getSeedPlaceByPath,
  getSeedSourceByKey,
  getSeedSourcesRetrievedAt,
} from "./static-reference-data"

function buildSnapshot(bundle: NonNullable<ReturnType<typeof getWorldHistoryPilotByKey>>): WorldPlaceKnowledgeSnapshot | null {
  const place = getSeedPlaceByPath(bundle.place_path)
  if (!place) return null

  const sourceKeys = new Set(bundle.overview.source_keys)
  for (const entity of bundle.entities) for (const key of entity.source_keys) sourceKeys.add(key)
  for (const relationship of bundle.relationships) for (const key of relationship.source_keys) sourceKeys.add(key)

  const sources = []
  const missing_source_keys: string[] = []
  for (const key of [...sourceKeys].sort()) {
    const source = getSeedSourceByKey(key)
    if (source) sources.push(source)
    else missing_source_keys.push(key)
  }

  return {
    place: {
      id: `seed:place:${place.canonical_path}`,
      canonical_path: place.canonical_path,
      slug: place.slug,
      name: place.name,
      display_name: place.name,
      place_type: place.place_type,
      country_code: place.country_code ?? null,
      admin1_code: place.admin1_code ?? null,
      parent_place_id: null,
      parent_path: place.parent_path ?? null,
      publication_status: place.publication_status,
      aliases: place.aliases ?? [],
      center: place.center ? { lat: place.center.lat, lng: place.center.lng } : null,
      external_refs: place.external_refs ?? [],
      timezone: place.timezone ?? null,
      languages: place.languages ?? [],
      metadata: {},
    },
    breadcrumb: getSeedPlaceBreadcrumb(place.canonical_path).map((item) => ({
      id: `seed:place:${item.canonical_path}`,
      canonical_path: item.canonical_path,
      slug: item.slug,
      name: item.name,
      display_name: item.name,
      place_type: item.place_type,
      country_code: item.country_code ?? null,
      admin1_code: item.admin1_code ?? null,
      parent_place_id: null,
      parent_path: item.parent_path ?? null,
      publication_status: item.publication_status,
      aliases: item.aliases ?? [],
      center: item.center ? { lat: item.center.lat, lng: item.center.lng } : null,
      external_refs: item.external_refs ?? [],
      timezone: item.timezone ?? null,
      languages: item.languages ?? [],
      metadata: {},
    })),
    bundle,
    sources,
    missing_source_keys,
    knowledge_retrieved_at: getSeedSourcesRetrievedAt(),
    backing_store: "static_seed",
  }
}

export class StaticPilotWorldHistoryRepository implements WorldHistoryRepository {
  async listPilotKeys(): Promise<string[]> {
    return listWorldHistoryPilotKeys()
  }

  async getPlaceKnowledgeByKey(key: string): Promise<WorldPlaceKnowledgeSnapshot | null> {
    const bundle = getWorldHistoryPilotByKey(key)
    return bundle ? buildSnapshot(bundle) : null
  }

  async getPlaceKnowledgeByPath(path: string): Promise<WorldPlaceKnowledgeSnapshot | null> {
    const bundle = getWorldHistoryPilotByPath(path)
    return bundle ? buildSnapshot(bundle) : null
  }
}

let singleton: WorldHistoryRepository | null = null

export function getWorldHistoryRepository(): WorldHistoryRepository {
  if (!singleton) singleton = new StaticPilotWorldHistoryRepository()
  return singleton
}
