import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getUpcomingAttendingEvents,
  type AttendingEventSummary,
} from "@/lib/events/get-upcoming-attending-events"

export interface AttendingEventFeedPost {
  id: string
  user_id: string
  content: string
  type: string
  visibility: string
  location: string | null
  hashtags: string[]
  media_urls: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  posted_as_profile_id: string
  posted_as_type: string
  account_display_name: string | null
  account_username: string | null
  account_avatar_url: string | null
  content_ref_type: "event_update"
  content_ref_id: string
  article_preview: null
  listing_preview: null
  event_preview: {
    id: string
    slug: string | null
    title: string
    url: string
    eventDate: string | null
    venueName: string | null
    location: string | null
    posterUrl: string | null
  }
  metadata: {
    event_table: string
    is_announcement: boolean
    source: "event_posts"
  }
  profiles: {
    id: string
    username: string
    full_name: string
    avatar_url: string
    is_verified: boolean
  } | null
}

interface EventPostRow {
  id: string
  event_id: string
  event_table: string
  user_id: string
  content: string
  type?: string | null
  visibility?: string | null
  media_urls?: string[] | null
  likes_count?: number | null
  comments_count?: number | null
  is_pinned?: boolean | null
  is_announcement?: boolean | null
  created_at: string
  updated_at?: string | null
}

interface ProfileRow {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean | null
}

/**
 * Merge social feed posts with attending event organizer updates.
 * Event updates are only included on the first page (offset === 0) to avoid duplicates across pages.
 */
export function mergeAttendingEventPostsIntoFeed(params: {
  posts: any[]
  eventPosts: AttendingEventFeedPost[]
  limit: number
  offset: number
}) {
  const { posts, eventPosts, limit, offset } = params
  if (offset > 0 || eventPosts.length === 0) return posts.slice(0, limit)

  const merged = [...posts, ...eventPosts].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime()
    const bTime = new Date(b.created_at || 0).getTime()
    return bTime - aTime
  })

  return merged.slice(0, limit)
}

export function shouldIncludeOrganizerEventPost(params: {
  post: EventPostRow
  event: AttendingEventSummary
}) {
  const { post, event } = params
  const visibility = (post.visibility || "public").toLowerCase()
  if (visibility !== "public" && visibility !== "attendees") return false
  if (post.is_announcement) return true
  if (event.owner_user_id && post.user_id === event.owner_user_id) return true
  return false
}

export function normalizeAttendingEventPost(params: {
  post: EventPostRow
  event: AttendingEventSummary
  profile: ProfileRow | null
}): AttendingEventFeedPost {
  const { post, event, profile } = params
  const username = profile?.username || "artist"
  const fullName = profile?.full_name || username
  const avatar = profile?.avatar_url || ""

  return {
    id: `event_post:${post.id}`,
    user_id: post.user_id,
    content: post.content || "",
    type: post.type || "text",
    visibility: post.visibility || "public",
    location: event.venue_city || null,
    hashtags: [],
    media_urls: Array.isArray(post.media_urls) ? post.media_urls : [],
    likes_count: post.likes_count || 0,
    comments_count: post.comments_count || 0,
    shares_count: 0,
    is_pinned: Boolean(post.is_pinned),
    created_at: post.created_at,
    updated_at: post.updated_at || post.created_at,
    posted_as_profile_id: post.user_id,
    posted_as_type: "artist",
    account_display_name: fullName,
    account_username: username,
    account_avatar_url: avatar,
    content_ref_type: "event_update",
    content_ref_id: event.id,
    article_preview: null,
    listing_preview: null,
    event_preview: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      url: `/events/${event.slug || event.id}`,
      eventDate: event.event_date,
      venueName: event.venue_name,
      location: event.venue_city,
      posterUrl: event.poster_url,
    },
    metadata: {
      event_table: event.event_table,
      is_announcement: Boolean(post.is_announcement),
      source: "event_posts",
    },
    profiles: {
      id: profile?.id || post.user_id,
      username,
      full_name: fullName,
      avatar_url: avatar,
      is_verified: Boolean(profile?.is_verified),
    },
  }
}

export async function fetchAttendingEventFeedPosts(params: {
  supabase: SupabaseClient
  userId: string
  limit?: number
}): Promise<AttendingEventFeedPost[]> {
  const limit = params.limit ?? 20

  try {
    // Include past attending events for feed updates (not only upcoming).
    const { data: attendance, error: attendanceError } = await params.supabase
      .from("event_attendance")
      .select("event_id, event_table, status")
      .eq("user_id", params.userId)
      .eq("status", "attending")

    if (attendanceError || !attendance?.length) return []

    // Prefer upcoming events for context, but also resolve any attending ids for posts.
    const upcoming = await getUpcomingAttendingEvents({
      supabase: params.supabase,
      userId: params.userId,
      limit: 50,
    })
    const upcomingByKey = new Map(
      upcoming.map((event) => [`${event.event_table}:${event.id}`, event])
    )

    // Fetch posts for all attending event ids (grouped by table).
    const byTable = new Map<string, string[]>()
    for (const row of attendance) {
      if (!row.event_id || !row.event_table) continue
      const list = byTable.get(row.event_table) || []
      list.push(row.event_id)
      byTable.set(row.event_table, list)
    }

    const postBatches = await Promise.all(
      Array.from(byTable.entries()).map(async ([eventTable, eventIds]) => {
        const uniqueIds = [...new Set(eventIds)]
        const { data, error } = await params.supabase
          .from("event_posts")
          .select(
            "id, event_id, event_table, user_id, content, type, visibility, media_urls, likes_count, comments_count, is_pinned, is_announcement, created_at, updated_at"
          )
          .eq("event_table", eventTable)
          .in("event_id", uniqueIds)
          .in("visibility", ["public", "attendees"])
          .order("created_at", { ascending: false })
          .limit(limit)

        if (error || !data) {
          console.warn("[attending-event-posts] fetch failed:", error)
          return [] as EventPostRow[]
        }
        return data as EventPostRow[]
      })
    )

    const rawPosts = postBatches.flat()
    if (rawPosts.length === 0) return []

    // Resolve missing event summaries for past attending events that still have posts.
    const missingEventKeys = new Set<string>()
    for (const post of rawPosts) {
      const key = `${post.event_table}:${post.event_id}`
      if (!upcomingByKey.has(key)) missingEventKeys.add(key)
    }

    if (missingEventKeys.size > 0) {
      const extra = await resolveEventsByKeys(params.supabase, [...missingEventKeys])
      for (const event of extra) {
        upcomingByKey.set(`${event.event_table}:${event.id}`, event)
      }
    }

    const authorIds = [...new Set(rawPosts.map((post) => post.user_id).filter(Boolean))]
    const profilesById = new Map<string, ProfileRow>()
    if (authorIds.length > 0) {
      const { data: profiles } = await params.supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .in("id", authorIds)
      for (const profile of profiles || []) {
        profilesById.set(profile.id, profile as ProfileRow)
      }
    }

    const normalized: AttendingEventFeedPost[] = []
    for (const post of rawPosts) {
      const event = upcomingByKey.get(`${post.event_table}:${post.event_id}`)
      if (!event) continue
      if (!shouldIncludeOrganizerEventPost({ post, event })) continue
      normalized.push(
        normalizeAttendingEventPost({
          post,
          event,
          profile: profilesById.get(post.user_id) || null,
        })
      )
    }

    return normalized
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  } catch (error) {
    console.warn("[attending-event-posts] unexpected error:", error)
    return []
  }
}

async function resolveEventsByKeys(
  supabase: SupabaseClient,
  keys: string[]
): Promise<AttendingEventSummary[]> {
  const byTable = new Map<string, string[]>()
  for (const key of keys) {
    const [table, id] = key.split(":")
    if (!table || !id) continue
    const list = byTable.get(table) || []
    list.push(id)
    byTable.set(table, list)
  }

  const results: AttendingEventSummary[] = []

  for (const [table, ids] of byTable.entries()) {
    const uniqueIds = [...new Set(ids)]
    if (table === "events") {
      const { data } = await supabase
        .from("events")
        .select("id, title, name, slug, event_date, start_time, venue_name, city, poster_url, artist_id")
        .in("id", uniqueIds)
      for (const row of data || []) {
        results.push({
          id: row.id,
          title: row.title || row.name || "Event",
          slug: row.slug || null,
          event_date: row.event_date,
          start_time: row.start_time || null,
          venue_name: row.venue_name || null,
          venue_city: row.city || null,
          poster_url: row.poster_url || null,
          event_table: "events",
          owner_user_id: row.artist_id || null,
        })
      }
    } else if (table === "artist_events") {
      const { data } = await supabase
        .from("artist_events")
        .select("id, title, slug, event_date, start_time, venue_name, venue_city, poster_url, user_id")
        .in("id", uniqueIds)
      for (const row of data || []) {
        results.push({
          id: row.id,
          title: row.title || "Event",
          slug: row.slug || null,
          event_date: row.event_date,
          start_time: row.start_time || null,
          venue_name: row.venue_name || null,
          venue_city: row.venue_city || null,
          poster_url: row.poster_url || null,
          event_table: "artist_events",
          owner_user_id: row.user_id || null,
        })
      }
    } else if (table === "events_v2") {
      const { data } = await supabase
        .from("events_v2")
        .select("id, title, slug, start_at, created_by, settings")
        .in("id", uniqueIds)
      for (const row of data || []) {
        const settings =
          row.settings && typeof row.settings === "object"
            ? (row.settings as Record<string, unknown>)
            : {}
        const startAt = typeof row.start_at === "string" ? row.start_at : null
        results.push({
          id: row.id,
          title: row.title || "Event",
          slug: row.slug || null,
          event_date: startAt ? startAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          start_time: startAt ? startAt.slice(11, 16) : null,
          venue_name:
            typeof settings.venue_label === "string" ? settings.venue_label : null,
          venue_city:
            typeof settings.venue_city === "string" ? settings.venue_city : null,
          poster_url: null,
          event_table: "events_v2",
          owner_user_id: row.created_by || null,
        })
      }
    }
  }

  return results
}
