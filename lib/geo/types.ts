/**
 * Canonical geography resolver contracts (GEO_RESOLVER_CONTRACT_V0_1).
 * Shared Tourify infrastructure: no World-specific cultural logic lives here.
 */

export interface GeoCoordinates {
  latitude: number
  longitude: number
}

export interface GeoExternalReferenceInput {
  provider: string
  externalType?: string
  externalId: string
}

export interface GeoHierarchyInput {
  neighborhood?: string | null
  city?: string | null
  admin1?: string | null
  country?: string | null
  countryCode?: string | null
}

export type GeoSourceContext =
  | "event"
  | "event_v2"
  | "artist_event"
  | "venue"
  | "profile"
  | "post"
  | "job"
  | "provider"
  | "world_ingestion"

export type GeoPlaceType =
  | "country"
  | "territory"
  | "cultural_region"
  | "region"
  | "state_province"
  | "city"
  | "neighborhood"
  | "landmark"

export interface ResolvePlaceInput {
  coordinates?: GeoCoordinates | null
  hierarchy?: GeoHierarchyInput | null
  freeText?: string | null
  externalReferences?: GeoExternalReferenceInput[]
  sourceContext?: GeoSourceContext
  preferredTypes?: GeoPlaceType[]
  /**
   * Server/editorial only. Must never be accepted from an untrusted public request.
   */
  includeDraft?: boolean
}

export type GeoMatchMethod =
  | "external_id"
  | "hierarchy_exact"
  | "alias_exact"
  | "coordinates_validated"
  | "text_exact"
  | "fuzzy_candidate"
  | "unresolved"

export interface ResolvedPlaceCandidate {
  placeId: string
  canonicalPath: string
  name: string
  placeType: string
  countryCode?: string | null
  confidence: number
  matchMethod: GeoMatchMethod
  distanceMeters?: number | null
  reasons: string[]
}

export interface ResolvePlaceResult {
  placeId: string | null
  canonicalPath?: string | null
  canonicalLabel?: string | null
  confidence: number
  matchMethod: GeoMatchMethod
  needsReview: boolean
  candidates: ResolvedPlaceCandidate[]
  normalizedInput: {
    hierarchy?: GeoHierarchyInput | null
    freeText?: string | null
    coordinates?: GeoCoordinates | null
  }
}

/**
 * Structural projection of `public.geo_places` (Migration A, isolated-validated).
 */
export interface GeoPlaceRow {
  id: string
  slug: string
  canonical_path: string
  name: string
  display_name: string | null
  place_type: string
  parent_place_id: string | null
  country_code: string | null
  admin1_code: string | null
  timezone: string | null
  publication_status: string
  center: { latitude: number; longitude: number } | null
}

export interface GeoNearbyCandidate {
  place: GeoPlaceRow
  distanceMeters: number | null
}

export interface ResolveQueryOptions {
  includeDraft?: boolean
  preferredTypes?: GeoPlaceType[]
}
