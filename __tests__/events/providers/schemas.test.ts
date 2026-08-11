import { describe, expect, it } from "vitest"

import {
  hashRawPayload,
  normalizeTitleKey,
  normalizedExternalEventSchema,
} from "@/lib/events/providers/schemas"

const validEvent = {
  provider: "ticketmaster",
  providerEventId: "vvG1zZ9example",
  sourceUrl: "https://www.ticketmaster.com/event/vvG1zZ9example",
  title: "An Evening With Example Band",
  normalizedTitle: "an evening with example band",
  description: null,
  status: "scheduled",
  startAt: "2026-09-01T02:00:00Z",
  endAt: null,
  localDate: "2026-08-31",
  localTime: "20:00:00",
  timezone: "America/Los_Angeles",
  venue: {
    providerVenueId: "KovZpZAExample",
    name: "Example Arena",
    address: "123 Main St",
    city: "Las Vegas",
    stateCode: "NV",
    countryCode: "US",
    postalCode: "89101",
    longitude: -115.1398,
    latitude: 36.1699,
    timezone: "America/Los_Angeles",
  },
  performers: [{ providerPerformerId: "K8vZ917Example", name: "Example Band", isHeadliner: true }],
  classifications: [{ kind: "genre", key: "rock", label: "Rock" }],
  images: [
    { url: "https://s1.ticketm.net/example.jpg", width: 1024, height: 576, ratio: "16_9", isFallback: false },
  ],
  ticketOffers: [
    {
      label: "Standard Tickets",
      url: "https://www.ticketmaster.com/event/vvG1zZ9example",
      currency: "USD",
      minPrice: 45,
      maxPrice: 125,
      saleStartAt: null,
      saleEndAt: null,
      status: "onsale",
      isPrimary: true,
    },
  ],
  providerUpdatedAt: "2026-08-01T00:00:00Z",
  rawPayloadHash: "abcdef1234567890",
  fetchedAt: "2026-08-04T00:00:00Z",
}

describe("normalizedExternalEventSchema", () => {
  it("accepts a fully populated normalized event", () => {
    const parsed = normalizedExternalEventSchema.parse(validEvent)
    expect(parsed.provider).toBe("ticketmaster")
    expect(parsed.venue?.city).toBe("Las Vegas")
  })

  it("accepts null venue and empty arrays", () => {
    const parsed = normalizedExternalEventSchema.parse({
      ...validEvent,
      venue: null,
      performers: [],
      classifications: [],
      images: [],
      ticketOffers: [],
    })
    expect(parsed.venue).toBeNull()
  })

  it("rejects out-of-range coordinates (and reversed lat/lng would fail)", () => {
    expect(() =>
      normalizedExternalEventSchema.parse({
        ...validEvent,
        venue: { ...validEvent.venue, latitude: 200 },
      }),
    ).toThrow()
    expect(() =>
      normalizedExternalEventSchema.parse({
        ...validEvent,
        venue: { ...validEvent.venue, longitude: -200 },
      }),
    ).toThrow()
  })

  it("rejects invalid status and malformed localDate", () => {
    expect(() =>
      normalizedExternalEventSchema.parse({ ...validEvent, status: "onsale" }),
    ).toThrow()
    expect(() =>
      normalizedExternalEventSchema.parse({ ...validEvent, localDate: "08/31/2026" }),
    ).toThrow()
  })

  it("rejects non-URL ticket offer links", () => {
    expect(() =>
      normalizedExternalEventSchema.parse({
        ...validEvent,
        ticketOffers: [{ ...validEvent.ticketOffers[0], url: "not-a-url" }],
      }),
    ).toThrow()
  })
})

describe("normalizeTitleKey", () => {
  it("normalizes case, punctuation and diacritics", () => {
    expect(normalizeTitleKey("Beyoncé: The RENAISSANCE Tour!")).toBe(
      "beyonce the renaissance tour",
    )
  })
})

describe("hashRawPayload", () => {
  it("is stable across key ordering", async () => {
    const a = await hashRawPayload({ b: 1, a: { d: 2, c: 3 } })
    const b = await hashRawPayload({ a: { c: 3, d: 2 }, b: 1 })
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it("changes when payload changes", async () => {
    const a = await hashRawPayload({ x: 1 })
    const b = await hashRawPayload({ x: 2 })
    expect(a).not.toBe(b)
  })
})
