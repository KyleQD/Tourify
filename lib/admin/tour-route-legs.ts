/**
 * ROUTE-301 — Pure helpers for normalized tour route leg generation.
 *
 * Legs are generated deterministically from an ordered stop list.
 * Existing legs with approved overrides or linked bookings are preserved.
 * Constraints prevent orphan legs (FK cascade handles deletions in DB).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TourLegTransportMode =
  | "drive"
  | "fly"
  | "rail"
  | "ferry"
  | "bus"
  | "walk"
  | "other"

export const TOUR_LEG_TRANSPORT_MODES: readonly TourLegTransportMode[] = [
  "drive",
  "fly",
  "rail",
  "ferry",
  "bus",
  "walk",
  "other",
]

export interface TourRouteLegStop {
  id: string
  ordinal: number
  name: string
  local_date?: string | null
  stop_type?: string | null
}

export interface TourRouteLegOverride {
  distance_km?: number | null
  duration_minutes?: number | null
  reason?: string | null
  /** Presence of approvedBy signals override is in effect. */
  approvedBy?: string | null
  approvedAt?: string | null
}

export interface TourRouteLegBooking {
  transport_booking_id?: string | null
}

export interface TourRouteLeg {
  /** Stable DB id — null for newly generated (not yet persisted). */
  id: string | null
  tour_version_id: string
  tour_id: string
  org_id: string
  from_stop_id: string
  to_stop_id: string
  from_ordinal: number
  to_ordinal: number
  transport_mode: TourLegTransportMode
  distance_km: number | null
  duration_minutes: number | null
  buffer_minutes: number
  provider: string | null
  provider_version: string | null
  calculated_at: string | null
  override: TourRouteLegOverride | null
  transport_booking_id: string | null
  has_conflict: boolean
  conflict_codes: string[]
  source: "auto" | "manual"
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class TourRouteLegError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "TourRouteLegError"
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// Core generation helpers
// ---------------------------------------------------------------------------

/**
 * Generate the canonical set of route legs for an ordered stop list.
 *
 * For each consecutive pair of active stops (ordinal[i], ordinal[i+1])
 * we emit one leg. Non-consecutive ordinal jumps (e.g. after a detach)
 * still produce legs for the adjacent pair in the active stop sequence.
 *
 * Rules:
 *  - Stops must have unique ordinals; throws on duplicates.
 *  - Stop list is sorted by ordinal before pairing.
 *  - A single-stop tour produces zero legs.
 */
export function generateRouteLegPairs(args: {
  stops: TourRouteLegStop[]
}): Array<{ fromStop: TourRouteLegStop; toStop: TourRouteLegStop }> {
  const stops = [...args.stops].sort((a, b) => a.ordinal - b.ordinal)

  // Validate unique ordinals
  const seen = new Set<number>()
  for (const stop of stops) {
    if (seen.has(stop.ordinal)) {
      throw new TourRouteLegError(
        "duplicate_ordinal",
        `Duplicate ordinal ${stop.ordinal} in stop list — regeneration aborted.`,
      )
    }
    seen.add(stop.ordinal)
  }

  const pairs: Array<{ fromStop: TourRouteLegStop; toStop: TourRouteLegStop }> = []
  for (let i = 0; i < stops.length - 1; i++) {
    pairs.push({ fromStop: stops[i], toStop: stops[i + 1] })
  }
  return pairs
}

/**
 * Merge a freshly generated leg set with the existing persisted legs,
 * preserving approved overrides and linked bookings.
 *
 * Merge logic per pair (fromStopId, toStopId):
 *  1. If an existing leg has an approved override → keep override fields.
 *  2. If an existing leg has a transport_booking_id → keep it.
 *  3. Otherwise use provided defaults (distance/duration from provider, etc.).
 *
 * Returns legs ready to upsert (id=null for new).
 */
export function mergeRouteLegSet(args: {
  tourVersionId: string
  tourId: string
  orgId: string
  generatedPairs: Array<{ fromStop: TourRouteLegStop; toStop: TourRouteLegStop }>
  existingLegs: TourRouteLeg[]
  defaultTransportMode?: TourLegTransportMode
}): TourRouteLeg[] {
  const existingByPair = new Map<string, TourRouteLeg>()
  for (const leg of args.existingLegs) {
    const key = `${leg.from_stop_id}:${leg.to_stop_id}`
    existingByPair.set(key, leg)
  }

  return args.generatedPairs.map(({ fromStop, toStop }) => {
    const key = `${fromStop.id}:${toStop.id}`
    const existing = existingByPair.get(key)

    const hasApprovedOverride = Boolean(existing?.override?.approvedBy)
    const hasBooking = Boolean(existing?.transport_booking_id)

    return {
      id: existing?.id ?? null,
      tour_version_id: args.tourVersionId,
      tour_id: args.tourId,
      org_id: args.orgId,
      from_stop_id: fromStop.id,
      to_stop_id: toStop.id,
      from_ordinal: fromStop.ordinal,
      to_ordinal: toStop.ordinal,
      transport_mode: existing?.transport_mode ?? args.defaultTransportMode ?? "drive",
      // Preserve provider values from existing or null for new
      distance_km: hasApprovedOverride
        ? (existing?.distance_km ?? null)
        : (existing?.distance_km ?? null),
      duration_minutes: hasApprovedOverride
        ? (existing?.duration_minutes ?? null)
        : (existing?.duration_minutes ?? null),
      buffer_minutes: existing?.buffer_minutes ?? 0,
      provider: existing?.provider ?? null,
      provider_version: existing?.provider_version ?? null,
      calculated_at: existing?.calculated_at ?? null,
      // Preserve approved override
      override: hasApprovedOverride ? (existing?.override ?? null) : null,
      // Preserve linked booking
      transport_booking_id: hasBooking ? (existing?.transport_booking_id ?? null) : null,
      has_conflict: existing?.has_conflict ?? false,
      conflict_codes: existing?.conflict_codes ?? [],
      source: "auto",
    } satisfies TourRouteLeg
  })
}

// ---------------------------------------------------------------------------
// Override helpers
// ---------------------------------------------------------------------------

/**
 * Apply an approved override to an existing leg.
 * Requires approvedBy to mark the override as in-effect.
 */
export function applyRouteLegOverride(
  leg: TourRouteLeg,
  override: {
    distance_km?: number | null
    duration_minutes?: number | null
    reason: string
    approvedBy: string
    approvedAt: string
  },
): TourRouteLeg {
  if (!override.approvedBy?.trim()) {
    throw new TourRouteLegError("override_requires_approval", "Override requires an approvedBy user id.")
  }
  if (!override.reason?.trim()) {
    throw new TourRouteLegError("override_requires_reason", "Override requires a reason.")
  }
  return {
    ...leg,
    override: {
      distance_km: override.distance_km ?? null,
      duration_minutes: override.duration_minutes ?? null,
      reason: override.reason,
      approvedBy: override.approvedBy,
      approvedAt: override.approvedAt,
    },
  }
}

/**
 * Clear an approved override — returns the leg to provider/auto values.
 */
export function clearRouteLegOverride(leg: TourRouteLeg): TourRouteLeg {
  return { ...leg, override: null }
}

/**
 * Resolve the effective distance/duration for a leg:
 * if override.approvedBy is set, use override values; otherwise provider values.
 */
export function resolveEffectiveLegValues(leg: TourRouteLeg): {
  distance_km: number | null
  duration_minutes: number | null
  source: "override" | "provider" | "none"
} {
  if (leg.override?.approvedBy) {
    return {
      distance_km: leg.override.distance_km ?? null,
      duration_minutes: leg.override.duration_minutes ?? null,
      source: "override",
    }
  }
  if (leg.distance_km != null || leg.duration_minutes != null) {
    return {
      distance_km: leg.distance_km,
      duration_minutes: leg.duration_minutes,
      source: "provider",
    }
  }
  return { distance_km: null, duration_minutes: null, source: "none" }
}

// ---------------------------------------------------------------------------
// Orphan detection (pre-persist validation)
// ---------------------------------------------------------------------------

/**
 * Validate that all legs in the set reference stop IDs that exist in the
 * given active stop list. Returns orphaned leg keys for caller to handle.
 *
 * In the database this is enforced by FK cascade, but calling this helper
 * before an upsert catches programming errors early.
 */
export function detectOrphanLegs(args: {
  legs: TourRouteLeg[]
  activeStopIds: Set<string>
}): string[] {
  const orphans: string[] = []
  for (const leg of args.legs) {
    if (!args.activeStopIds.has(leg.from_stop_id) || !args.activeStopIds.has(leg.to_stop_id)) {
      orphans.push(`${leg.from_stop_id}:${leg.to_stop_id}`)
    }
  }
  return orphans
}

/**
 * Summary of a generated leg set for UI/logging.
 */
export function summarizeRouteLegSet(legs: TourRouteLeg[]): {
  total: number
  withOverride: number
  withBooking: number
  withConflict: number
  newLegs: number
  existingLegs: number
} {
  return {
    total: legs.length,
    withOverride: legs.filter((l) => Boolean(l.override?.approvedBy)).length,
    withBooking: legs.filter((l) => Boolean(l.transport_booking_id)).length,
    withConflict: legs.filter((l) => l.has_conflict).length,
    newLegs: legs.filter((l) => l.id === null).length,
    existingLegs: legs.filter((l) => l.id !== null).length,
  }
}
