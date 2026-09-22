import type { WorldHistoryPlace } from "./contracts"
import type {
  CanonicalWorldClaimRow,
  CanonicalWorldCulturalEntityRow,
  CanonicalWorldCulturalPlaceEdgeRow,
  CanonicalWorldCulturalRelationshipRow,
  CanonicalWorldEvidenceRow,
  CanonicalWorldSourceRow,
  SupabaseWorldHistoryReader,
  SupabaseWorldPlaceRowset,
  WorldRepositoryVisibility,
} from "./supabase-reader-contract"

/**
 * Structural subset of Supabase/PostgREST used by this reader.
 * The real SupabaseClient satisfies this at runtime; keeping the dependency
 * structural avoids coupling World domain code to Tourify's curated DB types.
 */
export interface WorldPostgrestClientLike {
  from(table: string): any
}

type RawRow = Record<string, unknown>

function asRows(value: unknown): RawRow[] {
  return Array.isArray(value) ? value.filter((row): row is RawRow => Boolean(row) && typeof row === "object") : []
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function pointFromGeography(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null
  if (typeof value === "object") {
    const row = value as { type?: unknown; coordinates?: unknown }
    if (row.type === "Point" && Array.isArray(row.coordinates) && row.coordinates.length >= 2) {
      const lng = asNumber(row.coordinates[0])
      const lat = asNumber(row.coordinates[1])
      if (lat !== null && lng !== null) return { lat, lng }
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    const point = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(trimmed)
    if (point) return { lng: Number(point[1]), lat: Number(point[2]) }
    // PostgREST renders geography(Point) as hex EWKB:
    // [byte-order][type u32 (+SRID flag)][srid u32?] [lng f64][lat f64]
    if (/^[0-9a-f]+$/i.test(trimmed) && trimmed.length >= 50) {
      try {
        const byteAt = (byteIndex: number): number =>
          Number.parseInt(trimmed.substr(byteIndex * 2, 2), 16)
        const littleEndian = byteAt(0) === 1
        // WKBPoint: [order][type u32 (+0x20000000 SRID flag)][srid u32?][x f64][y f64]
        const geometryType = byteAt(1)
        const hasSrid = (byteAt(4) & 0x20) !== 0
        if (geometryType === 1) {
          const coordinateOrigin = hasSrid ? 9 : 5
          const readF64 = (byteIndex: number): number => {
            const bytes = new Uint8Array(8)
            for (let i = 0; i < 8; i += 1) bytes[i] = byteAt(byteIndex + i)
            return new DataView(bytes.buffer).getFloat64(0, littleEndian)
          }
          const lng = readF64(coordinateOrigin)
          const lat = readF64(coordinateOrigin + 8)
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
        }
      } catch {
        return null
      }
    }
  }
  return null
}

async function executeRows(query: any): Promise<RawRow[]> {
  const { data, error } = await query
  if (error) throw new Error(error.message || "World Supabase query failed")
  return asRows(data)
}

async function executeMaybeSingle(query: any): Promise<RawRow | null> {
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message || "World Supabase query failed")
  return data && typeof data === "object" ? data as RawRow : null
}

function withVisibility(query: any, visibility: WorldRepositoryVisibility, hasReviewStatus = true): any {
  if (visibility === "published_only") return query.eq("publication_status", "published")
  if (hasReviewStatus) return query.neq("review_status", "rejected").neq("publication_status", "retired")
  return query.neq("publication_status", "retired")
}

function mapPlace(row: RawRow): WorldHistoryPlace {
  return {
    id: String(row.id),
    canonical_path: String(row.canonical_path),
    slug: String(row.slug),
    name: String(row.name),
    display_name: asString(row.display_name),
    place_type: String(row.place_type),
    country_code: asString(row.country_code),
    admin1_code: asString(row.admin1_code),
    parent_place_id: asString(row.parent_place_id),
    parent_path: null,
    publication_status: (row.publication_status as WorldHistoryPlace["publication_status"]) || "draft",
    aliases: [],
    center: pointFromGeography(row.center),
    external_refs: [],
    timezone: asString(row.timezone),
    languages: asStringArray(row.primary_language_codes),
    metadata: asObject(row.metadata),
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function maxIso(values: Array<string | null>): string | null {
  const valid = values.filter((value): value is string => Boolean(value))
  return valid.sort().reverse()[0] ?? null
}

export class PostgrestSupabaseWorldHistoryReader implements SupabaseWorldHistoryReader {
  constructor(private readonly client: WorldPostgrestClientLike) {}

  async loadPlaceRowset(
    canonicalPath: string,
    visibility: WorldRepositoryVisibility,
  ): Promise<SupabaseWorldPlaceRowset | null> {
    let placeQuery = this.client
      .from("geo_places")
      .select("id,canonical_path,slug,name,display_name,place_type,parent_place_id,country_code,admin1_code,timezone,primary_language_codes,center,metadata,publication_status")
      .eq("canonical_path", canonicalPath)
    placeQuery = withVisibility(placeQuery, visibility, false)
    const placeRaw = await executeMaybeSingle(placeQuery)
    if (!placeRaw) return null

    const place = mapPlace(placeRaw)
    const breadcrumb: WorldHistoryPlace[] = [place]
    let parentId = place.parent_place_id
    let depth = 0
    while (parentId && depth < 8) {
      let parentQuery = this.client
        .from("geo_places")
        .select("id,canonical_path,slug,name,display_name,place_type,parent_place_id,country_code,admin1_code,timezone,primary_language_codes,center,metadata,publication_status")
        .eq("id", parentId)
      parentQuery = withVisibility(parentQuery, visibility, false)
      const parentRaw = await executeMaybeSingle(parentQuery)
      if (!parentRaw) break
      const parent = mapPlace(parentRaw)
      breadcrumb.unshift(parent)
      parentId = parent.parent_place_id
      depth += 1
    }

    const placeIds = breadcrumb.map((item) => item.id)
    const [aliasRows, externalRows] = await Promise.all([
      executeRows(this.client.from("geo_place_aliases").select("place_id,alias,language_code,alias_type,metadata").in("place_id", placeIds)),
      executeRows(this.client.from("geo_external_references").select("place_id,provider,external_type,external_id,canonical_url,attribution_text,metadata").in("place_id", placeIds)),
    ])
    for (const item of breadcrumb) {
      item.aliases = aliasRows.filter((row) => row.place_id === item.id).map((row) => String(row.alias))
      // Same verbatim snake_case projection as the static corpus path so both
      // backing stores produce identical world-place-v0.1 payloads.
      item.external_refs = externalRows
        .filter((row) => row.place_id === item.id)
        .map((row) => {
          const meta = asObject(row.metadata)
          return {
            provider: row.provider,
            external_type: row.external_type,
            external_id: row.external_id,
            canonical_url: row.canonical_url ?? null,
            attribution_text: row.attribution_text ?? null,
            source_key: typeof meta.source_key === "string" ? meta.source_key : null,
          }
        })
      // Deterministic ordering mirroring the reviewed seed convention: the
      // primary place-level geographic identity precedes narrower area refs.
      item.external_refs.sort(
        (a, b) =>
          String(b.external_type).localeCompare(String(a.external_type)) ||
          String(b.provider).localeCompare(String(a.provider)) ||
          String(a.external_id).localeCompare(String(b.external_id)),
      )
      const parent = item.parent_place_id ? breadcrumb.find((candidate) => candidate.id === item.parent_place_id) : null
      item.parent_path = parent?.canonical_path ?? null
    }

    let edgeQuery = this.client
      .from("world_cultural_entity_places")
      .select("cultural_entity_id,relation_type_id,start_year,end_year,claim_id,review_status,publication_status")
      .eq("place_id", place.id)
    edgeQuery = withVisibility(edgeQuery, visibility)
    const rawEdges = await executeRows(edgeQuery)
    const entityIds = unique(rawEdges.map((row) => asString(row.cultural_entity_id)).filter((value): value is string => Boolean(value)))
    if (!entityIds.length) {
      return { place, breadcrumb, entities: [], place_edges: [], relationships: [], claims: [], evidence: [], sources: [], knowledge_retrieved_at: null }
    }

    const edgeRelationTypeIds = unique(rawEdges.map((row) => asString(row.relation_type_id)).filter((value): value is string => Boolean(value)))
    const edgeRelationRows = edgeRelationTypeIds.length
      ? await executeRows(this.client.from("world_relation_types").select("id,relation_key,domain").in("id", edgeRelationTypeIds).eq("domain", "cultural_place"))
      : []
    const edgeRelationById = new Map(edgeRelationRows.map((row) => [String(row.id), String(row.relation_key)]))
    const place_edges: CanonicalWorldCulturalPlaceEdgeRow[] = rawEdges.map((row) => ({
      cultural_entity_id: String(row.cultural_entity_id),
      relation_key: edgeRelationById.get(String(row.relation_type_id)) ?? "associated_with",
      start_year: asNumber(row.start_year),
      end_year: asNumber(row.end_year),
      claim_id: asString(row.claim_id),
      review_status: row.review_status as CanonicalWorldCulturalPlaceEdgeRow["review_status"],
      publication_status: row.publication_status as CanonicalWorldCulturalPlaceEdgeRow["publication_status"],
    }))

    let entityQuery = this.client
      .from("world_cultural_entities")
      .select("id,entity_type,slug,canonical_name,short_description,start_year,end_year,metadata,review_status,publication_status")
      .in("id", entityIds)
    entityQuery = withVisibility(entityQuery, visibility)
    const rawEntities = await executeRows(entityQuery)
    const entities: CanonicalWorldCulturalEntityRow[] = rawEntities.map((row) => ({
      id: String(row.id),
      entity_type: row.entity_type as CanonicalWorldCulturalEntityRow["entity_type"],
      slug: String(row.slug),
      canonical_name: String(row.canonical_name),
      short_description: asString(row.short_description),
      start_year: asNumber(row.start_year),
      end_year: asNumber(row.end_year),
      metadata: asObject(row.metadata),
      review_status: row.review_status as CanonicalWorldCulturalEntityRow["review_status"],
      publication_status: row.publication_status as CanonicalWorldCulturalEntityRow["publication_status"],
    }))
    const visibleEntityIds = new Set(entities.map((entity) => entity.id))

    let subjectRelationshipQuery = this.client
      .from("world_cultural_relationships")
      .select("id,subject_entity_id,relation_type_id,object_entity_id,start_year,end_year,claim_id,review_status,publication_status,metadata")
      .in("subject_entity_id", [...visibleEntityIds])
    subjectRelationshipQuery = withVisibility(subjectRelationshipQuery, visibility)
    let objectRelationshipQuery = this.client
      .from("world_cultural_relationships")
      .select("id,subject_entity_id,relation_type_id,object_entity_id,start_year,end_year,claim_id,review_status,publication_status,metadata")
      .in("object_entity_id", [...visibleEntityIds])
    objectRelationshipQuery = withVisibility(objectRelationshipQuery, visibility)
    const relationshipCandidates = [...await executeRows(subjectRelationshipQuery), ...await executeRows(objectRelationshipQuery)]
    const relationshipById = new Map(relationshipCandidates.map((row) => [String(row.id), row]))
    const rawRelationships = [...relationshipById.values()].filter((row) =>
      visibleEntityIds.has(String(row.subject_entity_id)) && visibleEntityIds.has(String(row.object_entity_id))
    )
    const relationshipRelationTypeIds = unique(rawRelationships.map((row) => asString(row.relation_type_id)).filter((value): value is string => Boolean(value)))
    const relationshipRelationRows = relationshipRelationTypeIds.length
      ? await executeRows(this.client.from("world_relation_types").select("id,relation_key,domain").in("id", relationshipRelationTypeIds).eq("domain", "cultural_graph"))
      : []
    const graphRelationById = new Map(relationshipRelationRows.map((row) => [String(row.id), String(row.relation_key)]))
    const relationships: CanonicalWorldCulturalRelationshipRow[] = rawRelationships.map((row) => ({
      id: String(row.id),
      subject_entity_id: String(row.subject_entity_id),
      relation_key: graphRelationById.get(String(row.relation_type_id)) ?? "related_to",
      object_entity_id: String(row.object_entity_id),
      start_year: asNumber(row.start_year),
      end_year: asNumber(row.end_year),
      claim_id: asString(row.claim_id),
      review_status: row.review_status as CanonicalWorldCulturalRelationshipRow["review_status"],
      publication_status: row.publication_status as CanonicalWorldCulturalRelationshipRow["publication_status"],
      metadata: asObject(row.metadata),
    }))

    const entityClaimsQueryBase = this.client
      .from("world_claims")
      .select("id,claim_type,subject_kind,subject_id,predicate,object_kind,object_id,literal_value,temporal_start_year,temporal_end_year,confidence,origin_type,review_status,publication_status,reviewed_at,published_at,metadata")
      .eq("subject_kind", "cultural_entity")
      .in("subject_id", [...visibleEntityIds])
    const relationshipClaimIds = relationships.map((row) => row.claim_id).filter((value): value is string => Boolean(value))
    const edgeClaimIds = place_edges.map((row) => row.claim_id).filter((value): value is string => Boolean(value))
    const directClaimIds = unique([...relationshipClaimIds, ...edgeClaimIds])
    const placeClaimQueryBase = this.client
      .from("world_claims")
      .select("id,claim_type,subject_kind,subject_id,predicate,object_kind,object_id,literal_value,temporal_start_year,temporal_end_year,confidence,origin_type,review_status,publication_status,reviewed_at,published_at,metadata")
      .eq("subject_kind", "place")
      .eq("predicate", "musical_identity")
      .in("subject_id", [place.id, place.canonical_path])

    const claimQueries: any[] = [
      withVisibility(entityClaimsQueryBase, visibility),
      withVisibility(placeClaimQueryBase, visibility),
    ]
    if (directClaimIds.length) {
      claimQueries.push(withVisibility(
        this.client
          .from("world_claims")
          .select("id,claim_type,subject_kind,subject_id,predicate,object_kind,object_id,literal_value,temporal_start_year,temporal_end_year,confidence,origin_type,review_status,publication_status,reviewed_at,published_at,metadata")
          .in("id", directClaimIds),
        visibility,
      ))
    }
    const rawClaims = (await Promise.all(claimQueries.map(executeRows))).flat()
    const claimById = new Map(rawClaims.map((row) => [String(row.id), row]))
    const claims: CanonicalWorldClaimRow[] = [...claimById.values()].map((row) => ({
      id: String(row.id),
      claim_type: row.claim_type as CanonicalWorldClaimRow["claim_type"],
      subject_kind: String(row.subject_kind),
      subject_id: String(row.subject_id),
      predicate: String(row.predicate),
      object_kind: asString(row.object_kind),
      object_id: asString(row.object_id),
      literal_value: row.literal_value ?? null,
      temporal_start_year: asNumber(row.temporal_start_year),
      temporal_end_year: asNumber(row.temporal_end_year),
      confidence: Number(row.confidence ?? 0.5),
      origin_type: String(row.origin_type ?? "editor"),
      review_status: row.review_status as CanonicalWorldClaimRow["review_status"],
      publication_status: row.publication_status as CanonicalWorldClaimRow["publication_status"],
      reviewed_at: asString(row.reviewed_at),
      published_at: asString(row.published_at),
      metadata: asObject(row.metadata),
    }))

    const claimIds = claims.map((claim) => claim.id)
    const rawEvidence = claimIds.length
      ? await executeRows(this.client.from("world_claim_evidence").select("claim_id,source_id,retrieved_at,evidence_status").in("claim_id", claimIds).neq("evidence_status", "rejected"))
      : []
    const evidence: CanonicalWorldEvidenceRow[] = rawEvidence.map((row) => ({
      claim_id: String(row.claim_id),
      source_id: String(row.source_id),
      retrieved_at: asString(row.retrieved_at),
      evidence_status: row.evidence_status as CanonicalWorldEvidenceRow["evidence_status"],
    }))
    const sourceIds = unique(evidence.map((row) => row.source_id))
    const rawSources = sourceIds.length
      ? await executeRows(this.client.from("world_sources").select("id,source_key,name,source_type,homepage_url,license_class,attribution_requirements,ingestion_permission,media_reuse_permission,commercial_use_permission,review_status,metadata").in("id", sourceIds))
      : []
    const sources: CanonicalWorldSourceRow[] = rawSources.map((row) => {
      const metadata = asObject(row.metadata)
      return {
        id: String(row.id),
        source_key: String(row.source_key),
        name: String(row.name),
        url: asString(row.homepage_url) ?? "",
        source_type: String(row.source_type),
        license_class: asString(row.license_class),
        attribution: asString(row.attribution_requirements),
        authority: asString(metadata.authority),
        ingestion_permission: asString(row.ingestion_permission),
        media_reuse_permission: asString(row.media_reuse_permission),
        commercial_use_permission: asString(row.commercial_use_permission),
        review_status: asString(row.review_status),
      }
    })

    return {
      place,
      breadcrumb,
      entities,
      place_edges,
      relationships,
      claims,
      evidence,
      sources,
      knowledge_retrieved_at: maxIso(evidence.map((row) => row.retrieved_at)),
    }
  }
}
