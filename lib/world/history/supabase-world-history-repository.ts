import type {
  WorldHistoryEntity,
  WorldHistoryPilotBundle,
  WorldPlaceKnowledgeSnapshot,
} from "./contracts"
import type { WorldHistoryRepository } from "./repository"
import type {
  CanonicalWorldClaimRow,
  SupabaseWorldHistoryReader,
  SupabaseWorldPlaceRowset,
  WorldRepositoryVisibility,
} from "./supabase-reader-contract"

const DEFAULT_PILOT_PATHS: Readonly<Record<string, string>> = {
  detroit: "us/mi/detroit",
  kingston: "jm/kingston",
  lagos: "ng/lagos",
  london: "gb/eng/london",
  tokyo: "jp/tokyo",
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function readLiteralText(claim: CanonicalWorldClaimRow | undefined): string | null {
  if (!claim) return null
  if (typeof claim.literal_value === "string") return claim.literal_value
  if (claim.literal_value && typeof claim.literal_value === "object") {
    const text = (claim.literal_value as Record<string, unknown>).text
    return readString(text)
  }
  return null
}

function seedLikeEntityId(id: string, metadata: Record<string, unknown>): string {
  return readString(metadata.seed_id) ?? `world:cultural:${id}`
}

/**
 * Internal bookkeeping keys are storage/provenance plumbing, not part of the
 * reviewed world-place-v0.1 contract. They never reach API payloads.
 */
const INTERNAL_METADATA_KEYS = new Set([
  "canonical_world_entity_id",
  "canonical_world_relationship_id",
  "canonical_claim_id",
  "seed_framework",
  "seed_id",
  "pilot_key",
  "seed_relationship_key",
  "seed_claim_key",
  "subject_seed_id",
  "object_seed_id",
])

export function stripInternalMetadataKeys<T extends Record<string, unknown>>(
  metadata: T
): T {
  const clone = { ...metadata }
  for (const key of Object.keys(clone)) {
    if (INTERNAL_METADATA_KEYS.has(key)) delete clone[key]
  }
  return clone
}

function sourceKeysForClaims(
  claimIds: Iterable<string>,
  rowset: SupabaseWorldPlaceRowset,
): string[] {
  const wanted = new Set(claimIds)
  if (!wanted.size) return []
  const sourceKeyById = new Map(rowset.sources.map((source) => [source.id, source.source_key]))
  const keys = new Set<string>()
  for (const evidence of rowset.evidence) {
    if (!wanted.has(evidence.claim_id) || evidence.evidence_status === "rejected") continue
    const key = sourceKeyById.get(evidence.source_id)
    if (key) keys.add(key)
  }
  return [...keys].sort()
}

function claimConfidence(claims: CanonicalWorldClaimRow[], fallback = 0.5): number {
  if (!claims.length) return fallback
  return Math.max(...claims.map((claim) => Number(claim.confidence) || 0))
}

function placeEdgeForEntity(entityId: string, rowset: SupabaseWorldPlaceRowset) {
  return rowset.place_edges.find((edge) => edge.cultural_entity_id === entityId) ?? null
}

function pilotKeyForPath(path: string, configured: Readonly<Record<string, string>>): string {
  for (const [key, value] of Object.entries(configured)) if (value === path) return key
  const parts = path.split("/").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : path
}

function buildBundle(
  rowset: SupabaseWorldPlaceRowset,
  pilotPaths: Readonly<Record<string, string>>,
): WorldHistoryPilotBundle {
  const entitySeedIdByCanonicalId = new Map<string, string>()
  const entities: WorldHistoryEntity[] = rowset.entities.map((row) => {
    const metadata = { ...row.metadata }
    const seedId = seedLikeEntityId(row.id, metadata)
    entitySeedIdByCanonicalId.set(row.id, seedId)
    const edge = placeEdgeForEntity(row.id, rowset)
    // The canonical place-edge claim is the promotion record for this entity:
    // its confidence and evidence define the reviewed identity attribution.
    const edgeClaim = edge?.claim_id
      ? rowset.claims.find((claim) => claim.id === edge.claim_id)
      : null

    return {
      seed_id: seedId,
      entity_type: row.entity_type,
      slug: row.slug,
      canonical_name: row.canonical_name,
      short_description: row.short_description ?? "",
      start_year: row.start_year ?? edge?.start_year ?? null,
      end_year: row.end_year ?? edge?.end_year ?? null,
      place_relation: edge?.relation_key ?? "associated_with",
      source_keys: edgeClaim ? sourceKeysForClaims([edgeClaim.id], rowset) : [],
      confidence: edgeClaim ? Number(edgeClaim.confidence) || 0.5 : 0.5,
      review_status: row.review_status,
      publication_status: row.publication_status,
      metadata: stripInternalMetadataKeys(metadata),
    }
  })

  const musicalIdentityClaim = rowset.claims
    .filter((claim) =>
      claim.subject_kind === "place" &&
      claim.predicate === "musical_identity" &&
      (claim.subject_id === rowset.place.id || claim.subject_id === rowset.place.canonical_path)
    )
    .sort((a, b) => Number(b.confidence) - Number(a.confidence))[0]

  const relationshipRows = rowset.relationships.map((row) => ({
    subject_seed_id: entitySeedIdByCanonicalId.get(row.subject_entity_id) ?? `world:cultural:${row.subject_entity_id}`,
    relation_key: row.relation_key,
    object_seed_id: entitySeedIdByCanonicalId.get(row.object_entity_id) ?? `world:cultural:${row.object_entity_id}`,
    source_keys: sourceKeysForClaims(row.claim_id ? [row.claim_id] : [], rowset),
    confidence: row.claim_id
      ? Number(rowset.claims.find((claim) => claim.id === row.claim_id)?.confidence ?? 0.5)
      : 0.5,
    review_status: row.review_status,
    publication_status: row.publication_status,
    metadata: stripInternalMetadataKeys({
      ...row.metadata,
      ...((rowset.claims.find((claim) => claim.id === row.claim_id)?.metadata ?? {}) as Record<string, unknown>),
    }),
  }))

  return {
    schema_version: "world-history-seed-v0.1",
    pilot_key: pilotKeyForPath(rowset.place.canonical_path, pilotPaths),
    place_path: rowset.place.canonical_path,
    overview: {
      musical_identity: readLiteralText(musicalIdentityClaim) ?? "Musical identity summary is pending editorial review.",
      source_keys: sourceKeysForClaims(musicalIdentityClaim ? [musicalIdentityClaim.id] : [], rowset),
      confidence: Number(musicalIdentityClaim?.confidence ?? 0.5),
      review_status: musicalIdentityClaim?.review_status ?? "needs_review",
      publication_status: musicalIdentityClaim?.publication_status ?? "draft",
    },
    entities,
    relationships: relationshipRows,
  }
}

export interface SupabaseWorldHistoryRepositoryOptions {
  visibility: WorldRepositoryVisibility
  pilotPaths?: Readonly<Record<string, string>>
}

/**
 * Canonical World repository backed by a normalized Supabase reader.
 *
 * This repository never reaches private radio streams or world_media_sources.
 * It only consumes the public/editorial knowledge graph tables defined at G1.
 */
export class SupabaseWorldHistoryRepository implements WorldHistoryRepository {
  private readonly pilotPaths: Readonly<Record<string, string>>

  constructor(
    private readonly reader: SupabaseWorldHistoryReader,
    private readonly options: SupabaseWorldHistoryRepositoryOptions,
  ) {
    this.pilotPaths = options.pilotPaths ?? DEFAULT_PILOT_PATHS
  }

  async listPilotKeys(): Promise<string[]> {
    return Object.keys(this.pilotPaths).sort()
  }

  async getPlaceKnowledgeByKey(key: string): Promise<WorldPlaceKnowledgeSnapshot | null> {
    const path = this.pilotPaths[key]
    if (!path) return null
    return this.getPlaceKnowledgeByPath(path)
  }

  async getPlaceKnowledgeByPath(path: string): Promise<WorldPlaceKnowledgeSnapshot | null> {
    const rowset = await this.reader.loadPlaceRowset(path, this.options.visibility)
    if (!rowset) return null

    return {
      place: rowset.place,
      breadcrumb: rowset.breadcrumb,
      bundle: buildBundle(rowset, this.pilotPaths),
      sources: rowset.sources,
      missing_source_keys: [],
      knowledge_retrieved_at: rowset.knowledge_retrieved_at ?? null,
      backing_store: "supabase_canonical",
    }
  }
}
