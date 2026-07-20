import {
  normalizeEventsFromDiscover,
  normalizeMusicTracks,
  normalizeProfilesFromEnhanced,
} from "@/lib/discover/normalize"
import { formatTicketPriceLabel } from "@/lib/discover/ticket-price"

describe("discover normalize helpers", () => {
  it("passes through event flyer and ticket prices", () => {
    const events = normalizeEventsFromDiscover({
      events: [
        {
          id: "evt-1",
          title: "Night Show",
          poster_url: "https://cdn.example.com/flyer.jpg",
          ticket_price_min: 25,
          ticket_price_max: 45,
          venue_city: "Austin",
          attendance: { attending: 10, interested: 4, total: 14 },
        },
      ],
    })

    expect(events[0]?.poster_url).toBe("https://cdn.example.com/flyer.jpg")
    expect(events[0]?.ticket_price_min).toBe(25)
    expect(events[0]?.ticket_price_max).toBe(45)
  })

  it("keeps real artist genres from enhanced search", () => {
    const profiles = normalizeProfilesFromEnhanced({
      results: [
        {
          id: "artist-1",
          type: "artist",
          username: "nova",
          displayName: "Nova",
          verified: true,
          followers: 12,
          following: 3,
          posts: 1,
          ownerUserId: "user-1",
          accountId: "acct-1",
          genres: ["Indie", "Electronic"],
          created_at: "2026-05-01T00:00:00.000Z",
        },
      ],
    })

    expect(profiles[0]?.genres).toEqual(["Indie", "Electronic"])
    expect(profiles[0]?.created_at).toBe("2026-05-01T00:00:00.000Z")
  })

  it("normalizes music tracks with plays and likes", () => {
    const tracks = normalizeMusicTracks({
      content: [
        {
          id: "track-1",
          title: "Signal",
          cover_image: "https://cdn.example.com/cover.jpg",
          created_at: "2026-07-01T00:00:00.000Z",
          author: { id: "user-1", name: "Nova", username: "nova" },
          engagement: { likes: 8, views: 120 },
          metadata: {
            url: "/api/music/stream?trackId=track-1",
            genre: "Indie",
            duration: 210,
          },
        },
      ],
    })

    expect(tracks[0]?.plays).toBe(120)
    expect(tracks[0]?.likes).toBe(8)
    expect(tracks[0]?.file_url).toContain("track-1")
  })

  it("formats ticket price labels from real values", () => {
    expect(formatTicketPriceLabel({})).toBe("Tickets TBA")
    expect(formatTicketPriceLabel({ ticketPriceMin: 0, ticketPriceMax: 0 })).toBe("Free")
    expect(formatTicketPriceLabel({ ticketPriceMin: 20, ticketPriceMax: 20 })).toBe("$20")
    expect(formatTicketPriceLabel({ ticketPriceMin: 15, ticketPriceMax: 40 })).toBe("$15–$40")
  })
})
