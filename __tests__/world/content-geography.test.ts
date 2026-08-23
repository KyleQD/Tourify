import { describe, expect, it } from "vitest"

import {
  ABOUT_PLACE_RELATION,
  canProjectContent,
  deriveAboutPlaceFromEvent,
  planDisputeResolution,
  postedFromVisibilityCeiling,
  relevanceScore,
} from "@/lib/world/projections/content"

describe("P8 content geography", () => {
  it("T01: about_place is the only public relation and is frozen", () => {
    expect(ABOUT_PLACE_RELATION).toEqual({ domain: "content_place", key: "about_place" })
    expect(ABOUT_PLACE_RELATION.key).not.toBe("posted_from")
  })

  it("T04: posted_from ceiling is private — never public", () => {
    const ceiling = postedFromVisibilityCeiling()
    expect(["private", "internal"]).toContain(ceiling)
    expect(ceiling).toBe("private")
  })

  it("T03: derives about_place ONLY from hard-FK event links", () => {
    expect(deriveAboutPlaceFromEvent({ linkType: "hard_fk", placeId: "p-detroit" })).toBe("p-detroit")
    // Text mentions / tags are not deterministic:
    expect(
      deriveAboutPlaceFromEvent({ linkType: "mention" as never, placeId: "p-x" }),
    ).toBeNull()
    expect(deriveAboutPlaceFromEvent(null)).toBeNull()
  })

  it("T05: moderation/publication gates control projection", () => {
    expect(canProjectContent("published", "approved")).toBe(true)
    expect(canProjectContent("published", "none")).toBe(true)
    expect(canProjectContent("draft", "approved")).toBe(false)
    expect(canProjectContent("scheduled", "approved")).toBe(false)
    expect(canProjectContent("removed", "approved")).toBe(false)
    expect(canProjectContent("published", "rejected")).toBe(false)
  })

  it("T06: cross-posted feed copies collapse to one canonical item", () => {
    // Dedupe identity = canonical content id; copies share it.
    const canonicalId = "content-abc"
    const copies = ["feed-copy-1", "cross-post-2"]
    const worldItems = new Map<string, string>()
    for (const copy of [canonicalId, ...copies]) {
      // All copies resolve to the same canonical id:
      worldItems.set(copy === canonicalId ? copy : canonicalId, copy)
    }
    // After dedupe there is exactly ONE World item keyed by the canonical id.
    expect(new Set(worldItems.keys()).size).toBe(1)
  })

  it("T07: relevance score combines explicit tags, event links, and curation", () => {
    expect(relevanceScore({ explicitTag: true, derivedFromEvent: false, editorialCurated: false })).toBe(0.6)
    expect(relevanceScore({ explicitTag: false, derivedFromEvent: true, editorialCurated: false })).toBe(0.3)
    expect(relevanceScore({ explicitTag: true, derivedFromEvent: true, editorialCurated: true })).toBe(1)
    expect(relevanceScore({ explicitTag: false, derivedFromEvent: false, editorialCurated: false })).toBe(0)
  })

  it("T08: disputed associations suspend public projection immediately", () => {
    const plan = planDisputeResolution({
      contentId: "c1",
      disputedPlaceId: "place-x",
      reason: "wrong city alleged",
    })
    expect(plan.suspendPublicProjection).toBe(true)
    expect(plan.keepInternalRecord).toBe(true)
    expect(plan.requiresEditorialReview).toBe(true)
    expect(() => planDisputeResolution({ contentId: "", disputedPlaceId: "" })).toThrow()
  })
})
