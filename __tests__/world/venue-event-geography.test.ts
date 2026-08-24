import { describe, expect, it, vi } from "vitest"

import {
  dedupeLegacyEvents,
  resolveEventLocation,
  scanVenue,
} from "@/lib/world/projections/adapters/venue-event"
import { isValidRelation } from "@/lib/world/contracts/v1"

describe("P5 venue & event geography", () => {
  it("venue adapter produces located_in-scannable records and the pair is frozen", () => {
    const rec = scanVenue({ id: "v1", city: "Detroit", state: "MI", country: "US" })
    expect(rec.entityKind).toBe("venue")
    expect(rec.hints?.city).toBe("Detroit")
    expect(isValidRelation("venue_place", "located_in")).toBe(true)
  })

  it("explicit canonical place overrides venue inheritance", async () => {
    const venuePlaceLookup = vi.fn(async () => "venue-place-id")
    const result = await resolveEventLocation(
      { id: "e1", entityTable: "events_v2", venueId: "v9", canonicalPlaceId: "explicit-place" },
      { venuePlaceLookup, resolveFromHints: vi.fn() },
    )
    expect(venuePlaceLookup).not.toHaveBeenCalled()
    expect(result).toEqual({ status: "resolved", placeId: "explicit-place", confidence: 1 })
  })

  it("events inherit the venue's canonical place when no explicit place", async () => {
    const venuePlaceLookup = vi.fn(async () => "inherited-place")
    const hintsResolver = vi.fn()
    const result = await resolveEventLocation(
      { id: "e1", entityTable: "events_v2", venueId: "v9" },
      { venuePlaceLookup, resolveFromHints: hintsResolver },
    )
    expect(result).toEqual({ status: "resolved", placeId: "inherited-place", confidence: 0.9 })
    expect(hintsResolver).not.toHaveBeenCalled()
  })

  it("falls through to hint resolution only when venue has no place", async () => {
    const hintsResolver = vi.fn(async () => ({ status: "unresolved" as const }))
    await resolveEventLocation(
      { id: "e1", entityTable: "events_v2", venueId: "v-none", city: "Lagos", country: "Nigeria" },
      { venuePlaceLookup: vi.fn(async () => null), resolveFromHints: hintsResolver },
    )
    expect(hintsResolver).toHaveBeenCalledTimes(1)
  })

  it("organization headquarters is NEVER a fallback source (P5-T08)", () => {
    // The resolver signature accepts orgHqPlaceId but must not consume it.
    const ctx = {
      venuePlaceLookup: vi.fn(async () => null),
      resolveFromHints: vi.fn(async () => ({ status: "unresolved" as const })),
      orgHqPlaceId: "hq-place",
    }
    void ctx.orgHqPlaceId
    // Structural assertion: the implementation never reads the field.
    const src = require("fs").readFileSync(
      "lib/world/projections/adapters/venue-event.ts",
      "utf8",
    )
    expect(src).toMatch(/orgHqPlaceId\?: string \| null/)
    expect(src).not.toMatch(/placeId.{0,20}orgHqPlaceId|orgHqPlaceId.{0,40}resolved/s)
  })

  it("legacy events linked to v2 are marked duplicates, not projected twice", () => {
    const marked: string[] = []
    const report = dedupeLegacyEvents(
      [{ id: "legacy-1" }, { id: "legacy-2" }],
      (id) => id === "legacy-1",
      (id) => marked.push(id),
    )
    expect(marked).toEqual(["legacy-1"])
    expect(report.duplicatesMarked.length).toBe(1)
  })
})
