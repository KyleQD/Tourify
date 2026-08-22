import qualityModel from "@/data/world/reference/quality-model.json"
import { getSeedSourceByKey } from "./static-reference-data"
import type { WorldHistoryEntity, WorldHistorySource } from "./contracts"

export interface DraftQualityScore {
  score: number
  band: "strong_basis" | "solid_basis" | "developing" | "thin"
  confidence: number
  metadataCompleteness: number
  sourceCount: number
  distinctDomains: number
  domains: string[]
  sourceTypes: string[]
  authorities: string[]
  authorityScore: number
  diversityScore: number
  provenanceIntegrity: number
  corroboratedAcrossDomains: boolean
  publicationEligible: false
  blockers: string[]
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000
}

function domainFor(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

function readinessBand(score: number): DraftQualityScore["band"] {
  const bands = qualityModel.readiness_bands
  if (score >= bands.strong_basis) return "strong_basis"
  if (score >= bands.solid_basis) return "solid_basis"
  if (score >= bands.developing) return "developing"
  return "thin"
}

function metadataCompleteness(entity: WorldHistoryEntity): number {
  const metadata = entity.metadata as Record<string, unknown>
  if (entity.entity_type === "artist_reference") {
    const ids = metadata.external_ids && typeof metadata.external_ids === "object"
      ? metadata.external_ids as Record<string, unknown>
      : {}
    const stable = [ids.musicbrainz_artist_mbid, ids.wikidata_qid].filter(Boolean).length
    return Math.min(1, 0.55 + stable * 0.225)
  }
  if (entity.entity_type === "recording_reference") {
    const hints = metadata.provider_lookup_hints && typeof metadata.provider_lookup_hints === "object"
      ? metadata.provider_lookup_hints as Record<string, unknown>
      : {}
    const checks = [
      Boolean(metadata.artist_name), Boolean(metadata.title), typeof metadata.release_year === "number",
      Boolean(hints.query), Array.isArray(metadata.credit_components) && metadata.credit_components.length > 0,
      Boolean(metadata.rights_status),
    ]
    return checks.filter(Boolean).length / checks.length
  }
  if (entity.entity_type === "instrument") {
    const checks = [Boolean(metadata.instrument_family), Boolean(metadata.sound_role), Array.isArray(metadata.listen_for) && metadata.listen_for.length > 0, Boolean(metadata.audio_policy)]
    return checks.filter(Boolean).length / checks.length
  }
  if (entity.entity_type === "sound_signature") {
    const checks = [Array.isArray(metadata.listen_for) && metadata.listen_for.length > 0, Boolean(metadata.audio_policy), Boolean(metadata.techniques || metadata.context)]
    return checks.filter(Boolean).length / checks.length
  }
  if (entity.entity_type === "studio_landmark") {
    const externalIds = metadata.external_ids && typeof metadata.external_ids === "object" ? metadata.external_ids : null
    const checks = [Boolean(metadata.landmark_type), Boolean(metadata.address_text || externalIds), Boolean(metadata.media_policy)]
    return checks.filter(Boolean).length / checks.length
  }
  return 1
}

export type WorldHistorySourceResolver = (key: string) => WorldHistorySource | null

export function getDraftEntityQuality(
  entity: WorldHistoryEntity,
  resolveSource: WorldHistorySourceResolver = getSeedSourceByKey,
): DraftQualityScore {
  const refs = entity.source_keys.map(resolveSource).filter(Boolean)
  const domains = Array.from(new Set(refs.map((source) => domainFor(source?.url)).filter((value): value is string => Boolean(value)))).sort()
  const sourceTypes = Array.from(new Set(refs.map((source) => source?.source_type ?? "unknown"))).sort()
  const authorities = Array.from(new Set(refs.map((source) => source?.authority ?? "unknown"))).sort()
  const authorityWeights = qualityModel.authority_weights as Record<string, number>
  const authorityScore = refs.length
    ? refs.reduce((sum, source) => sum + (authorityWeights[source?.authority ?? ""] ?? 0.65), 0) / refs.length
    : 0
  const diversityScore = Math.min(1, domains.length / 2)
  const provenanceIntegrity = refs.length === entity.source_keys.length && entity.source_keys.length > 0 ? 1 : 0
  const completeness = metadataCompleteness(entity)
  const weights = qualityModel.weights
  const score = clamp(
    entity.confidence * weights.confidence +
    authorityScore * weights.source_authority +
    diversityScore * weights.source_diversity +
    completeness * weights.metadata_completeness +
    provenanceIntegrity * weights.provenance_integrity,
  )
  const blockers = ["editorial_review_required"]
  if (entity.entity_type === "recording_reference" && entity.metadata.rights_status !== "cleared") blockers.push("playback_rights_unresolved")
  if (entity.entity_type === "artist_reference") {
    const ids = entity.metadata.external_ids && typeof entity.metadata.external_ids === "object"
      ? entity.metadata.external_ids as Record<string, unknown>
      : {}
    if (!ids.musicbrainz_artist_mbid && !ids.wikidata_qid) blockers.push("stable_external_identity_missing")
  }
  return {
    score: round4(score), band: readinessBand(score), confidence: round4(entity.confidence), metadataCompleteness: round4(completeness),
    sourceCount: refs.length, distinctDomains: domains.length, domains, sourceTypes, authorities,
    authorityScore: round4(authorityScore), diversityScore: round4(diversityScore), provenanceIntegrity: round4(provenanceIntegrity),
    corroboratedAcrossDomains: domains.length >= 2, publicationEligible: false, blockers,
  }
}

export function getDraftRelationshipQuality(
  input: { confidence: number; source_keys: string[] },
  resolveSource: WorldHistorySourceResolver = getSeedSourceByKey,
) {
  const refs = input.source_keys.map(resolveSource).filter(Boolean)
  const domains = Array.from(new Set(refs.map((source) => domainFor(source?.url)).filter((value): value is string => Boolean(value)))).sort()
  const sourceTypes = Array.from(new Set(refs.map((source) => source?.source_type ?? "unknown"))).sort()
  const authorities = Array.from(new Set(refs.map((source) => source?.authority ?? "unknown"))).sort()
  const authorityWeights = qualityModel.authority_weights as Record<string, number>
  const authorityScore = refs.length
    ? refs.reduce((sum, source) => sum + (authorityWeights[source?.authority ?? ""] ?? 0.65), 0) / refs.length
    : 0
  const diversityScore = Math.min(1, domains.length / 2)
  const provenanceIntegrity = refs.length === input.source_keys.length && input.source_keys.length > 0 ? 1 : 0
  const score = clamp(input.confidence * 0.35 + authorityScore * 0.25 + diversityScore * 0.25 + provenanceIntegrity * 0.15)
  return {
    score: round4(score), band: readinessBand(score), confidence: round4(input.confidence),
    sourceCount: refs.length, distinctDomains: domains.length, domains, sourceTypes, authorities,
    authorityScore: round4(authorityScore), diversityScore: round4(diversityScore), provenanceIntegrity: round4(provenanceIntegrity),
    corroboratedAcrossDomains: domains.length >= 2, publicationEligible: false as const, blockers: ["editorial_review_required"],
  }
}
