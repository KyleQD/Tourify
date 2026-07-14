import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  buildEventSharePreview,
  canShareArtistEvent,
} from "@/lib/feed/event-share-preview"
import {
  buildEventShareMessagePayload,
  encodeTaskCardMessage,
} from "@/lib/feed/event-share-message"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("event share preview", () => {
  it("builds event_preview with slug url and location", () => {
    const preview = buildEventSharePreview({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "summer-show",
      title: "Summer Show",
      event_date: "2026-08-01T20:00:00Z",
      venue_name: "The Hall",
      city: "Austin",
      state: "TX",
      country: "USA",
      poster_url: "https://cdn.example.com/poster.jpg",
    })

    expect(preview).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "summer-show",
      title: "Summer Show",
      url: "/events/summer-show",
      eventDate: "2026-08-01",
      venueName: "The Hall",
      location: "Austin, TX, USA",
      posterUrl: "https://cdn.example.com/poster.jpg",
    })
  })

  it("falls back to id when slug is missing and drops invalid posters", () => {
    const preview = buildEventSharePreview({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Backup Title",
      poster_url: "event",
    })

    expect(preview.title).toBe("Backup Title")
    expect(preview.url).toBe("/events/22222222-2222-4222-8222-222222222222")
    expect(preview.posterUrl).toBeNull()
  })

  it("rejects private published events for non-owners", () => {
    expect(
      canShareArtistEvent({
        event: {
          status: "published",
          artist_id: "owner",
          producer_settings: { visibility: "private" },
        },
        viewerId: "fan",
      }),
    ).toBe(false)
  })

  it("allows unlisted published events by id and owner private shares", () => {
    expect(
      canShareArtistEvent({
        event: {
          status: "published",
          artist_id: "owner",
          producer_settings: { visibility: "unlisted" },
        },
        viewerId: "fan",
      }),
    ).toBe(true)

    expect(
      canShareArtistEvent({
        event: {
          status: "draft",
          artist_id: "owner",
          producer_settings: { visibility: "private" },
        },
        viewerId: "owner",
      }),
    ).toBe(true)
  })
})

describe("event share message payload", () => {
  it("builds absolute url content and task card", () => {
    const payload = buildEventShareMessagePayload({
      event: {
        id: "33333333-3333-4333-8333-333333333333",
        slug: "night-set",
        title: "Night Set",
        venue_name: "Warehouse",
        event_date: "2026-09-10",
      },
      note: "You should come",
      origin: "https://tourify.app",
    })

    expect(payload.content).toContain("You should come")
    expect(payload.content).toContain("Check out Night Set: https://tourify.app/events/night-set")
    expect(payload.taskCard).toMatchObject({
      title: "Night Set",
      action_url: "https://tourify.app/events/night-set",
      action_label: "View event",
    })
    expect(payload.taskCard.description).toContain("Warehouse")
  })

  it("encodes TASK markers for inbox rendering", () => {
    const encoded = encodeTaskCardMessage({
      title: "Night Set",
      description: "Warehouse",
      action_url: "https://tourify.app/events/night-set",
      action_label: "View event",
    })

    expect(encoded.startsWith("[TASK:")).toBe(true)
    expect(encoded).toContain('"action_url":"https://tourify.app/events/night-set"')
  })
})

describe("event share API contracts", () => {
  it("adds event branch to posts share route", () => {
    const share = read("app/api/posts/share/route.ts")
    expect(share).toContain("shared_content_type === 'event'")
    expect(share).toContain("contentRefType = 'event'")
    expect(share).toContain("event_preview")
    expect(share).toContain("canShareArtistEvent")
    expect(share).toContain("Shared an event:")
  })

  it("exposes share-message route with dm and group paths", () => {
    const route = read("app/api/events/[id]/share-message/route.ts")
    expect(route).toContain("Provide exactly one of recipientId or threadId")
    expect(route).toContain("canShareArtistEvent")
    expect(route).toContain('channel: "dm"')
    expect(route).toContain('channel: "group"')
    expect(route).toContain("thread_members")
    expect(route).toContain("encodeTaskCardMessage")
    expect(route).toContain('error: "Forbidden"')
  })

  it("wires feed enrichment and share menu for signed-in users", () => {
    const feedRoute = read("app/api/feed/posts/route.ts")
    expect(feedRoute).toContain("getStoredEventPreview")
    expect(feedRoute).toContain("event_preview: eventPreview")

    const social = read("components/feed/social-feed.tsx")
    expect(social).toContain("EventFeedPreview")
    expect(social).toContain("content_ref_type === 'event'")

    const dashboard = read("components/dashboard/dashboard-feed.tsx")
    expect(dashboard).toContain("EventFeedPreview")

    const page = read("components/events/enhanced-event-page.tsx")
    expect(page).toContain("EventShareMenu")
    expect(page).not.toContain("isSignedIn={Boolean(user)}")

    const menu = read("components/events/event-share-menu.tsx")
    expect(menu).toContain("Share to Feed")
    expect(menu).toContain("Send as Message")
    expect(menu).toContain("/api/profile/current")
    expect(menu).toContain("useAuth")
    expect(menu).toContain("/api/messages/user-search")
    expect(menu).toContain("/api/groups/threads")
    expect(menu).toContain("/api/events/${eventId}/share-message")

    const artistManage = read("app/artist/events/[id]/page.tsx")
    expect(artistManage).toContain("EventShareMenu")
    expect(artistManage).toContain("showShareMenu")
    expect(artistManage).toContain("setShowShareMenu(true)")
  })
})
