/**
 * P19-T01 — transmission relation subtypes + presentation rules (frozen).
 *
 * Every visible cross-region claim must declare WHO influenced WHOM
 * (explicit direction), WHEN (temporal context), and WHY WE KNOW (sources).
 * Nuanced influence is never flattened into symmetric relationships.
 */

export const TRANSMISSION_SUBTYPES = [
  "migration_diaspora",
  "touring_exchange",
  "radio_broadcast",
  "technology_transfer",
  "scene_influence",
  "genre_evolution",
] as const

export type TransmissionSubtype = (typeof TRANSMISSION_SUBTYPES)[number]

/**
 * Culturally sensitive claims (who influenced whom across cultures) demand
 * stronger evidence: more sources and higher confidence before review.
 */
const SENSITIVE: ReadonlySet<TransmissionSubtype> = new Set([
  "migration_diaspora",
  "scene_influence",
])

export function isSensitiveSubtype(subtype: TransmissionSubtype): boolean {
  return SENSITIVE.has(subtype)
}

/** Minimum evidence per subtype. */
export const SUBTYPE_EVIDENCE_RULES: Readonly<
  Record<TransmissionSubtype, { minSources: number; minConfidence: number }>
> = Object.freeze({
  migration_diaspora: { minSources: 2, minConfidence: 0.75 },
  touring_exchange: { minSources: 1, minConfidence: 0.6 },
  radio_broadcast: { minSources: 1, minConfidence: 0.6 },
  technology_transfer: { minSources: 2, minConfidence: 0.7 },
  scene_influence: { minSources: 2, minConfidence: 0.75 },
  genre_evolution: { minSources: 1, minConfidence: 0.7 },
})

/** Presentation rule: arcs are aggressively capped to keep the globe readable. */
export const ARC_CLUTTER_LIMITS = {
  /** Maximum arcs drawn at once on any surface. */
  globalViewMax: 12,
  /** Maximum arcs originating from one place in a single rendering. */
  perPlaceMax: 4,
} as const
