export interface WorldPlaceIdentity {
  id: string
  canonicalPath: string
  name: string
  displayName: string
  placeType: string
  parent?: { id: string; canonicalPath: string; name: string } | null
  breadcrumb: Array<{ id: string; canonicalPath: string; name: string; placeType: string }>
  countryCode?: string | null
  admin1Code?: string | null
  timezone?: string | null
  languages: string[]
  center?: { latitude: number; longitude: number } | null
  aliases: string[]
  externalRefs: Array<Record<string, unknown>>
}

export interface WorldAction {
  type: "open" | "save" | "explore_related"
  href?: string
  entityKind?: string
  entityId?: string
}

export interface WorldSectionItem<T = Record<string, unknown>> {
  id: string
  kind: string
  data: T
  placeRelation?: string | null
  confidence?: number | null
  timeScope?: { start?: string | null; end?: string | null } | null
  provenance?: { claimId?: string | null; sourceKeys: string[]; reviewed: boolean }
  quality?: {
    score: number
    band: "strong_basis" | "solid_basis" | "developing" | "thin"
    confidence: number
    metadataCompleteness?: number
    sourceCount: number
    distinctDomains: number
    corroboratedAcrossDomains: boolean
    publicationEligible: false
    blockers: string[]
    domains?: string[]
    sourceTypes?: string[]
    authorities?: string[]
    authorityScore?: number
    diversityScore?: number
    provenanceIntegrity?: number
  }
  actions?: WorldAction[]
}

export interface WorldUnavailableSection {
  status: "not_available_in_seed_fixture"
  reason: string
  items: []
}

export interface WorldTimelineItem {
  id: string
  year?: number | null
  startYear?: number | null
  endYear?: number | null
  precision: "exact" | "year" | "decade" | "period" | "unknown"
  title: string
  summary?: string | null
  entityRefs: Array<{ id: string; kind: string; name: string }>
  placeRefs: Array<{ id: string; kind: string; name: string }>
  claimIds: string[]
  sourceKeys: string[]
  reviewed: false
}

export interface DraftWorldPlaceResponse {
  schemaVersion: "world-place-v0.1"
  fixtureVersion: "world-seed-fixture-v0.3"
  publicationState: "draft_needs_review_not_deployed"
  place: WorldPlaceIdentity
  overview: {
    shortDescription: string | null
    musicalIdentity: string
    hero: null
    listenHere: null
    listenHereStatus: { status: "unavailable"; reason: string }
    stats: {
      publishedClaims: 0
      artists: number
      tracks: 0
      radioStations: 0
      eventsUpcoming: 0
      culturalEntities: number
    }
    quality: {
      modelVersion: "world-quality-model-v0.1"
      averageEntityQuality: number
      averageRelationshipQuality: number
      corroboratedEntityRate: number
      stableArtistIdentityRate: number
      recordingYearCoverage: number
      landmarkIdentityCoverage: number
      sourceDomainCount: number
      sourceTypeCount: number
      publicationEligible: false
      gaps: string[]
    }
    explore: {
      basis: "draft_quality_heuristic_not_editorial"
      suggestedPath: Array<{ role: string; id: string; kind: string; name: string; qualityScore?: number }>
    }
  }
  sections: {
    fromHere: { status: "draft_seed_data"; items: WorldSectionItem[] }
    popularHere: WorldUnavailableSection
    happeningHere: WorldUnavailableSection
    historyHere: {
      status: "draft_seed_data"
      timeline: WorldTimelineItem[]
      genresAndScenes: WorldSectionItem[]
      instruments: WorldSectionItem[]
      soundSignatures: WorldSectionItem[]
      notableArtists: WorldSectionItem[]
      notableRecordings: WorldSectionItem[]
      landmarks: WorldSectionItem[]
    }
    tourifyHere: WorldUnavailableSection
    radio: WorldUnavailableSection
  }
  relationships: {
    count: number
    items: Array<{
      subject: { id: string; name: string; kind: string }
      relationKey: string
      object: { id: string; name: string; kind: string }
      confidence: number
      sourceKeys: string[]
      reviewed: false
      metadata: Record<string, unknown>
      quality: {
        score: number
        band: "strong_basis" | "solid_basis" | "developing" | "thin"
        publicationEligible: false
        blockers: string[]
        domains?: string[]
        sourceTypes?: string[]
        authorities?: string[]
        authorityScore?: number
        diversityScore?: number
        provenanceIntegrity?: number
      }
    }>
  }
  provenance: {
    reviewed: false
    sourceCount: number
    sourceTypes: string[]
    sourceRefs: Array<{
      key: string
      name: string
      canonicalUrl?: string | null
      attribution?: string | null
      licenseClass?: string | null
      authority?: string | null
      ingestionPermission?: string | null
      mediaReusePermission?: string | null
      commercialUsePermission?: string | null
    }>
    missingSourceKeys: string[]
    lastReviewedAt: null
  }
  freshness: {
    knowledgeSeedRetrievedAt?: string | null
    historicalDataClass: "long_lived_reviewed_on_publish"
    currentSignalDataPresent: false
  }
  permissions: {
    previewOnly: true
    publicEligible: false
    playbackEligible: false
    containsPrivateStreamLocators: false
    containsRawIngestionPayloads: false
  }
  generatedAt: string
}
