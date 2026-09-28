import { describe, expect, it } from "vitest"

import { extractFromArtistEvent } from "@/lib/geo/adapters/artist-event"
import { extractFromEvent } from "@/lib/geo/adapters/event"
import { extractFromEventV2 } from "@/lib/geo/adapters/event-v2"
import { extractFreeText } from "@/lib/geo/adapters/profile"
import { extractFromVenueProfile } from "@/lib/geo/adapters/venue"

describe("geo source adapters", () => {
  it("extracts events geography and keeps venue name as free-text context only", () => {
    const input = extractFromEvent({
      latitude: 30.2672,
      longitude: -97.7431,
      city: "Austin",
      state: "Texas",
      country: "USA",
      venue_name: "Mohawk",
      address: "912 Red River St",
    })
    expect(input.coordinates).toEqual({ latitude: 30.2672, longitude: -97.7431 })
    expect(input.hierarchy).toMatchObject({ city: "Austin", admin1: "Texas" })
    expect(input.freeText).toBe("Mohawk")
  })

  it("reads events_v2 settings JSON venue fields", () => {
    const input = extractFromEventV2({
      settings: {
        latitude: 51.5074,
        longitude: -0.1278,
        venue_city: "London",
        venue_state: null,
        venue_country: "United Kingdom",
        venue_name: "The 100 Club",
      },
    })
    expect(input.coordinates).toEqual({ latitude: 51.5074, longitude: -0.1278 })
    expect(input.hierarchy).toMatchObject({
      city: "London",
      country: "United Kingdom",
    })
    expect(input.freeText).toBe("The 100 Club")
  })

  it("tolerates missing or malformed events_v2 settings", () => {
    expect(extractFromEventV2({})).toEqual({
      coordinates: null,
      hierarchy: { city: null, admin1: null, country: null },
      freeText: null,
    })
    expect(extractFromEventV2({ settings: "not-an-object" }).coordinates).toBeNull()
  })

  it("supports nested location objects on artist_events", () => {
    const input = extractFromArtistEvent({
      venue_city: "Kingston",
      venue_country: "Jamaica",
      location: { latitude: 17.9714, longitude: -76.7936, name: "Studio 170" },
    })
    expect(input.coordinates).toEqual({ latitude: 17.9714, longitude: -76.7936 })
    expect(input.hierarchy).toMatchObject({ city: "Kingston", country: "Jamaica" })
    expect(input.freeText).toBe("Studio 170")
  })

  it("maps venue profile address fields without inventing coordinates", () => {
    const input = extractFromVenueProfile({
      address: "12 Bar Row",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
    })
    expect(input.hierarchy).toMatchObject({ city: "Lagos", admin1: "Lagos" })
    expect(input.coordinates).toBeUndefined()
    expect(input.freeText).toBe("12 Bar Row")
  })

  it("keeps profiles/posts/jobs as free text only", () => {
    expect(extractFreeText({ location: "Deep Ellum, Dallas" })).toEqual({
      freeText: "Deep Ellum, Dallas",
    })
  })
})
