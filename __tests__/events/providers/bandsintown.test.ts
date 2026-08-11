import { describe, expect, it } from "vitest"

import fixture from "../../../tests/fixtures/providers/bandsintown/artist-events.json"
import { bitEventsResponseSchema } from "@/lib/events/providers/bandsintown/schema"
import {
  normalizeArtistName,
  normalizeBandsintownEvent,
} from "@/lib/events/providers/bandsintown/normalizer"
import { normalizedExternalEventSchema } from "@/lib/events/providers/schemas"

const META = { rawPayloadHash: "bithash00001", fetchedAt: "2026-08-04T00:00:00Z" }

describe("normalizeArtistName", () => {
  it("strips DJ prefix and featuring qualifiers", () => {
    expect(normalizeArtistName("DJ Example Artist (feat. Guest MC)")).toBe("Example Artist")
    expect(normalizeArtistName("Band featuring Singer")).toBe("Band")
    expect(normalizeArtistName("  Plain   Name  ")).toBe("Plain Name")
  })
})

describe("normalizeBandsintownEvent", () => {
  const events = bitEventsResponseSchema.parse(fixture)

  it("maps a full artist event into the normalized contract", () => {
    const event = normalizeBandsintownEvent(events[0], "Example Artist", META)
    expect(() => normalizedExternalEventSchema.parse(event)).not.toThrow()
    expect(event.provider).toBe("bandsintown")
    expect(event.providerEventId).toBe("1023456789")
    expect(event.title).toBe("Example Artist Live")
    expect(event.localDate).toBe("2026-09-12")
    expect(event.localTime).toBe("19:30:00")
    expect(event.venue).toMatchObject({
      name: "Brooklyn Steel",
      city: "Brooklyn",
      stateCode: "NY",
    })
    expect(event.venue?.latitude).toBeCloseTo(40.7224)
    expect(event.venue?.longitude).toBeCloseTo(-73.9508)
    expect(event.performers[0].name).toBe("Example Artist")
    expect(event.ticketOffers[0]).toMatchObject({ status: "onsale", isPrimary: false })
  })

  it("handles events without offers and preserves datetime", () => {
    const event = normalizeBandsintownEvent(events[1], "Example Artist", META)
    expect(event.ticketOffers).toHaveLength(0)
    expect(event.startAt).toBe("2026-09-19T20:00:00")
    expect(event.venue?.city).toBe("Los Angeles")
  })
})
