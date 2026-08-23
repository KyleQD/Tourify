/**
 * P19-T02..T06 — transmission graph domain (pure, deterministic).
 *
 * Edges are directional, source-backed, era-scoped claims between canonical
 * places. Validation fails closed: no sources ⇒ invalid; no temporal
 * context ⇒ invalid; self-loops ⇒ invalid; sensitive subtypes demand
 * stronger evidence. Nothing here is published without review.
 */
import {
  SUBTYPE_EVIDENCE_RULES,
  isSensitiveSubtype,
  type TransmissionSubtype,
} from "./contracts"

export interface TransmissionEdge {
  id: string
  /** Directional: influence/flow moves FROM fromPlaceKey TO toPlaceKey. */
  fromPlaceKey: string
  toPlaceKey: string
  subtype: TransmissionSubtype
  /** Temporal context (P19-T03): at minimum a start year or coarse era. */
  startYear?: number | null
  endYear?: number | null
  era?: string | null
  sourceKeys: readonly string[]
  confidence: number
  reviewStatus: "candidate" | "needs_review" | "approved" | "rejected"
  narrative?: string | null
}

export type EdgeValidation =
  | { ok: true; edge: TransmissionEdge }
  | { ok: false; error: string }

/** Validate one transmission edge against the frozen evidence rules. */
export function validateTransmissionEdge(edge: TransmissionEdge): EdgeValidation {
  if (!edge.id?.trim()) return { ok: false, error: "id_required" }
  if (!edge.fromPlaceKey?.trim() || !edge.toPlaceKey?.trim()) return { ok: false, error: "endpoints_required" }
  if (edge.fromPlaceKey === edge.toPlaceKey) return { ok: false, error: "self_loops_forbidden" }
  if (!(edge.subtype in SUBTYPE_EVIDENCE_RULES)) return { ok: false, error: `unknown_subtype_${String(edge.subtype)}` }
  if (!Array.isArray(edge.sourceKeys) || edge.sourceKeys.length === 0) {
    return { ok: false, error: "sources_required" }
  }
  const hasTemporal = typeof edge.startYear === "number" || Boolean(edge.era?.trim())
  if (!hasTemporal) return { ok: false, error: "temporal_context_required" }
  if (
    typeof edge.startYear === "number" &&
    typeof edge.endYear === "number" &&
    edge.endYear < edge.startYear
  ) {
    return { ok: false, error: "year_range_invalid" }
  }

  const rules = SUBTYPE_EVIDENCE_RULES[edge.subtype]
  const uniqueSources = new Set(edge.sourceKeys).size
  if (uniqueSources < rules.minSources) return { ok: false, error: "insufficient_sources" }
  if (typeof edge.confidence !== "number" || edge.confidence < rules.minConfidence || edge.confidence > 1) {
    return { ok: false, error: "confidence_below_threshold" }
  }
  // Culturally sensitive claims additionally require editorial review state.
  if (isSensitiveSubtype(edge.subtype) && edge.reviewStatus === "candidate") {
    return { ok: false, error: "sensitive_claims_require_review_assignment" }
  }
  return { ok: true, edge }
}

// ─── Place-page sections (P19-T06) ────────────────────────────────────────

export interface PlaceTransmissionSections {
  influencedBy: Array<{ from: string; subtype: TransmissionSubtype; era: string | null; narrative: string | null }>
  influenced: Array<{ to: string; subtype: TransmissionSubtype; era: string | null; narrative: string | null }>
  connectedScenes: Array<{ other: string; via: string[] }>
  migrationStories: Array<{ with: string; direction: "inbound" | "outbound"; era: string | null; narrative: string | null }>
}

/**
 * Derive the four place-page sections from validated edges. Only approved /
 * needs_review edges surface as reviewable content; rejected edges vanish.
 */
export function buildPlaceSections(
  placeKey: string,
  validatedEdges: readonly TransmissionEdge[],
): PlaceTransmissionSections {
  const sections: PlaceTransmissionSections = {
    influencedBy: [],
    influenced: [],
    connectedScenes: [],
    migrationStories: [],
  }
  for (const edge of validatedEdges) {
    if (edge.reviewStatus === "rejected") continue
    const era = edge.era ?? (edge.startYear != null ? String(edge.startYear) : null)
    if (edge.toPlaceKey === placeKey && edge.fromPlaceKey !== placeKey) {
      sections.influencedBy.push({ from: edge.fromPlaceKey, subtype: edge.subtype, era, narrative: edge.narrative ?? null })
      if (edge.subtype === "migration_diaspora") {
        sections.migrationStories.push({ with: edge.fromPlaceKey, direction: "inbound", era, narrative: edge.narrative ?? null })
      }
    } else if (edge.fromPlaceKey === placeKey) {
      sections.influenced.push({ to: edge.toPlaceKey, subtype: edge.subtype, era, narrative: edge.narrative ?? null })
      if (edge.subtype === "migration_diaspora") {
        sections.migrationStories.push({ with: edge.toPlaceKey, direction: "outbound", era, narrative: edge.narrative ?? null })
      }
    }
  }

  // Connected scenes: places sharing an edge partner of any scene-ish flow.
  const partners = new Map<string, Set<string>>()
  for (const edge of validatedEdges) {
    if (edge.reviewStatus === "rejected") continue
    let other: string | null = null
    if (edge.fromPlaceKey === placeKey) other = edge.toPlaceKey
    else if (edge.toPlaceKey === placeKey) other = edge.fromPlaceKey
    if (!other) continue
    const list = partners.get(other) ?? new Set<string>()
    list.add(edge.subtype)
    partners.set(other, list)
  }
  sections.connectedScenes = [...partners.entries()]
    .map(([other, via]) => ({ other, via: [...via].sort() }))
    .sort((a, b) => a.other.localeCompare(b.other))

  return sections
}

// ─── Clutter policy (P19-T07) ─────────────────────────────────────────────

export interface ArcForRendering {
  id: string
  fromPlaceKey: string
  toPlaceKey: string
  subtype: TransmissionSubtype
  startYear?: number | null
  label: string
}

export interface ArcSelectionPolicy {
  subtypeFilter?: ReadonlySet<TransmissionSubtype> | null
  eraFromYear?: number | null
  eraToYear?: number | null
  maxArcs?: number
}

/**
 * Select which arcs may render: newest-first by start year, deterministic
 * tiebreak by id, hard-capped by the clutter budget and per-place ceiling.
 */
export function selectArcsForRendering(
  validatedEdges: readonly TransmissionEdge[],
  policy: ArcSelectionPolicy = {},
): ArcForRendering[] {
  const max = policy.maxArcs ?? 12
  const perPlace = new Map<string, number>()
  const candidates = validatedEdges
    .filter((edge) => edge.reviewStatus !== "rejected")
    .filter((edge) => !policy.subtypeFilter || policy.subtypeFilter.has(edge.subtype))
    .filter((edge) =>
      policy.eraFromYear == null ||
      (typeof edge.startYear === "number" ? edge.startYear >= policy.eraFromYear : true))
    .filter((edge) =>
      policy.eraToYear == null ||
      (typeof edge.startYear === "number" ? edge.startYear <= policy.eraToYear : true))
    .sort(
      (a, b) =>
        (b.startYear ?? -9999) - (a.startYear ?? -9999) || a.id.localeCompare(b.id),
    )

  const chosen: ArcForRendering[] = []
  for (const edge of candidates) {
    if (chosen.length >= max) break
    const fromCount = perPlace.get(edge.fromPlaceKey) ?? 0
    if (fromCount >= 4) continue
    perPlace.set(edge.fromPlaceKey, fromCount + 1)
    chosen.push({
      id: edge.id,
      fromPlaceKey: edge.fromPlaceKey,
      toPlaceKey: edge.toPlaceKey,
      subtype: edge.subtype,
      startYear: edge.startYear ?? null,
      label: `${edge.fromPlaceKey} → ${edge.toPlaceKey} (${edge.subtype}${edge.startYear != null ? `, ${edge.startYear}` : ""})`,
    })
  }
  return chosen
}
