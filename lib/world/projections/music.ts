/**
 * P7 — Track & Release geography domain rules.
 *
 * Core invariants:
 * - Music geography is OPTIONAL and EXPLICIT only. It is never inferred from
 *   the artist's base location (P7-T03).
 * - Release→track inheritance is visible and overridable (P7-T04): an
 *   explicit track fact always wins; inherited values are marked as such.
 * - Moderation/publication state gates PUBLIC exposure (P7-T06); failed or
 *   unpublished music keeps its geography internal regardless of content.
 */
import type { EntityKind } from "@/lib/world/contracts/v1"

export type MusicGeoRelationKey =
  | "recorded_in"
  | "written_in"
  | "produced_in"
  | "released_from"

export const MUSIC_GEO_RELATION_KEYS: readonly MusicGeoRelationKey[] = [
  "recorded_in",
  "written_in",
  "produced_in",
  "released_from",
]

/** P7-T05 provenance origins for music metadata. */
export type MusicGeoOrigin =
  | "creator_entered"
  | "distributor_provider"
  | "editorial"

export interface MusicGeoFactInput {
  entityKind: Extract<EntityKind, "track" | "release">
  entityId: string
  relationKey: MusicGeoRelationKey
  placeId: string
  origin: MusicGeoOrigin
}

export class MusicGeoRuleError extends Error {}

/**
 * P7-T03 — hard block: artist base location is never a valid source for a
 * music-geo fact. Callers that find themselves passing an artist base place
 * here have an inference bug upstream; fail loudly.
 */
export function validateMusicGeoFact(
  input: MusicGeoFactInput,
  opts?: { isArtistBasePlace?: boolean },
): void {
  if (!(MUSIC_GEO_RELATION_KEYS as readonly string[]).includes(input.relationKey)) {
    throw new MusicGeoRuleError(`unknown music relation ${input.relationKey}`)
  }
  if (!input.placeId) throw new MusicGeoRuleError("placeId required")
  if (opts?.isArtistBasePlace) {
    throw new MusicGeoRuleError(
      "music geography must not be inferred from the artist base location (P7-T03)",
    )
  }
  if (!["creator_entered", "distributor_provider", "editorial"].includes(input.origin)) {
    throw new MusicGeoRuleError(`unsupported origin ${input.origin}`)
  }
}

// ─── P7-T04 release→track inheritance ────────────────────────────────────

export interface GeoFactValue {
  placeId: string
  origin: MusicGeoOrigin
}

export interface InheritedGeoValue extends GeoFactValue {
  /** True when the value came from the parent release, not the track itself. */
  inheritedFromRelease: boolean
}

/**
 * Merge rule: track-explicit wins per relation key; missing keys inherit from
 * the release and are visibly flagged as inherited so UI can offer an override.
 */
export function applyReleaseInheritance(
  trackFacts: Partial<Record<MusicGeoRelationKey, GeoFactValue>>,
  releaseFacts: Partial<Record<MusicGeoRelationKey, GeoFactValue>>,
): Record<MusicGeoRelationKey, InheritedGeoValue> {
  const out = {} as Record<MusicGeoRelationKey, InheritedGeoValue>
  for (const key of MUSIC_GEO_RELATION_KEYS) {
    const trackValue = trackFacts[key]
    if (trackValue) {
      out[key] = { ...trackValue, inheritedFromRelease: false }
    } else if (releaseFacts[key]) {
      out[key] = { ...releaseFacts[key], inheritedFromRelease: true }
    }
  }
  return out
}

// ─── P7-T06 moderation/publication gate ──────────────────────────────────

export type PublicationState = "draft" | "published" | "retired"
export type ModerationStatus = "pending" | "approved" | "rejected" | "flagged"

/**
 * Public exposure requires BOTH published AND approved moderation.
 * Everything else stays internal (World responses omit the fields entirely).
 */
export function canExposeMusicGeography(
  publicationState: PublicationState,
  moderationStatus: ModerationStatus,
): boolean {
  return publicationState === "published" && moderationStatus === "approved"
}
