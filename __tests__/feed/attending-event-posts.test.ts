import { describe, expect, it } from "vitest"
import {
  mergeAttendingEventPostsIntoFeed,
  normalizeAttendingEventPost,
  shouldIncludeOrganizerEventPost,
} from "@/lib/feed/attending-event-posts"
import type { AttendingEventSummary } from "@/lib/events/get-upcoming-attending-events"

const event: AttendingEventSummary = {
  id: "evt-1",
  title: "Night Show",
  slug: "night-show",
  event_date: "2029-09-08",
  start_time: "19:00:00",
  venue_name: "Test Venue",
  venue_city: "Austin",
  poster_url: null,
  event_table: "events",
  owner_user_id: "artist-1",
}

describe("shouldIncludeOrganizerEventPost", () => {
  it("includes announcements for attendees", () => {
    expect(
      shouldIncludeOrganizerEventPost({
        post: {
          id: "p1",
          event_id: "evt-1",
          event_table: "events",
          user_id: "someone-else",
          content: "Doors at 6",
          visibility: "attendees",
          is_announcement: true,
          created_at: "2026-07-11T12:00:00Z",
        },
        event,
      })
    ).toBe(true)
  })

  it("includes organizer posts that are public", () => {
    expect(
      shouldIncludeOrganizerEventPost({
        post: {
          id: "p2",
          event_id: "evt-1",
          event_table: "events",
          user_id: "artist-1",
          content: "Setlist drop",
          visibility: "public",
          is_announcement: false,
          created_at: "2026-07-11T12:00:00Z",
        },
        event,
      })
    ).toBe(true)
  })

  it("excludes non-organizer non-announcement posts", () => {
    expect(
      shouldIncludeOrganizerEventPost({
        post: {
          id: "p3",
          event_id: "evt-1",
          event_table: "events",
          user_id: "fan-9",
          content: "Can't wait",
          visibility: "public",
          is_announcement: false,
          created_at: "2026-07-11T12:00:00Z",
        },
        event,
      })
    ).toBe(false)
  })

  it("excludes organizers-only visibility", () => {
    expect(
      shouldIncludeOrganizerEventPost({
        post: {
          id: "p4",
          event_id: "evt-1",
          event_table: "events",
          user_id: "artist-1",
          content: "Internal note",
          visibility: "organizers",
          is_announcement: true,
          created_at: "2026-07-11T12:00:00Z",
        },
        event,
      })
    ).toBe(false)
  })
})

describe("normalizeAttendingEventPost", () => {
  it("maps event posts into feed DTOs with event_update ref", () => {
    const normalized = normalizeAttendingEventPost({
      post: {
        id: "ep-1",
        event_id: "evt-1",
        event_table: "events",
        user_id: "artist-1",
        content: "Stage times posted",
        visibility: "attendees",
        is_announcement: true,
        media_urls: ["https://example.com/a.jpg"],
        likes_count: 3,
        comments_count: 1,
        created_at: "2026-07-11T15:00:00Z",
      },
      event,
      profile: {
        id: "artist-1",
        username: "kyle",
        full_name: "Kyle Artist",
        avatar_url: "https://example.com/av.png",
        is_verified: true,
      },
    })

    expect(normalized.id).toBe("event_post:ep-1")
    expect(normalized.content_ref_type).toBe("event_update")
    expect(normalized.content_ref_id).toBe("evt-1")
    expect(normalized.event_preview?.url).toBe("/events/night-show")
    expect(normalized.event_preview?.title).toBe("Night Show")
    expect(normalized.profiles?.username).toBe("kyle")
    expect(normalized.media_urls).toEqual(["https://example.com/a.jpg"])
  })
})

describe("mergeAttendingEventPostsIntoFeed", () => {
  it("interleaves by created_at on first page only", () => {
    const posts = [
      { id: "social-1", created_at: "2026-07-11T14:00:00Z", content: "hello" },
      { id: "social-2", created_at: "2026-07-11T10:00:00Z", content: "older" },
    ]
    const eventPosts = [
      normalizeAttendingEventPost({
        post: {
          id: "ep-2",
          event_id: "evt-1",
          event_table: "events",
          user_id: "artist-1",
          content: "Update",
          created_at: "2026-07-11T16:00:00Z",
          visibility: "public",
          is_announcement: true,
        },
        event,
        profile: null,
      }),
    ]

    const merged = mergeAttendingEventPostsIntoFeed({
      posts,
      eventPosts,
      limit: 20,
      offset: 0,
    })

    expect(merged[0].id).toBe("event_post:ep-2")
    expect(merged[1].id).toBe("social-1")
    expect(merged).toHaveLength(3)
  })

  it("does not inject event posts on later pages", () => {
    const posts = [{ id: "social-1", created_at: "2026-07-11T14:00:00Z" }]
    const eventPosts = [
      normalizeAttendingEventPost({
        post: {
          id: "ep-3",
          event_id: "evt-1",
          event_table: "events",
          user_id: "artist-1",
          content: "Update",
          created_at: "2026-07-11T16:00:00Z",
          visibility: "public",
          is_announcement: true,
        },
        event,
        profile: null,
      }),
    ]

    const merged = mergeAttendingEventPostsIntoFeed({
      posts,
      eventPosts,
      limit: 20,
      offset: 20,
    })

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe("social-1")
  })

  it("respects page limit after merge", () => {
    const posts = [
      { id: "a", created_at: "2026-07-11T12:00:00Z" },
      { id: "b", created_at: "2026-07-11T11:00:00Z" },
    ]
    const eventPosts = [
      normalizeAttendingEventPost({
        post: {
          id: "ep-4",
          event_id: "evt-1",
          event_table: "events",
          user_id: "artist-1",
          content: "Update",
          created_at: "2026-07-11T13:00:00Z",
          visibility: "public",
          is_announcement: true,
        },
        event,
        profile: null,
      }),
    ]

    const merged = mergeAttendingEventPostsIntoFeed({
      posts,
      eventPosts,
      limit: 2,
      offset: 0,
    })

    expect(merged).toHaveLength(2)
    expect(merged.map((p) => p.id)).toEqual(["event_post:ep-4", "a"])
  })
})
