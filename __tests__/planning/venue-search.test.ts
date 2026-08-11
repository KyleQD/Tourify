import { describe, expect, it } from "vitest"

import { buildEventProducerPayload, initialEventProducerForm } from "@/lib/admin/event-producer-builder"
import { buildArtistEventProducerPayload, initialArtistEventProducerForm } from "@/lib/artist/event-producer-builder"
import { mapCatalogVenue, mapTourifyVenueProfile } from "@/lib/planning/venue-search"

describe("planning venue prefills", () => {
  it("maps catalog rows without inventing capacity or specifications", () => {
    const result = mapCatalogVenue({
      source_id: "overture-1",
      name: "The Test Room",
      city: "Austin",
      state: "TX",
      email: "booking@example.com",
    })

    expect(result.sourceLabel).toBe("Venue catalog")
    expect(result.capacity).toBeNull()
    expect(result.technicalSpecs).toEqual({})
    expect(result.contactEmail).toBe("booking@example.com")
  })

  it("keeps Tourify venue profiles as separately labeled detached results", () => {
    const result = mapTourifyVenueProfile({
      id: "profile-1",
      venue_name: "The Test Room",
      contact_info: { booking_email: "shows@example.com" },
      settings: { stage_specs: { width: "32 ft" } },
    })

    expect(result.key).toBe("profile:profile-1")
    expect(result.sourceLabel).toBe("Tourify venue profile")
    expect(result.technicalSpecs).toEqual({ width: "32 ft" })
  })

  it("does not create an organization venue relationship for copied text", () => {
    const payload = buildEventProducerPayload({
      ...initialEventProducerForm,
      venueName: "Manual Hall",
      address: "1 Main St",
      venueCity: "Denver",
    })

    expect(payload.venue_id).toBeNull()
    expect(payload.venue_name).toBe("Manual Hall")
    expect(payload.venue_city).toBe("Denver")
    expect(payload.setup_context.venue_account_id).toBeNull()
  })

  it("does not create an artist venue relationship for copied text", () => {
    const payload = buildArtistEventProducerPayload({
      ...initialArtistEventProducerForm,
      venueName: "Manual Hall",
      website: "https://venue.example",
    })

    expect(payload.venue_id).toBeNull()
    expect(payload.venue_name).toBe("Manual Hall")
    expect(payload.producer_settings.venue_website).toBe("https://venue.example")
  })

  it("preserves a pre-existing explicit relationship when no new result is selected", () => {
    const payload = buildEventProducerPayload({
      ...initialEventProducerForm,
      venueAccountId: "2c87f670-9d9c-4c84-b09e-f07dfa4a0dea",
      venueName: "Associated Venue",
    })

    expect(payload.venue_id).toBe("2c87f670-9d9c-4c84-b09e-f07dfa4a0dea")
  })
})
