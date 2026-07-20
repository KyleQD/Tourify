import { selectDiscoverTours } from "@/lib/discover/tour-selection"

describe("selectDiscoverTours", () => {
  const nowMs = new Date("2026-07-01T00:00:00.000Z").getTime()

  it("shapes active tours with stop counts, cities, and next event date", () => {
    const selected = selectDiscoverTours({
      nowMs,
      limit: 5,
      tours: [
        {
          id: "tour-1",
          slug: "summer-run",
          name: "Summer Run",
          status: "active",
          start_date: "2026-07-10",
          end_date: "2026-08-01",
          description: "West coast",
          settings: {},
        },
        {
          id: "tour-2",
          slug: "cancelled-run",
          name: "Cancelled",
          status: "cancelled",
          start_date: "2026-07-05",
          settings: {},
        },
      ],
      tourEvents: [
        {
          tour_id: "tour-1",
          event_id: "evt-1",
          events_v2: {
            id: "evt-1",
            title: "LA Night",
            slug: "la-night",
            start_at: "2026-07-12T20:00:00.000Z",
            settings: {
              venue_city: "Los Angeles",
              poster_url: "https://cdn.example.com/la.jpg",
            },
          },
        },
        {
          tour_id: "tour-1",
          event_id: "evt-2",
          events_v2: {
            id: "evt-2",
            title: "SF Night",
            slug: "sf-night",
            start_at: "2026-07-20T20:00:00.000Z",
            settings: { venue_city: "San Francisco" },
          },
        },
      ],
      tourArtists: [{ tour_id: "tour-1", artist_name: "Nova" }],
    })

    expect(selected).toHaveLength(1)
    expect(selected[0]?.slug).toBe("summer-run")
    expect(selected[0]?.event_count).toBe(2)
    expect(selected[0]?.cities).toEqual(["Los Angeles", "San Francisco"])
    expect(selected[0]?.artist_names).toEqual(["Nova"])
    expect(selected[0]?.next_event_date).toBe("2026-07-12T20:00:00.000Z")
    expect(selected[0]?.cover_url).toBe("https://cdn.example.com/la.jpg")
  })

  it("sorts by next event / start date ascending", () => {
    const selected = selectDiscoverTours({
      nowMs,
      limit: 2,
      tours: [
        {
          id: "later",
          slug: "later",
          name: "Later",
          status: "active",
          start_date: "2026-09-01",
          settings: {},
        },
        {
          id: "sooner",
          slug: "sooner",
          name: "Sooner",
          status: "active",
          start_date: "2026-07-15",
          settings: {},
        },
      ],
      tourEvents: [],
      tourArtists: [],
    })

    expect(selected.map((tour) => tour.slug)).toEqual(["sooner", "later"])
  })
})
