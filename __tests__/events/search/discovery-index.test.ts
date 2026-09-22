import { describe, expect, it } from "vitest"

import {
  buildFromArtistEvents,
  buildFromEvents,
  buildFromEventsV2,
  computeQualityScore,
  toPointWkt,
} from "@/lib/events/discovery-index"

describe("toPointWkt", () => {
  it("builds POINT(longitude latitude) — longitude first", () => {
    expect(toPointWkt(36.1699, -115.1398)).toBe("POINT(-115.1398 36.1699)")
  })

  it("returns null for missing or out-of-range coordinates", () => {
    expect(toPointWkt(null, -115)).toBeNull()
    expect(toPointWkt(36, null)).toBeNull()
    expect(toPointWkt(95, -115)).toBeNull()
    expect(toPointWkt(36, -200)).toBeNull()
    expect(toPointWkt(NaN, 0)).toBeNull()
  })
})

describe("buildFromEvents", () => {
  it("projects a published artist-pipeline event", () => {
    const row = buildFromEvents({
      id: "evt-1",
      name: "Club Night",
      title: "Club Night",
      description: "  A great   night  ",
      event_date: "2026-09-01",
      start_time: "20:00",
      end_time: "23:30:00",
      status: "published",
      venue_name: "The Club",
      city: "Las Vegas",
      state: "NV",
      country: "US",
      latitude: 36.1699,
      longitude: -115.1398,
      artist_id: "user-1",
      tags: ["nightlife"],
      genre_tags: ["house"],
      event_type: "concert",
      ticket_price_min: 0,
      ticket_price_max: 0,
    })
    expect(row.source_table).toBe("events")
    expect(row.normalized_title).toBe("club night")
    expect(row.start_at).toBe("2026-09-01T20:00:00Z")
    expect(row.end_at).toBe("2026-09-01T23:30:00Z")
    expect(row.location_wkt).toBe("POINT(-115.1398 36.1699)")
    expect(row.artist_ids).toEqual(["user-1"])
    expect(row.is_free).toBe(true)
    expect(row.description_excerpt).toBe("A great night")
  })

  it("maps cancelled status through", () => {
    const row = buildFromEvents({ id: "e", name: "X", status: "cancelled" })
    expect(row.status).toBe("cancelled")
  })
})

describe("buildFromEventsV2", () => {
  it("reads venue/ticket fields from the settings bag", () => {
    const row = buildFromEventsV2({
      id: "v2-1",
      title: "Arena Show",
      start_at: "2026-10-01T02:00:00Z",
      end_at: "2026-10-01T05:00:00Z",
      timezone: "America/Los_Angeles",
      created_by: "user-9",
      settings: {
        description: "Big show",
        venue_label: "Mega Arena",
        venue_city: "Las Vegas",
        venue_state: "NV",
        ticket_price_min: 45,
        ticket_price_max: 125,
        event_type: "concert",
        latitude: 36.09,
        longitude: -115.17,
      },
    })
    expect(row.source_table).toBe("events_v2")
    expect(row.venue_name).toBe("Mega Arena")
    expect(row.city).toBe("Las Vegas")
    expect(row.price_min).toBe(45)
    expect(row.location_wkt).toBe("POINT(-115.17 36.09)")
    expect(row.start_at).toBe("2026-10-01T02:00:00Z")
  })
})

describe("buildFromArtistEvents", () => {
  it("parses venue_coordinates jsonb with lat/lng keys", () => {
    const row = buildFromArtistEvents({
      id: "ae-1",
      title: "Legacy Gig",
      event_date: "2026-08-20",
      start_time: "19:00:00",
      venue_name: "Old Hall",
      venue_city: "Reno",
      venue_coordinates: { lat: 39.5296, lng: -119.8138 },
      user_id: "user-3",
      ticket_price_min: 20,
    })
    expect(row.source_table).toBe("artist_events")
    expect(row.location_wkt).toBe("POINT(-119.8138 39.5296)")
    expect(row.start_at).toBe("2026-08-20T19:00:00Z")
    expect(row.is_free).toBe(false)
  })
})

describe("computeQualityScore", () => {
  it("sums component weights and caps at 1", () => {
    expect(
      computeQualityScore({
        hasDescription: true,
        hasVenue: true,
        hasGeo: true,
        hasPrice: true,
        hasImage: true,
      }),
    ).toBe(1)
    expect(
      computeQualityScore({
        hasDescription: false,
        hasVenue: false,
        hasGeo: false,
        hasPrice: false,
        hasImage: false,
      }),
    ).toBe(0)
  })
})
