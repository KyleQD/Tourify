import type { WorldHistoryEntity, WorldPlaceKnowledgeSnapshot } from "./contracts"
import { getDraftEntityQuality, getDraftRelationshipQuality } from "./quality"

export interface DraftWorldRelationshipProjection {
  subjectSeedId: string
  subjectName: string
  relationKey: string
  objectSeedId: string
  objectName: string
  sourceKeys: string[]
  confidence: number
  metadata?: Record<string, unknown>
}

export interface DraftWorldHistoryProjection {
  placePath: string
  pilotKey: string
  musicalIdentity: string
  timeline: WorldHistoryEntity[]
  genresAndScenes: WorldHistoryEntity[]
  instruments: WorldHistoryEntity[]
  soundSignatures: WorldHistoryEntity[]
  notableArtists: WorldHistoryEntity[]
  notableRecordings: WorldHistoryEntity[]
  landmarks: WorldHistoryEntity[]
  relationships: DraftWorldRelationshipProjection[]
  provenance: { sourceKeys: string[]; reviewed: false }
  quality: {
    averageEntityQuality: number
    averageRelationshipQuality: number
    corroboratedEntityRate: number
    stableArtistIdentityRate: number
    recordingYearCoverage: number
    landmarkIdentityCoverage: number
    gaps: string[]
  }
  suggestedExplorePath: Array<{ role: string; seedId: string; name: string; kind: string; qualityScore?: number }>
}

export function projectDraftWorldHistory(snapshot: WorldPlaceKnowledgeSnapshot): DraftWorldHistoryProjection {
  const { bundle } = snapshot
  const sourceMap = new Map(snapshot.sources.map((source) => [source.source_key, source]))
  const resolveSource = (key: string) => sourceMap.get(key) ?? null
  const byType = (types: WorldHistoryEntity["entity_type"][]) =>
    bundle.entities.filter((item) => types.includes(item.entity_type))

  const sourceKeys = [...new Set([
    ...bundle.overview.source_keys,
    ...bundle.entities.flatMap((item) => item.source_keys),
    ...bundle.relationships.flatMap((item) => item.source_keys),
  ])]
  const names = new Map(bundle.entities.map((item) => [item.seed_id, item.canonical_name]))
  const entityQualityRows = bundle.entities.map((entity) => ({ entity, quality: getDraftEntityQuality(entity, resolveSource) }))
  const relationshipQualityRows = bundle.relationships.map((relationship) => ({ relationship, quality: getDraftRelationshipQuality(relationship, resolveSource) }))
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  const artists = byType(["artist_reference"])
  const recordings = byType(["recording_reference"])
  const landmarks = byType(["studio_landmark"])
  const stableArtistCount = artists.filter((entity) => {
    const ids = entity.metadata.external_ids && typeof entity.metadata.external_ids === "object" ? entity.metadata.external_ids as Record<string, unknown> : {}
    return Boolean(ids.musicbrainz_artist_mbid || ids.wikidata_qid)
  }).length
  const recordingYearCount = recordings.filter((entity) => typeof entity.metadata.release_year === "number").length
  const landmarkIdentityCount = landmarks.filter((entity) => Boolean(entity.metadata.address_text || entity.metadata.external_ids)).length
  const gaps: string[] = []
  if (artists.length > stableArtistCount) gaps.push(`${artists.length - stableArtistCount} artist identities still lack a stable external id`)
  if (recordings.length > recordingYearCount) gaps.push(`${recordings.length - recordingYearCount} recording references still lack a confident release year`)
  if (landmarks.length > landmarkIdentityCount) gaps.push(`${landmarks.length - landmarkIdentityCount} landmarks still lack address/external identity`)
  const lowConfidenceRelationships = bundle.relationships.filter((relationship) => relationship.confidence < 0.8).length
  if (lowConfidenceRelationships) gaps.push(`${lowConfidenceRelationships} graph relationships remain below 0.80 confidence`)
  gaps.push("current popularity signals not seeded", "live event/venue signals not seeded", "radio/playback rights not seeded")
  const bestOf = (type: WorldHistoryEntity["entity_type"]) => entityQualityRows
    .filter((row) => row.entity.entity_type === type)
    .sort((a, b) => b.quality.score - a.quality.score || a.entity.canonical_name.localeCompare(b.entity.canonical_name))[0] ?? null
  const chronology = [...bundle.entities].filter((entity) => entity.start_year !== null).sort((a,b) => (a.start_year ?? 9999)-(b.start_year ?? 9999) || a.canonical_name.localeCompare(b.canonical_name))
  const suggestedExplorePath: DraftWorldHistoryProjection["suggestedExplorePath"] = []
  if (chronology[0]) suggestedExplorePath.push({ role: "start_with_history", seedId: chronology[0].seed_id, name: chronology[0].canonical_name, kind: chronology[0].entity_type })
  for (const [role, type] of [["hear_the_signature","sound_signature"],["meet_a_key_artist","artist_reference"],["study_a_recording","recording_reference"],["visit_a_landmark","studio_landmark"]] as const) {
    const row = bestOf(type)
    if (row) suggestedExplorePath.push({ role, seedId: row.entity.seed_id, name: row.entity.canonical_name, kind: row.entity.entity_type, qualityScore: row.quality.score })
  }

  return {
    placePath: bundle.place_path,
    pilotKey: bundle.pilot_key,
    musicalIdentity: bundle.overview.musical_identity,
    timeline: byType(["historical_milestone"]),
    genresAndScenes: byType(["genre", "scene", "movement", "tradition", "educational_topic"]),
    instruments: byType(["instrument"]),
    soundSignatures: byType(["sound_signature"]),
    notableArtists: byType(["artist_reference"]),
    notableRecordings: byType(["recording_reference"]),
    landmarks: byType(["studio_landmark"]),
    relationships: bundle.relationships.map((relation) => ({
      subjectSeedId: relation.subject_seed_id,
      subjectName: names.get(relation.subject_seed_id) ?? relation.subject_seed_id,
      relationKey: relation.relation_key,
      objectSeedId: relation.object_seed_id,
      objectName: names.get(relation.object_seed_id) ?? relation.object_seed_id,
      sourceKeys: relation.source_keys,
      confidence: relation.confidence,
      metadata: relation.metadata,
    })),
    provenance: { sourceKeys, reviewed: false },
    quality: {
      averageEntityQuality: average(entityQualityRows.map((row) => row.quality.score)),
      averageRelationshipQuality: average(relationshipQualityRows.map((row) => row.quality.score)),
      corroboratedEntityRate: entityQualityRows.length ? average(entityQualityRows.map((row) => row.quality.corroboratedAcrossDomains ? 1 : 0)) : 0,
      stableArtistIdentityRate: artists.length ? stableArtistCount / artists.length : 1,
      recordingYearCoverage: recordings.length ? recordingYearCount / recordings.length : 1,
      landmarkIdentityCoverage: landmarks.length ? landmarkIdentityCount / landmarks.length : 1,
      gaps,
    },
    suggestedExplorePath,
  }
}
