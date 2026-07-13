import { describe, expect, it } from "vitest"
import {
  buildEventProducerPayload,
  hydrateEventProducerForm,
  initialEventProducerForm,
} from "@/lib/admin/event-producer-builder"
import {
  buildTourBuilderPayload,
  hydrateTourBuilderForm,
  initialTourBuilderForm,
  makeTourStop,
} from "@/lib/admin/tour-builder"

describe("event producer builder", () => {
  it("builds a publishable payload with tour assignments", () => {
    const form = {
      ...initialEventProducerForm,
      title: "Fonda Night",
      date: "2026-08-15",
      time: "20:00",
      venueName: "The Fonda",
      selectedTourIds: ["tour-1", "tour-2"],
      primaryTourId: "tour-1",
      ticketPrice: "45",
      selectedArtists: [{ id: "a1", label: "Headliner" }],
    }

    const payload = buildEventProducerPayload(form, { publish: true, readinessScore: 82 })
    expect(payload.status).toBe("confirmed")
    expect(payload.title).toBe("Fonda Night")
    expect(payload.tour_ids).toEqual(["tour-1", "tour-2"])
    expect(payload.primary_tour_id).toBe("tour-1")
    expect(payload.tour_assignments[0].is_primary).toBe(true)
    expect(payload.ticket_price).toBe(45)
    expect(payload.artist_ids).toEqual(["a1"])
  })

  it("hydrates producer form from an admin event payload", () => {
    const hydrated = hydrateEventProducerForm({
      id: "evt-1",
      title: "Resumed Draft",
      status: "draft",
      start_at: "2026-09-01T19:30:00.000Z",
      venue_name: "Stubb's",
      capacity: 1200,
      tours: [{ id: "tour-9", name: "Fall Run", is_primary: true, ordinal: 2 }],
      setup_context: {
        artists: [{ id: "artist-1", label: "Main Act" }],
      },
    })

    expect(hydrated.title).toBe("Resumed Draft")
    expect(hydrated.venueName).toBe("Stubb's")
    expect(hydrated.capacity).toBe("1200")
    expect(hydrated.selectedTourIds).toEqual(["tour-9"])
    expect(hydrated.primaryTourId).toBe("tour-9")
    expect(hydrated.selectedArtists[0].id).toBe("artist-1")
  })
})

describe("tour operations builder", () => {
  it("builds create payload with route stops and attached events", () => {
    const stop = { ...makeTourStop(), name: "Austin", venue: "Stubb's", date: "2026-08-20", market: "Austin" }
    const form = {
      ...initialTourBuilderForm,
      name: "Texas Run",
      mainArtist: "Band",
      startDate: "2026-08-20",
      endDate: "2026-08-25",
      stops: [stop],
      attachedEventIds: ["existing-event"],
      budget: "250000",
    }

    const payload = buildTourBuilderPayload(form, { publish: true, readinessScore: 70 })
    expect(payload.status).toBe("active")
    expect(payload.name).toBe("Texas Run")
    expect(payload.event_ids).toEqual(["existing-event"])
    expect(payload.events[0]).toMatchObject({
      name: "Austin",
      venue: "Stubb's",
      date: "2026-08-20",
      market: "Austin",
    })
    expect(payload.events[0]).not.toHaveProperty("venue_name")
    expect(payload.events[0]).not.toHaveProperty("event_date")
    expect(payload.routing[0].market).toBe("Austin")
    expect(payload.settings.route[0].market).toBe("Austin")
    expect(payload.settings.creation_source).toBe("admin_tour_operations_builder")
  })

  it("includes event id on attached stops for update sync", () => {
    const stop = {
      ...makeTourStop(),
      id: "11111111-1111-4111-8111-111111111111",
      name: "Dallas",
      venue: "The Factory",
      date: "2026-08-22",
    }
    const form = {
      ...initialTourBuilderForm,
      name: "Texas Run",
      stops: [stop],
      attachedEventIds: [stop.id],
    }

    const payload = buildTourBuilderPayload(form)
    expect(payload.events[0].id).toBe(stop.id)
    expect(payload.events[0].venue).toBe("The Factory")
    expect(payload.events[0].date).toBe("2026-08-22")
  })

  it("hydrates tour builder form from tour + linked events", () => {
    const hydrated = hydrateTourBuilderForm(
      {
        id: "tour-1",
        name: "West Coast",
        main_artist: "Artist",
        status: "planning",
        start_date: "2026-07-01",
        end_date: "2026-07-10",
        cover_image_url: "https://cdn.example/cover.jpg",
        settings: { route_notes: "Keep drives under 5 hours" },
      },
      [
        {
          id: "evt-22",
          name: "LA Show",
          venue_name: "Greek",
          event_date: "2026-07-03",
          advance_status: "in_progress",
        },
      ]
    )

    expect(hydrated.name).toBe("West Coast")
    expect(hydrated.coverImageUrl).toContain("cover.jpg")
    expect(hydrated.attachedEventIds).toEqual(["evt-22"])
    expect(hydrated.stops[0].name).toBe("LA Show")
    expect(hydrated.routeNotes).toContain("5 hours")
  })

  it("prefers linked events over settings.route when hydrating", () => {
    const hydrated = hydrateTourBuilderForm(
      {
        id: "tour-1",
        name: "West Coast",
        settings: {
          route: [{ name: "Draft LA", venue: "Draft Venue", date: "2026-07-01", event_id: null }],
        },
      },
      [
        {
          id: "evt-99",
          name: "Persisted LA",
          venue_name: "Greek",
          event_date: "2026-07-03",
          tour: { market: "Los Angeles", leg_name: "West", advance_status: "ready" },
        },
      ]
    )

    expect(hydrated.stops).toHaveLength(1)
    expect(hydrated.stops[0].id).toBe("evt-99")
    expect(hydrated.stops[0].name).toBe("Persisted LA")
    expect(hydrated.stops[0].market).toBe("Los Angeles")
    expect(hydrated.stops[0].advance_status).toBe("ready")
  })
})
