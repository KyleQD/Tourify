import { stripInternalMetadataKeys } from "./supabase-world-history-repository"
import type { WorldHistoryEntity, WorldPlaceKnowledgeSnapshot } from "./contracts"
import type { DraftWorldPlaceResponse, WorldSectionItem, WorldTimelineItem, WorldUnavailableSection } from "./world-place-contract"
import { getDraftEntityQuality, getDraftRelationshipQuality } from "./quality"

const FROM_HERE_RELATIONS = new Set([
  "originated_in", "born_in", "formed_in", "developed_in", "recorded_in",
  "historically_significant_in", "associated_with",
])

function seedId(kind: string, key: string): string {
  return `seed:${kind}:${key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
}

function unavailable(reason: string): WorldUnavailableSection {
  return { status: "not_available_in_seed_fixture", reason, items: [] }
}

function sectionItem(entity: WorldHistoryEntity, resolveSource: (key: string) => WorldPlaceKnowledgeSnapshot["sources"][number] | null): WorldSectionItem {
  const metadata = stripInternalMetadataKeys({ ...entity.metadata })
  for (const key of ["stream_url", "source_url", "storage_path", "raw_payload", "raw_response", "seed_id", "pilot_key", "seed_relationship_key"]) delete metadata[key]

  const data: Record<string, unknown> = {
    slug: entity.slug,
    name: entity.canonical_name,
    summary: entity.short_description,
    entityType: entity.entity_type,
    metadata,
  }

  if (entity.entity_type === "recording_reference") {
    data.playback = {
      policy: metadata.playback_policy ?? "metadata_only",
      rightsStatus: metadata.rights_status ?? "unresolved",
      playActionAvailable: false,
    }
  }

  if (entity.entity_type === "artist_reference") {
    data.identity = {
      kind: metadata.identity_kind ?? null,
      policy: metadata.identity_policy ?? null,
      externalIds: metadata.external_ids ?? {},
      tourifyMatchStatus: metadata.tourify_match_status ?? null,
      isTourifyProfile: false,
    }
  }

  const hasTime = entity.start_year !== null || entity.end_year !== null
  return {
    id: entity.seed_id,
    kind: entity.entity_type,
    data,
    placeRelation: entity.place_relation,
    confidence: entity.confidence,
    timeScope: hasTime ? {
      start: entity.start_year === null ? null : String(entity.start_year),
      end: entity.end_year === null ? null : String(entity.end_year),
    } : null,
    provenance: { claimId: null, sourceKeys: entity.source_keys, reviewed: false },
    quality: getDraftEntityQuality(entity, resolveSource),
    actions: [{ type: "explore_related", entityKind: entity.entity_type, entityId: entity.seed_id }],
  }
}

function timelineItem(entity: WorldHistoryEntity): WorldTimelineItem {
  const sameYear = entity.start_year !== null && entity.end_year === entity.start_year
  return {
    id: entity.seed_id,
    year: sameYear ? entity.start_year : null,
    startYear: entity.start_year,
    endYear: entity.end_year,
    precision: sameYear ? "year" : entity.start_year !== null || entity.end_year !== null ? "period" : "unknown",
    title: entity.canonical_name,
    summary: entity.short_description,
    entityRefs: [{ id: entity.seed_id, kind: entity.entity_type, name: entity.canonical_name }],
    placeRefs: [],
    claimIds: [],
    sourceKeys: entity.source_keys,
    reviewed: false,
  }
}

export function projectDraftWorldPlaceResponse(snapshot: WorldPlaceKnowledgeSnapshot): DraftWorldPlaceResponse {
  const { bundle, place } = snapshot
  const sourceMap = new Map(snapshot.sources.map((source) => [source.source_key, source]))
  const resolveSource = (key: string) => sourceMap.get(key) ?? null

  const entityMap = new Map(bundle.entities.map((entity) => [entity.seed_id, entity]))
  const byType = (types: WorldHistoryEntity["entity_type"][]) => bundle.entities.filter((entity) => types.includes(entity.entity_type))

  const sourceKeys = new Set(bundle.overview.source_keys)
  for (const entity of bundle.entities) for (const key of entity.source_keys) sourceKeys.add(key)
  for (const relationship of bundle.relationships) for (const key of relationship.source_keys) sourceKeys.add(key)

  const sourceRefs: DraftWorldPlaceResponse["provenance"]["sourceRefs"] = []
  const sourceTypes = new Set<string>()
  const missingSourceKeys = new Set(snapshot.missing_source_keys)
  for (const key of [...sourceKeys].sort()) {
    const source = resolveSource(key)
    if (!source) {
      missingSourceKeys.add(key)
      continue
    }
    sourceTypes.add(source.source_type)
    sourceRefs.push({
      key,
      name: source.name,
      canonicalUrl: source.url,
      attribution: source.attribution ?? null,
      licenseClass: source.license_class ?? null,
      authority: source.authority ?? null,
      ingestionPermission: source.ingestion_permission ?? null,
      mediaReusePermission: source.media_reuse_permission ?? null,
      commercialUsePermission: source.commercial_use_permission ?? null,
    })
  }

  const parent = snapshot.breadcrumb.length > 1 ? snapshot.breadcrumb[snapshot.breadcrumb.length - 2] : null
  const entityQualityRows = bundle.entities.map((entity) => ({ entity, quality: getDraftEntityQuality(entity, resolveSource) }))
  const relationshipQualityRows = bundle.relationships.map((relationship) => ({ relationship, quality: getDraftRelationshipQuality(relationship, resolveSource) }))
  const average = (values: number[]) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10000) / 10000 : 0
  const artists = byType(["artist_reference"])
  const recordings = byType(["recording_reference"])
  const landmarks = byType(["studio_landmark"])
  const stableArtistCount = artists.filter((entity) => {
    const ids = entity.metadata.external_ids && typeof entity.metadata.external_ids === "object" ? entity.metadata.external_ids as Record<string, unknown> : {}
    return Boolean(ids.musicbrainz_artist_mbid || ids.wikidata_qid)
  }).length
  const recordingYearCount = recordings.filter((entity) => typeof entity.metadata.release_year === "number").length
  const landmarkIdentityCount = landmarks.filter((entity) => Boolean(entity.metadata.address_text || entity.metadata.external_ids)).length
  const sourceDomains = new Set(sourceRefs.map((source) => {
    try { return source.canonicalUrl ? new URL(source.canonicalUrl).hostname.replace(/^www\./, "") : null } catch { return null }
  }).filter((value): value is string => Boolean(value)))
  const qualityGaps: string[] = []
  if (artists.length > stableArtistCount) qualityGaps.push(`${artists.length - stableArtistCount} artist identities still lack a stable external id`)
  if (recordings.length > recordingYearCount) qualityGaps.push(`${recordings.length - recordingYearCount} recording references still lack a confident release year`)
  if (landmarks.length > landmarkIdentityCount) qualityGaps.push(`${landmarks.length - landmarkIdentityCount} landmarks still lack address/external identity`)
  const lowConfidenceRelationships = bundle.relationships.filter((relationship) => relationship.confidence < 0.8).length
  if (lowConfidenceRelationships) qualityGaps.push(`${lowConfidenceRelationships} graph relationships remain below 0.80 confidence`)
  qualityGaps.push("current popularity signals not seeded", "live event/venue signals not seeded", "radio/playback rights not seeded")
  const bestEntity = (type: WorldHistoryEntity["entity_type"]) => entityQualityRows
    .filter((row) => row.entity.entity_type === type)
    .sort((a, b) => b.quality.score - a.quality.score || a.entity.canonical_name.localeCompare(b.entity.canonical_name))[0] ?? null
  const timeline = byType(["historical_milestone", "genre", "scene", "movement", "tradition", "educational_topic"])
    .filter((entity) => entity.start_year !== null)
    .sort((a, b) => (a.start_year ?? 9999) - (b.start_year ?? 9999) || a.canonical_name.localeCompare(b.canonical_name))
    .map(timelineItem)

  return {
    schemaVersion: "world-place-v0.1",
    fixtureVersion: "world-seed-fixture-v0.3",
    publicationState: "draft_needs_review_not_deployed",
    place: {
      id: place.id,
      canonicalPath: place.canonical_path,
      name: place.name,
      displayName: place.display_name ?? place.name,
      placeType: place.place_type,
      parent: parent ? { id: parent.id, canonicalPath: parent.canonical_path, name: parent.name } : null,
      breadcrumb: snapshot.breadcrumb.map((item) => ({
        id: item.id,
        canonicalPath: item.canonical_path,
        name: item.name,
        placeType: item.place_type,
      })),
      countryCode: place.country_code ?? null,
      admin1Code: place.admin1_code ?? null,
      timezone: place.timezone ?? null,
      languages: place.languages,
      center: place.center ? { latitude: place.center.lat, longitude: place.center.lng } : null,
      aliases: place.aliases,
      externalRefs: place.external_refs,
    },
    overview: {
      shortDescription: null,
      musicalIdentity: bundle.overview.musical_identity,
      hero: null,
      listenHere: null,
      listenHereStatus: {
        status: "unavailable",
        reason: "Pilot recordings and sound guides are metadata/description-only until playback rights are independently resolved.",
      },
      stats: {
        publishedClaims: 0,
        artists: artists.length,
        tracks: 0,
        radioStations: 0,
        eventsUpcoming: 0,
        culturalEntities: bundle.entities.length,
      },
      quality: {
        modelVersion: "world-quality-model-v0.1",
        averageEntityQuality: average(entityQualityRows.map((row) => row.quality.score)),
        averageRelationshipQuality: average(relationshipQualityRows.map((row) => row.quality.score)),
        corroboratedEntityRate: entityQualityRows.length ? average(entityQualityRows.map((row) => row.quality.corroboratedAcrossDomains ? 1 : 0)) : 0,
        stableArtistIdentityRate: artists.length ? Math.round((stableArtistCount / artists.length) * 10000) / 10000 : 1,
        recordingYearCoverage: recordings.length ? Math.round((recordingYearCount / recordings.length) * 10000) / 10000 : 1,
        landmarkIdentityCoverage: landmarks.length ? Math.round((landmarkIdentityCount / landmarks.length) * 10000) / 10000 : 1,
        sourceDomainCount: sourceDomains.size,
        sourceTypeCount: sourceTypes.size,
        publicationEligible: false,
        gaps: qualityGaps,
      },
      explore: {
        basis: "draft_quality_heuristic_not_editorial",
        suggestedPath: [
          timeline[0] ? { role: "start_with_history", id: timeline[0].id, kind: timeline[0].entityRefs[0]?.kind ?? "unknown", name: timeline[0].title } : null,
          bestEntity("sound_signature") ? { role: "hear_the_signature", id: bestEntity("sound_signature")!.entity.seed_id, kind: "sound_signature", name: bestEntity("sound_signature")!.entity.canonical_name, qualityScore: bestEntity("sound_signature")!.quality.score } : null,
          bestEntity("artist_reference") ? { role: "meet_a_key_artist", id: bestEntity("artist_reference")!.entity.seed_id, kind: "artist_reference", name: bestEntity("artist_reference")!.entity.canonical_name, qualityScore: bestEntity("artist_reference")!.quality.score } : null,
          bestEntity("recording_reference") ? { role: "study_a_recording", id: bestEntity("recording_reference")!.entity.seed_id, kind: "recording_reference", name: bestEntity("recording_reference")!.entity.canonical_name, qualityScore: bestEntity("recording_reference")!.quality.score } : null,
          bestEntity("studio_landmark") ? { role: "visit_a_landmark", id: bestEntity("studio_landmark")!.entity.seed_id, kind: "studio_landmark", name: bestEntity("studio_landmark")!.entity.canonical_name, qualityScore: bestEntity("studio_landmark")!.quality.score } : null,
        ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
      },
    },
    sections: {
      fromHere: {
        status: "draft_seed_data",
        items: bundle.entities.filter((entity) =>
          FROM_HERE_RELATIONS.has(entity.place_relation) &&
          ["artist_reference", "genre", "scene", "movement", "tradition", "instrument"].includes(entity.entity_type)
        ).map((entity) => sectionItem(entity, resolveSource)),
      },
      popularHere: unavailable("No current popularity signal is seeded. Historical prominence must never be represented as current popularity."),
      happeningHere: unavailable("Live events and venue activity must come from current Tourify operational sources, not historical seed data."),
      historyHere: {
        status: "draft_seed_data",
        timeline,
        genresAndScenes: byType(["genre", "scene", "movement", "tradition", "educational_topic"]).map((entity) => sectionItem(entity, resolveSource)),
        instruments: byType(["instrument"]).map((entity) => sectionItem(entity, resolveSource)),
        soundSignatures: byType(["sound_signature"]).map((entity) => sectionItem(entity, resolveSource)),
        notableArtists: byType(["artist_reference"]).map((entity) => sectionItem(entity, resolveSource)),
        notableRecordings: byType(["recording_reference"]).map((entity) => sectionItem(entity, resolveSource)),
        landmarks: byType(["studio_landmark"]).map((entity) => sectionItem(entity, resolveSource)),
      },
      tourifyHere: unavailable("No exact pilot historical artist identities currently match Tourify Demo artist profiles; fake profiles are forbidden."),
      radio: unavailable("Radio station ingestion and stream-rights review are not part of this static history fixture."),
    },
    relationships: {
      count: bundle.relationships.length,
      items: bundle.relationships.map((relationship) => {
        const subject = entityMap.get(relationship.subject_seed_id)
        const object = entityMap.get(relationship.object_seed_id)
        return {
          subject: { id: relationship.subject_seed_id, name: subject?.canonical_name ?? relationship.subject_seed_id, kind: subject?.entity_type ?? "unknown" },
          relationKey: relationship.relation_key,
          object: { id: relationship.object_seed_id, name: object?.canonical_name ?? relationship.object_seed_id, kind: object?.entity_type ?? "unknown" },
          confidence: relationship.confidence,
          sourceKeys: relationship.source_keys,
          reviewed: false,
          metadata: relationship.metadata ?? {},
          quality: getDraftRelationshipQuality(relationship, resolveSource),
        }
      }),
    },
    provenance: {
      reviewed: false,
      sourceCount: sourceRefs.length,
      sourceTypes: [...sourceTypes].sort(),
      sourceRefs,
      missingSourceKeys: [...missingSourceKeys].sort(),
      lastReviewedAt: null,
    },
    freshness: {
      knowledgeSeedRetrievedAt: snapshot.knowledge_retrieved_at ?? null,
      historicalDataClass: "long_lived_reviewed_on_publish",
      currentSignalDataPresent: false,
    },
    permissions: {
      previewOnly: true,
      publicEligible: false,
      playbackEligible: false,
      containsPrivateStreamLocators: false,
      containsRawIngestionPayloads: false,
    },
    generatedAt: new Date().toISOString(),
  }
}
