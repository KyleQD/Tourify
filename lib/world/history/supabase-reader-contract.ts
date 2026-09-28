import type {
  WorldHistoryEntityType,
  WorldHistoryPlace,
  WorldHistorySource,
} from "./contracts"

export type WorldRepositoryVisibility = "draft_and_published" | "published_only"

export interface CanonicalWorldCulturalEntityRow {
  id: string
  entity_type: WorldHistoryEntityType
  slug: string
  canonical_name: string
  short_description: string | null
  start_year: number | null
  end_year: number | null
  metadata: Record<string, unknown>
  review_status: "candidate" | "needs_review" | "verified" | "rejected"
  publication_status: "draft" | "published" | "retired"
}

export interface CanonicalWorldCulturalPlaceEdgeRow {
  cultural_entity_id: string
  relation_key: string
  start_year: number | null
  end_year: number | null
  claim_id: string | null
  review_status: "candidate" | "needs_review" | "verified" | "rejected"
  publication_status: "draft" | "published" | "retired"
}

export interface CanonicalWorldCulturalRelationshipRow {
  id: string
  subject_entity_id: string
  relation_key: string
  object_entity_id: string
  start_year: number | null
  end_year: number | null
  claim_id: string | null
  review_status: "candidate" | "needs_review" | "verified" | "rejected"
  publication_status: "draft" | "published" | "retired"
  metadata: Record<string, unknown>
}

export interface CanonicalWorldClaimRow {
  id: string
  claim_type: "relationship" | "fact" | "summary" | "classification"
  subject_kind: string
  subject_id: string
  predicate: string
  object_kind: string | null
  object_id: string | null
  literal_value: unknown
  temporal_start_year: number | null
  temporal_end_year: number | null
  confidence: number
  origin_type: string
  review_status: "candidate" | "needs_review" | "verified" | "rejected"
  publication_status: "draft" | "published" | "retired"
  reviewed_at: string | null
  published_at: string | null
  metadata: Record<string, unknown>
}

export interface CanonicalWorldEvidenceRow {
  claim_id: string
  source_id: string
  retrieved_at: string | null
  evidence_status: "supporting" | "contradicting" | "context" | "rejected"
}

export interface CanonicalWorldSourceRow extends WorldHistorySource {
  id: string
}

export interface SupabaseWorldPlaceRowset {
  place: WorldHistoryPlace
  breadcrumb: WorldHistoryPlace[]
  entities: CanonicalWorldCulturalEntityRow[]
  place_edges: CanonicalWorldCulturalPlaceEdgeRow[]
  relationships: CanonicalWorldCulturalRelationshipRow[]
  claims: CanonicalWorldClaimRow[]
  evidence: CanonicalWorldEvidenceRow[]
  sources: CanonicalWorldSourceRow[]
  knowledge_retrieved_at?: string | null
}

/**
 * Thin normalized read contract implemented by the real Supabase adapter.
 *
 * Keeping PostgREST query-builder details below this interface makes the World
 * repository deterministic and testable. The adapter is responsible for RLS / 
 * service-role context and must never return private radio/media locator rows.
 */
export interface SupabaseWorldHistoryReader {
  loadPlaceRowset(
    canonicalPath: string,
    visibility: WorldRepositoryVisibility,
  ): Promise<SupabaseWorldPlaceRowset | null>
}
