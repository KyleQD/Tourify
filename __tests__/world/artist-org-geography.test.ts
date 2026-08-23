import { describe, expect, it } from "vitest"

import {
  GeographyRuleError,
  planPrivacyPropagation,
  reconcileLocationConflict,
  validateGeographyFact,
} from "@/lib/world/projections/artist-org"

const base = {
  entityKind: "artist" as const,
  entityId: "a1",
  placeId: "p1",
  origin: "user_entered" as const,
  visibility: "public" as const,
}

describe("P6 artist & organization geography", () => {
  it("T01: user-controlled based_in is valid without a reviewer", () => {
    expect(() =>
      validateGeographyFact({ ...base, relationKey: "based_in" }),
    ).not.toThrow()
  })

  it("T01: editorially verified based_in requires a reviewer id", () => {
    expect(() =>
      validateGeographyFact({
        ...base,
        relationKey: "based_in",
        origin: "editorial_verified",
      }),
    ).toThrow(GeographyRuleError)
    expect(() =>
      validateGeographyFact({
        ...base,
        relationKey: "based_in",
        origin: "editorial_verified",
        reviewerId: "r1",
      }),
    ).not.toThrow()
  })

  it("T04: derived activity can NEVER write based_in", () => {
    expect(() =>
      validateGeographyFact({
        ...base,
        relationKey: "based_in",
        origin: "derived_verified_event",
        validFrom: "2026-01-01",
        validUntil: "2026-02-01",
      }),
    ).toThrow(/cannot be written from derived/)
  })

  it("T03: active_in is time-bounded and rejects empty windows", () => {
    expect(() =>
      validateGeographyFact({
        ...base,
        relationKey: "active_in",
        origin: "derived_verified_event",
        validFrom: "2026-01-01",
        validUntil: "2026-03-01",
      }),
    ).not.toThrow()
    expect(() =>
      validateGeographyFact({ ...base, relationKey: "active_in", origin: "derived_verified_event" }),
    ).toThrow(/temporal window/)
    expect(() =>
      validateGeographyFact({
        ...base,
        relationKey: "active_in",
        origin: "derived_verified_event",
        validFrom: "2026-03-01",
        validUntil: "2026-03-01",
      }),
    ).toThrow(/empty/)
  })

  it("T05: headquartered_in comes from explicit org settings, open-ended", () => {
    expect(() =>
      validateGeographyFact({
        entityKind: "organization",
        entityId: "o1",
        placeId: "p1",
        relationKey: "headquartered_in",
        origin: "user_entered",
        visibility: "public",
      }),
    ).not.toThrow()
    expect(() =>
      validateGeographyFact({
        entityKind: "organization",
        entityId: "o1",
        placeId: "p1",
        relationKey: "headquartered_in",
        origin: "user_entered",
        visibility: "public",
        validUntil: "2027-01-01",
      }),
    ).toThrow(/open-ended/)
  })

  it("T06: derived org active_in carries temporal validity", () => {
    expect(() =>
      validateGeographyFact({
        entityKind: "organization",
        entityId: "o1",
        placeId: "p2",
        relationKey: "active_in",
        origin: "derived_verified_event",
        visibility: "internal",
        validFrom: "2026-06-01",
        validUntil: "2026-06-30",
      }),
    ).not.toThrow()
  })

  it("T08: canonical wins for World; operational string preserved", () => {
    const agreeing = reconcileLocationConflict({
      profileString: "Deep Ellum, Dallas TX",
      canonicalName: "Dallas",
    })
    expect(agreeing.worldUsesCanonical).toBe(true)
    expect(agreeing.operationalStringPreserved).toBe(true)
    // Neighborhood-within-city mention is consistent with the canonical place.
    expect(agreeing.disagreementRecorded).toBe(false)
  })

  it("T08: genuine disagreements are recorded for review", () => {
    const conflicting = reconcileLocationConflict({
      profileString: "Ann Arbor",
      canonicalName: "Dallas",
    })
    expect(conflicting.disagreementRecorded).toBe(true)

    const emptyProfile = reconcileLocationConflict({ profileString: null, canonicalName: "Dallas" })
    expect(emptyProfile.disagreementRecorded).toBe(false)
  })

  it("T09: privacy removal plan retires public facts but keeps the identity row", () => {
    expect(planPrivacyPropagation(true)).toEqual({
      retirePublicFacts: true,
      setVisibilityToPrivate: true,
      keepsIdentityRow: true,
    })
    expect(planPrivacyPropagation(false).retirePublicFacts).toBe(false)
  })
})
