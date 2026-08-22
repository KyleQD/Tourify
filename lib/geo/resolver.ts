import {
  CONFIDENCE,
  needsReview,
} from "./confidence"
import { normalizeHierarchy, normalizeSearchKey, validateCoordinates } from "./normalize"
import type { GeoRepository } from "./repository"
import type {
  GeoPlaceRow,
  ResolvePlaceInput,
  ResolvePlaceResult,
  ResolvedPlaceCandidate,
} from "./types"

function candidateFrom(
  place: GeoPlaceRow,
  confidence: number,
  matchMethod: ResolvedPlaceCandidate["matchMethod"],
  reasons: string[],
  distanceMeters?: number | null
): ResolvedPlaceCandidate {
  return {
    placeId: place.id,
    canonicalPath: place.canonical_path,
    name: place.name,
    placeType: place.place_type,
    countryCode: place.country_code,
    confidence: Math.min(confidence, CONFIDENCE.FUZZY_CANDIDATE_CAP),
    matchMethod,
    distanceMeters: distanceMeters ?? null,
    reasons,
  }
}

function unresolvedResult(
  normalized: ResolvePlaceResult["normalizedInput"],
  candidates: ResolvedPlaceCandidate[],
  reason: string
): ResolvePlaceResult {
  const ranked = [...candidates].sort((a, b) => b.confidence - a.confidence)
  return {
    placeId: null,
    canonicalPath: null,
    canonicalLabel: null,
    confidence: ranked.length > 0 ? ranked[0].confidence : 0,
    matchMethod: "unresolved",
    needsReview: true,
    candidates: ranked.map((candidate) => ({
      ...candidate,
      reasons: [...candidate.reasons, reason],
    })),
    normalizedInput: normalized,
  }
}

/**
 * Server-side canonical place resolution. Read-only by design: a resolver
 * call never creates geo_places rows, aliases, or mappings
 * (GEO_RESOLVER_CONTRACT_V0_1 section 10).
 */
export async function resolvePlace(
  input: ResolvePlaceInput,
  repository: GeoRepository
): Promise<ResolvePlaceResult> {
  const hierarchy = normalizeHierarchy(input.hierarchy)
  const coordinates = validateCoordinates(input.coordinates)
  const freeText =
    typeof input.freeText === "string" && input.freeText.trim().length > 0
      ? input.freeText.replace(/\s+/g, " ").trim()
      : null

  const normalized = { hierarchy, freeText, coordinates }
  let ambiguousHierarchyRows: GeoPlaceRow[] = []
  // Defense in depth: even a visibility-lax repository must not leak draft
  // places through public resolution.
  const publishedOnly = (rows: GeoPlaceRow[]): GeoPlaceRow[] =>
    input.includeDraft === true ? rows : rows.filter((row) => row.publication_status === "published")

  // Step 2 — external identity is the strongest signal and short-circuits.
  for (const ref of input.externalReferences ?? []) {
    if (!ref?.provider || !ref?.externalId) continue
    const place = await repository.findByExternalReference(ref, {
      includeDraft: input.includeDraft === true,
    })
    if (place) {
      return {
        placeId: place.id,
        canonicalPath: place.canonical_path,
        canonicalLabel: place.display_name ?? place.name,
        confidence: CONFIDENCE.EXTERNAL_ID,
        matchMethod: "external_id",
        needsReview: false,
        candidates: [],
        normalizedInput: normalized,
      }
    }
  }

  // Step 3 — exact hierarchy, most specific first. A name shared by several
  // canonical places (Springfield problem) resolves only when context makes
  // it unique; otherwise it becomes review candidates, never a guess.
  if (hierarchy) {
    const rows = publishedOnly(
      await repository.findHierarchyCandidates(hierarchy, {
        includeDraft: input.includeDraft === true,
        preferredTypes: input.preferredTypes,
      })
    )
    const levelNames = [
      hierarchy.neighborhood,
      hierarchy.city,
      hierarchy.admin1,
      hierarchy.country,
    ]
    for (const level of levelNames) {
      const key = normalizeSearchKey(level)
      if (!key) continue
      const atLevel = rows.filter(
        (row) =>
          normalizeSearchKey(row.name) === key &&
          (!input.preferredTypes ||
            input.preferredTypes.includes(row.place_type as never))
      )
      if (atLevel.length === 1) {
        const place = atLevel[0]
        const contextStrong = Boolean(hierarchy.countryCode || place.country_code)
        const confidence = contextStrong
          ? CONFIDENCE.HIERARCHY_EXACT_WITH_COUNTRY
          : CONFIDENCE.HIERARCHY_EXACT_WITHOUT_COUNTRY
        return {
          placeId: place.id,
          canonicalPath: place.canonical_path,
          canonicalLabel: place.display_name ?? place.name,
          confidence,
          matchMethod: "hierarchy_exact",
          needsReview: needsReview(confidence, "hierarchy_exact"),
          candidates: [],
          normalizedInput: normalized,
        }
      }
      if (atLevel.length > 1) {
        ambiguousHierarchyRows = atLevel
        break
      }
    }
  }

  // Step 4 — exact alias constrained by whatever context we have.
  const aliasSource =
    freeText ?? [hierarchy?.neighborhood, hierarchy?.city].find(Boolean) ?? null
  if (aliasSource) {
    const aliasRows = publishedOnly(
      await repository.findExactAlias(aliasSource, {
        includeDraft: input.includeDraft === true,
      })
    )
    if (aliasRows.length === 1) {
      const place = aliasRows[0]
      const confidence = CONFIDENCE.ALIAS_EXACT_STRONG_CONTEXT
      return {
        placeId: place.id,
        canonicalPath: place.canonical_path,
        canonicalLabel: place.display_name ?? place.name,
        confidence,
        matchMethod: "alias_exact",
        needsReview: needsReview(confidence, "alias_exact"),
        candidates: [],
        normalizedInput: normalized,
      }
    }
    if (aliasRows.length > 1) {
      return unresolvedResult(
        normalized,
        aliasRows.map((row) =>
          candidateFrom(row, CONFIDENCE.ALIAS_EXACT_STRONG_CONTEXT - 0.05, "fuzzy_candidate", [
            "alias matched multiple places; parent context required",
          ])
        ),
        "ambiguous alias"
      )
    }
  }

  // Step 5 — coordinates validate only with corroborating context. A point
  // alone never proves administrative containment in v0.1, and the default
  // repository cannot rank distance yet, so coordinate-only inputs fall
  // through to conservative unresolved diagnostics.
  if (coordinates && !hierarchy && !freeText) {
    const nearby = publishedOnly(
      await repository
        .findNearbyCandidates(coordinates, { includeDraft: input.includeDraft === true })
        .catch(() => [])
    ).map((hit) => ({ place: hit.place, distanceMeters: hit.distanceMeters }))
    const candidates = nearby.map((hit) =>
      candidateFrom(
        hit.place,
        CONFIDENCE.COORDINATES_VALIDATED,
        "coordinates_validated",
        ["nearby candidate requires hierarchy corroboration before persistence"],
        hit.distanceMeters
      )
    )
    return unresolvedResult(normalized, candidates, "coordinate-only input")
  }

  // Step 6 — free text: exact normalized name first, fuzzy candidates after.
  // Fuzzy matches are never auto-created as canonical places.
  if (freeText) {
    const textRows = publishedOnly(
      await repository
        .findTextCandidates(freeText, { includeDraft: input.includeDraft === true })
        .catch(() => [])
    )
    const key = normalizeSearchKey(freeText)
    const exact = textRows.filter((row) => normalizeSearchKey(row.name) === key)
    if (exact.length === 1) {
      const place = exact[0]
      return {
        placeId: null,
        canonicalPath: null,
        canonicalLabel: null,
        confidence: CONFIDENCE.TEXT_EXACT,
        matchMethod: "text_exact",
        needsReview: true,
        candidates: [
          candidateFrom(place, CONFIDENCE.TEXT_EXACT, "text_exact", [
            "exact name match without hierarchy/external context",
          ]),
        ],
        normalizedInput: normalized,
      }
    }
    return unresolvedResult(
      normalized,
      textRows.slice(0, 10).map((row) =>
        candidateFrom(row, CONFIDENCE.TEXT_EXACT, "fuzzy_candidate", ["weak text candidate"])
      ),
      "no confident textual match"
    )
  }

  return unresolvedResult(
    normalized,
    ambiguousHierarchyRows.map((row) =>
      candidateFrom(
        row,
        CONFIDENCE.HIERARCHY_EXACT_WITHOUT_COUNTRY - 0.05,
        "fuzzy_candidate",
        ["hierarchy name matched multiple places; country/admin context required"]
      )
    ),
    "unresolved"
  )
}

/**
 * Batch path for ingestion/backfills. v0.1 deduplicates identical inputs per
 * request; persistent caching waits for correctness metrics
 * (GEO_RESOLVER_CONTRACT_V0_1 section 11).
 */
export async function resolvePlacesBatch(
  inputs: ResolvePlaceInput[],
  repository: GeoRepository
): Promise<ResolvePlaceResult[]> {
  const dedupe = new Map<string, Promise<ResolvePlaceResult>>()
  return Promise.all(
    inputs.map((input) => {
      const key = JSON.stringify([
        input.coordinates ?? null,
        input.hierarchy ?? null,
        input.freeText ?? null,
        input.externalReferences ?? [],
        input.includeDraft === true,
      ])
      let pending = dedupe.get(key)
      if (!pending) {
        pending = resolvePlace(input, repository)
        dedupe.set(key, pending)
      }
      return pending
    })
  )
}
