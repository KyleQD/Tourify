export type WorldHistoryEntityType =
  | "instrument" | "genre" | "scene" | "movement" | "tradition"
  | "historical_milestone" | "studio_landmark" | "educational_topic"
  | "recording_reference" | "sound_signature" | "artist_reference"

export interface WorldHistoryEntity {
  seed_id: string
  entity_type: WorldHistoryEntityType
  slug: string
  canonical_name: string
  short_description: string
  start_year: number | null
  end_year: number | null
  place_relation: string
  source_keys: string[]
  confidence: number
  review_status: "candidate" | "needs_review" | "verified" | "rejected"
  publication_status: "draft" | "published" | "retired"
  metadata: Record<string, unknown>
}

export interface WorldHistoryPilotBundle {
  schema_version: "world-history-seed-v0.1"
  pilot_key: string
  place_path: string
  overview: {
    musical_identity: string
    source_keys: string[]
    confidence: number
    review_status: "candidate" | "needs_review" | "verified" | "rejected"
    publication_status: "draft" | "published" | "retired"
  }
  entities: WorldHistoryEntity[]
  relationships: Array<{
    subject_seed_id: string
    relation_key: string
    object_seed_id: string
    source_keys: string[]
    confidence: number
    review_status: "candidate" | "needs_review" | "verified" | "rejected"
    publication_status: "draft" | "published" | "retired"
    metadata?: Record<string, unknown>
  }>
}

export interface WorldHistoryPlace {
  id: string
  canonical_path: string
  slug: string
  name: string
  display_name?: string | null
  place_type: string
  country_code?: string | null
  admin1_code?: string | null
  parent_place_id?: string | null
  parent_path?: string | null
  publication_status: "draft" | "published" | "retired"
  aliases: string[]
  center?: { lat: number; lng: number } | null
  external_refs: Array<Record<string, unknown>>
  timezone?: string | null
  languages: string[]
  metadata?: Record<string, unknown>
}

export interface WorldHistorySource {
  id?: string | null
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
  review_status?: string | null
}

export interface WorldPlaceKnowledgeSnapshot {
  place: WorldHistoryPlace
  breadcrumb: WorldHistoryPlace[]
  bundle: WorldHistoryPilotBundle
  sources: WorldHistorySource[]
  missing_source_keys: string[]
  knowledge_retrieved_at?: string | null
  backing_store: "static_seed" | "supabase_canonical"
}

