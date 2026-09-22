import { describe, expect, it } from "vitest"

import fixture from "../../../tests/fixtures/providers/ticketmaster/search-las-vegas.json"
import { normalizeTicketmasterEvent } from "@/lib/events/providers/ticketmaster/normalizer"
import { tmEventSchema, tmSearchResponseSchema } from "@/lib/events/providers/ticketmaster/schema"
import { normalizedExternalEventSchema } from "@/lib/events/providers/schemas"
import { TicketmasterRateLimiter } from "@/lib/events/providers/ticketmaster/rate-limiter"

const META = { rawPayloadHash: "fixturehash0001", fetchedAt: "2026-08-04T00:00:00Z" }

describe("ticketmaster fixture validation", () => {
  it("validates the recorded search response", () => {
    const parsed = tmSearchResponseSchema.parse(fixture)
    expect(parsed._embedded?.events).toHaveLength(2)
    expect(parsed.page?.totalElements).toBe(2)
  })
})

describe("normalizeTicketmasterEvent", () => {
  const [first, second] = tmSearchResponseSchema.parse(fixture)._embedded!.events

  it("maps a full event into the normalized contract", () => {
    const event = normalizeTicketmasterEvent(tmEventSchema.parse(first), META)
    expect(() => normalizedExternalEventSchema.parse(event)).not.toThrow()
    expect(event.provider).toBe("ticketmaster")
    expect(event.providerEventId).toBe("vvG1zZ9sExample1")
    expect(event.normalizedTitle).toBe("example band live")
    expect(event.status).toBe("scheduled")
    expect(event.startAt).toBe("2026-09-05T02:00:00Z")
    expect(event.timezone).toBe("America/Los_Angeles")
    expect(event.venue?.city).toBe("Las Vegas")
    expect(event.venue?.stateCode).toBe("NV")
    expect(event.venue?.longitude).toBeCloseTo(-115.1398)
    expect(event.venue?.latitude).toBeCloseTo(36.1699)
    expect(event.performers[0]).toMatchObject({ name: "Example Band", isHeadliner: true })
    expect(event.classifications.map((c) => c.key)).toContain("rock")
    expect(event.ticketOffers[0]).toMatchObject({
      currency: "USD",
      minPrice: 49.5,
      maxPrice: 149.5,
      status: "onsale",
      isPrimary: true,
    })
  })

  it("maps cancelled status through", () => {
    const event = normalizeTicketmasterEvent(tmEventSchema.parse(second), META)
    expect(event.status).toBe("cancelled")
    expect(event.venue?.name).toBe("Jazz Cellar")
  })
})

describe("TicketmasterRateLimiter", () => {
  it("allows burst then throttles", () => {
    let t = 0
    const limiter = new TicketmasterRateLimiter({ requestsPerSecond: 2, burst: 2, now: () => t })
    expect(limiter.acquire()).toBe(0)
    expect(limiter.acquire()).toBe(0)
    expect(limiter.acquire()).toBeGreaterThan(0) // throttled
  })

  it("refills over time", () => {
    let t = 0
    const limiter = new TicketmasterRateLimiter({ requestsPerSecond: 10, burst: 1, now: () => t })
    expect(limiter.acquire()).toBe(0)
    t += 200 // 0.2s → 2 tokens
    expect(limiter.acquire()).toBe(0)
  })

  it("protects the daily reserve", () => {
    const limiter = new TicketmasterRateLimiter({ requestsPerSecond: 1000, burst: 1000, dailyBudget: 600, dailyReserve: 500, now: () => 0 })
    expect(limiter.acquire()).toBe(0) // 1 used
    for (let i = 0; i < 99; i++) limiter.acquire()
    expect(limiter.acquire()).toBe(-1) // exhausted at budget - reserve
  })

  it("resets the daily counter on day rollover", () => {
    let day = 0
    const limiter = new TicketmasterRateLimiter({
      requestsPerSecond: 1000,
      burst: 1000,
      dailyBudget: 501,
      dailyReserve: 500,
      now: () => Date.UTC(2026, 7, 4 + day),
    })
    expect(limiter.acquire()).toBe(0)
    expect(limiter.acquire()).toBe(-1)
    day = 1
    expect(limiter.acquire()).toBe(0)
  })
})
