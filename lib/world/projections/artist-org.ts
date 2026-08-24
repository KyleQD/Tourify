/**
 * P6 — Artist & Organization geography domain rules.
 *
 * Identity vs. activity separation (the phase's core invariant):
 * - `based_in` / `headquartered_in` are STABLE identity relations controlled
 *   by the user (or editorial verification). They never change implicitly.
 * - `active_in` is TIME-BOUNDED and DERIVED from verified performances,
 *   residencies, or explicit declarations. It NEVER mutates based_in.
 *
 * Provenance origin tags distinguish user-entered from derived geography.
 */
import type { EntityKind } from "@/lib/world/contracts/v1"

export type GeographyOrigin = "user_entered" | "editorial_verified" | "derived_verified_event"

export interface GeographyFactInput {
  entityKind: Extract<EntityKind, "artist" | "organization">
  entityId: string
  placeId: string
  relationKey: "based_in" | "headquartered_in" | "active_in"
  origin: GeographyOrigin
  /** Required for editorial_verified writes. */
  reviewerId?: string | null
  visibility: "public" | "private"
  /** Temporal window — required for active_in. */
  validFrom?: string | null
  validUntil?: string | null
}

export class GeographyRuleError extends Error {}

export function validateGeographyFact(input: GeographyFactInput): void {
  if (input.relationKey === "based_in" || input.relationKey === "headquartered_in") {
    // Identity relations: user-entered OR editorially verified; never derived.
    if (input.origin === "derived_verified_event") {
      throw new GeographyRuleError(
        `${input.relationKey} cannot be written from derived event activity (P6-T04)`,
      )
    }
    if (input.origin === "editorial_verified" && !input.reviewerId) {
      throw new GeographyRuleError("editorial verification requires a reviewer id")
    }
    if (input.validUntil) {
      throw new GeographyRuleError(`${input.relationKey} is open-ended (identity, not activity)`)
    }
  }
  if (input.relationKey === "active_in") {
    if (!input.validFrom || !input.validUntil) {
      throw new GeographyRuleError("active_in requires an explicit temporal window")
    }
    if (input.validFrom >= input.validUntil) {
      throw new GeographyRuleError("active_in window is empty")
    }
    // Derived activity may originate from verified events; that is its purpose.
  }
}

/** P6-T08 — profile strings and canonical selections may disagree. */
export interface LocationConflict {
  profileString: string | null
  canonicalName: string | null
}

export interface ConflictDecision {
  /** Canonical wins for World projection… */
  worldUsesCanonical: true
  /** …while the operational display string is preserved untouched. */
  operationalStringPreserved: boolean
  /** Disagreement is recorded for review when both sides exist and differ. */
  disagreementRecorded: boolean
}

export function reconcileLocationConflict(conflict: LocationConflict): ConflictDecision {
  const canonical = conflict.canonicalName?.trim() ?? null
  const profile = conflict.profileString?.trim() ?? null
  const disagreementRecorded = Boolean(canonical && profile && !profile.toLowerCase().includes(canonical.toLowerCase()))
  return {
    worldUsesCanonical: true,
    operationalStringPreserved: true,
    disagreementRecorded,
  }
}

/** P6-T09 — privacy propagation on removal of public base geography. */
export interface PrivacyPropagationPlan {
  retirePublicFacts: boolean
  setVisibilityToPrivate: boolean
  keepsIdentityRow: boolean
}

export function planPrivacyPropagation(hasOpenPublicBaseFact: boolean): PrivacyPropagationPlan {
  return hasOpenPublicBaseFact
    ? { retirePublicFacts: true, setVisibilityToPrivate: true, keepsIdentityRow: true }
    : { retirePublicFacts: false, setVisibilityToPrivate: false, keepsIdentityRow: true }
}
