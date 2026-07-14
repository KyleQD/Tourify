import { describe, expect, it } from "vitest"

import {
  buildArtistEventProducerPayload,
  hydrateArtistEventProducerForm,
  initialArtistEventProducerForm,
  prefillFromBooking,
} from "@/lib/artist/event-producer-builder"
import { getArtistEventReadiness } from "@/lib/artist/artist-event-readiness"

describe("artist event producer builder", () => {
  it("builds a draft payload with slug-ready title and settings", () => {
    const form = {
      ...initialArtistEventProducerForm,
      title: "Friday Night Live",
      date: "2026-08-01",
      venueName: "The Echo",
      city: "Los Angeles",
      ticketUrl: "https://tickets.example.com/echo",
      ticketPriceMin: "25",
      tags: "indie, live",
    }

    const payload = buildArtistEventProducerPayload(form)
    expect(payload.title).toBe("Friday Night Live")
    expect(payload.status).toBe("draft")
    expect(payload.ticket_url).toContain("tickets.example.com")
    expect(payload.tags).toEqual(["indie", "live"])
    expect(payload.producer_settings.timezone).toBeTruthy()
    expect(payload.producer_settings.page_template).toBe("modern")
  })

  it("persists selected page_template in producer_settings", () => {
    const payload = buildArtistEventProducerPayload({
      ...initialArtistEventProducerForm,
      title: "Styled Show",
      date: "2026-08-01",
      venueName: "Hall",
      pageTemplate: "cinema",
      pageLayout: {
        section_order: ["hero", "media", "overview", "posts", "attendance", "details"],
        section_visibility: {
          hero: true,
          overview: true,
          posts: false,
          attendance: true,
          details: true,
          media: true,
        },
      },
    })
    expect(payload.producer_settings.page_template).toBe("cinema")
    expect(payload.producer_settings.page_layout.section_order[1]).toBe("media")
    expect(payload.producer_settings.page_layout.section_visibility.posts).toBe(false)
  })

  it("hydrates form from event row", () => {
    const form = hydrateArtistEventProducerForm({
      title: "Show",
      event_date: "2026-09-10",
      start_time: "20:00:00",
      venue_name: "Venue",
      city: "Austin",
      tags: ["rock"],
      producer_settings: {
        share_blurb: "Come through",
        page_template: "luxe",
        page_layout: {
          section_order: ["hero", "details", "overview"],
          section_visibility: { media: false },
        },
        supporting_artists: [{ id: "1", label: "Opener" }],
      },
    })

    expect(form.title).toBe("Show")
    expect(form.date).toBe("2026-09-10")
    expect(form.time).toBe("20:00")
    expect(form.shareBlurb).toBe("Come through")
    expect(form.pageTemplate).toBe("luxe")
    expect(form.pageLayout.section_order.slice(0, 3)).toEqual(["hero", "details", "overview"])
    expect(form.pageLayout.section_visibility.media).toBe(false)
    expect(form.supportingArtists).toHaveLength(1)
  })

  it("prefills from booking details", () => {
    const form = prefillFromBooking({
      eventName: "Private set",
      booking_details: {
        performanceDate: "2026-10-01",
        venue: "House of Blues",
        location: "Chicago",
        compensation: "$2,000",
        description: "Corporate gig",
      },
    })

    expect(form.title).toBe("Private set")
    expect(form.venueName).toBe("House of Blues")
    expect(form.city).toBe("Chicago")
    expect(form.marketingNotes).toContain("$2,000")
  })

  it("blocks publish without title/date/venue", () => {
    const readiness = getArtistEventReadiness(initialArtistEventProducerForm)
    expect(readiness.blockers.map((item) => item.id)).toEqual(
      expect.arrayContaining(["basics", "schedule", "venue"]),
    )
  })

  it("is ready when core fields are filled", () => {
    const readiness = getArtistEventReadiness({
      ...initialArtistEventProducerForm,
      title: "Ready Show",
      date: "2026-11-01",
      venueName: "Club",
      ticketUrl: "https://tix.example",
    })
    expect(readiness.blockers).toHaveLength(0)
    expect(readiness.score).toBeGreaterThan(50)
  })

  it("does not block publish on optional ticketing", () => {
    const readiness = getArtistEventReadiness({
      ...initialArtistEventProducerForm,
      title: "No Tickets Yet",
      date: "2026-11-02",
      city: "Seattle",
    })
    expect(readiness.blockers).toHaveLength(0)
  })
})
