/**
 * World Core Contracts v1.1 — FROZEN (P2; v1.1 adds venue_place|located_in for P5).
 *
 * Source of truth for relation types, entity kinds, visibility levels,
 * confidence semantics, and lifecycle states. Everything here is fail-closed:
 * unknown values must be rejected, never coerced.
 *
 * Freeze rules (WORLD_CONTRACTS_V1.md):
 * - Additions require a new minor version + DECISION_LOG entry.
 * - Removals/renames require a major version + alias map.
 * - No adapter may invent values outside these registries.
 */

// ─── Relation domains ─────────────────────────────────────────────────────

export const RELATION_DOMAINS = [
  "venue_place",
  "artist_place",
  "cultural_place",
  "cultural_graph",
  "track_place",
  "radio_place",
  // P2 newly required (frozen for Wave-2 projectors; seeded via governed
  // migrations when each projector lands — never client-invented).
  "event_place",
  "org_place",
  "content_place",
] as const

export type RelationDomain = (typeof RELATION_DOMAINS)[number]

// ─── Relation keys per domain ─────────────────────────────────────────────

/** Retained from Migration B seed (world_relation_types). */
export const RETAINED_RELATION_KEYS = {
  venue_place: [], // located_in is newly required below (v1.1)
  artist_place: [
    "active_in",
    "associated_with",
    "based_in",
    "born_in",
    "formed_in",
    "originated_in",
  ],
  cultural_place: [
    "associated_with",
    "developed_in",
    "historically_significant_in",
    "originated_in",
    "practiced_in",
  ],
  cultural_graph: [
    "credited_to",
    "evolved_from",
    "influenced_by",
    "part_of",
    "related_to",
    "uses_instrument",
  ],
  track_place: [
    "associated_with",
    "produced_in",
    "recorded_in",
    "released_from",
    "written_in",
  ],
  radio_place: ["associated_with", "broadcasts_from", "serves"],
} as const

/** Newly required by the suite freeze (P2-T02) and P5 (v1.1). */
export const NEW_RELATION_KEYS = {
  venue_place: ["located_in"],
  event_place: ["occurs_in"],
  org_place: ["headquartered_in", "associated_with"],
  content_place: ["about_place", "associated_with"],
  artist_place_new: [],
  ranking: ["popular_in"],
} as const

export type RelationKey =
  | (typeof RETAINED_RELATION_KEYS)[keyof typeof RETAINED_RELATION_KEYS][number]
  | (typeof NEW_RELATION_KEYS)[keyof typeof NEW_RELATION_KEYS][number]

/** Full frozen registry: domain → allowed relation keys. */
export const RELATION_REGISTRY: Readonly<Record<RelationDomain, readonly string[]>> = Object.freeze({
  venue_place: [...RETAINED_RELATION_KEYS.venue_place, ...NEW_RELATION_KEYS.venue_place],
  artist_place: [
    ...RETAINED_RELATION_KEYS.artist_place,
    ...NEW_RELATION_KEYS.artist_place_new,
  ],
  cultural_place: [...RETAINED_RELATION_KEYS.cultural_place],
  cultural_graph: [...RETAINED_RELATION_KEYS.cultural_graph],
  track_place: [...RETAINED_RELATION_KEYS.track_place],
  radio_place: [...RETAINED_RELATION_KEYS.radio_place],
  event_place: [...NEW_RELATION_KEYS.event_place],
  org_place: [...NEW_RELATION_KEYS.org_place],
  content_place: [...NEW_RELATION_KEYS.content_place],
})

/** Fail-closed validation. Unknown domain or key ⇒ rejected. */
export function isValidRelation(domain: string, key: string): boolean {
  const allowed = (RELATION_REGISTRY as Record<string, readonly string[]>)[domain]
  return Array.isArray(allowed) && allowed.includes(key)
}

// ─── Entity kinds ──────────────────────────────────────────────────────────

export const ENTITY_KINDS = [
  "artist",
  "venue",
  "event",
  "organization",
  "track",
  "release",
  "post",
  "blog_article",
  "press_release",
  "radio_station",
  "cultural_entity",
  "place",
] as const

export type EntityKind = (typeof ENTITY_KINDS)[number]

/** Operational table(s) allowed to project each kind (P2-T03). */
export const PROJECTABLE_SOURCES: Readonly<
  Record<EntityKind, readonly string[]>
> = Object.freeze({
  artist: ["artist_profiles"],
  venue: ["venues_v2", "venue_profiles"],
  event: ["events_v2"],
  organization: ["organizer_accounts"],
  track: ["artist_music"],
  release: ["artist_music"],
  post: ["posts"],
  blog_article: ["artist_blog_posts"],
  press_release: ["posts"],
  radio_station: ["world_radio_stations"],
  cultural_entity: ["world_cultural_entities"],
  place: ["geo_places"],
})

export function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value)
}

export function canProject(kind: EntityKind, table: string): boolean {
  return (PROJECTABLE_SOURCES[kind] ?? []).includes(table)
}

// ─── Confidence (P2-T04): numeric AND enumerated ──────────────────────────

export type ConfidenceBand = "accept" | "review" | "unresolved"

export const CONFIDENCE_THRESHOLDS = {
  acceptFloor: 0.8,
  unresolvedBelow: 0.65,
} as const

export function confidenceBand(confidence: number): ConfidenceBand {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError(`confidence out of range: ${confidence}`)
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.acceptFloor) return "accept"
  if (confidence >= CONFIDENCE_THRESHOLDS.unresolvedBelow) return "review"
  return "unresolved"
}

// ─── Visibility (P2-T05) ──────────────────────────────────────────────────

export const VISIBILITY_LEVELS = [
  "private",
  "internal",
  "public",
  "aggregate_only",
] as const

export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number]

export function isVisibilityLevel(value: string): value is VisibilityLevel {
  return (VISIBILITY_LEVELS as readonly string[]).includes(value)
}

/** Legal visibility transitions (fail-closed; no silent widening). */
const VISIBILITY_TRANSITIONS: Readonly<
  Record<VisibilityLevel, readonly VisibilityLevel[]>
> = Object.freeze({
  private: ["internal", "public"],
  internal: ["private", "public", "aggregate_only"],
  public: ["internal", "aggregate_only"],
  aggregate_only: ["internal"],
})

export function canTransitionVisibility(
  from: VisibilityLevel,
  to: VisibilityLevel,
): boolean {
  return (VISIBILITY_TRANSITIONS[from] ?? []).includes(to)
}

// ─── Lifecycle states (candidate/review/publication) ─────────────────────

export const LIFECYCLE_REVIEW_STATES = [
  "candidate",
  "needs_review",
  "approved",
  "rejected",
] as const

export const LIFECYCLE_PUBLICATION_STATES = [
  "draft",
  "published",
  "retired",
] as const

export type ReviewState = (typeof LIFECYCLE_REVIEW_STATES)[number]
export type PublicationState = (typeof LIFECYCLE_PUBLICATION_STATES)[number]

const REVIEW_TRANSITIONS: Readonly<Record<ReviewState, readonly ReviewState[]>> =
  Object.freeze({
    candidate: ["needs_review", "rejected"],
    needs_review: ["approved", "rejected", "candidate"],
    approved: ["needs_review"], // reopen path only via governed action
    rejected: ["candidate"], // resubmit path
  })

const PUBLICATION_TRANSITIONS: Readonly<
  Record<PublicationState, readonly PublicationState[]>
> = Object.freeze({
  draft: ["published", "retired"],
  published: ["retired"], // corrections create superseding rows, not edits
  retired: [], // terminal
})

export function canTransitionReview(from: ReviewState, to: ReviewState): boolean {
  return (REVIEW_TRANSITIONS[from] ?? []).includes(to)
}

export function canTransitionPublication(
  from: PublicationState,
  to: PublicationState,
): boolean {
  return (PUBLICATION_TRANSITIONS[from] ?? []).includes(to)
}

/**
 * A publication transition additionally requires approved review state and a
 * reviewer identity — enforced by callers; encoded here as a single check.
 */
export function canPublish(
  reviewStatus: ReviewState,
  from: PublicationState,
  to: PublicationState,
  reviewerId: string | null,
): boolean {
  if (to === "published") {
    return (
      from === "draft" &&
      reviewStatus === "approved" &&
      reviewerId !== null &&
      canTransitionPublication(from, to)
    )
  }
  return canTransitionPublication(from, to)
}
