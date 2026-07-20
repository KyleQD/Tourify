import type {
  DiscoverEvent,
  DiscoverMusicTrack,
  DiscoverProfile,
} from "@/lib/discover/types"

interface EnhancedSearchProfile {
  id: string
  type: "artist" | "venue" | "organization" | "user"
  username: string
  displayName: string
  avatar?: string
  bio?: string
  location?: string
  skills?: string[]
  genres?: string[]
  availability?: string
  verified: boolean
  followers: number
  following: number
  posts: number
  ownerUserId?: string
  accountId?: string | null
  created_at?: string
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeEventsFromDiscover(payload: unknown): DiscoverEvent[] {
  const events = Array.isArray((payload as { events?: unknown[] })?.events)
    ? ((payload as { events: unknown[] }).events as Record<string, unknown>[])
    : []

  return events
    .map((event) => {
      const settings =
        event.settings && typeof event.settings === "object"
          ? (event.settings as Record<string, unknown>)
          : {}

      const posterUrl =
        (typeof event.poster_url === "string" && event.poster_url) ||
        (typeof settings.poster_url === "string" && settings.poster_url) ||
        null

      const ticketPriceMin =
        toNullableNumber(event.ticket_price_min) ??
        toNullableNumber(settings.ticket_price_min) ??
        toNullableNumber(event.ticket_price) ??
        toNullableNumber(settings.ticket_price)

      const ticketPriceMax =
        toNullableNumber(event.ticket_price_max) ??
        toNullableNumber(settings.ticket_price_max) ??
        ticketPriceMin

      return {
        id: String(event.id || ""),
        slug: event.slug ? String(event.slug) : null,
        title: String(event.title || event.name || "Untitled event"),
        description: (event.description as string) || "",
        event_date: (event.event_date as string) || null,
        venue_name: (event.venue_name as string) || null,
        venue_city: (event.venue_city as string) || null,
        venue_state: (event.venue_state as string) || null,
        poster_url: posterUrl,
        ticket_price_min: ticketPriceMin,
        ticket_price_max: ticketPriceMax,
        ticket_currency:
          typeof event.ticket_currency === "string"
            ? event.ticket_currency
            : typeof settings.ticket_currency === "string"
              ? settings.ticket_currency
              : "USD",
        attendance: {
          attending: Number(
            (event.attendance as { attending?: number } | undefined)?.attending || 0
          ),
          interested: Number(
            (event.attendance as { interested?: number } | undefined)?.interested || 0
          ),
          total: Number((event.attendance as { total?: number } | undefined)?.total || 0),
        },
      } satisfies DiscoverEvent
    })
    .filter((event) => Boolean(event.id))
}

export function normalizeProfilesFromEnhanced(payload: unknown): DiscoverProfile[] {
  const results = Array.isArray((payload as { results?: unknown[] })?.results)
    ? ((payload as { results: EnhancedSearchProfile[] }).results as EnhancedSearchProfile[])
    : []

  return results
    .map((item): DiscoverProfile => {
      const accountType =
        item.type === "artist"
          ? "artist"
          : item.type === "venue"
            ? "venue"
            : item.type === "organization"
              ? "organization"
              : "general"
      const ownerUserId = String(
        item.ownerUserId || (accountType === "general" ? item.id : "") || ""
      )
      const accountId = item.accountId ? String(item.accountId) : null
      const genres = Array.isArray(item.genres)
        ? item.genres.map((genre) => String(genre).trim()).filter(Boolean)
        : []

      return {
        id:
          accountType === "general"
            ? ownerUserId || String(item.id)
            : accountId || String(item.id),
        username: String(item.username || ""),
        account_type: accountType,
        display_name: String(item.displayName || item.username || "User"),
        avatar_url: item.avatar || null,
        bio: item.bio || "",
        location: item.location || null,
        verified: Boolean(item.verified),
        stats: {
          followers: Number(item.followers || 0),
          following: Number(item.following || 0),
          posts: Number(item.posts || 0),
        },
        creator_type: item.type === "artist" ? item.skills?.[0] || null : null,
        service_offerings: item.type === "artist" ? item.skills?.slice(1, 8) || [] : [],
        available_for_hire: item.type === "artist" ? item.availability === "available" : false,
        owner_user_id: ownerUserId || null,
        account_id: accountId,
        genres,
        created_at: item.created_at || null,
        top_track: null,
      }
    })
    .filter((profile) => profile.id && profile.username)
}

export function normalizeMusicTracks(payload: unknown): DiscoverMusicTrack[] {
  const content = Array.isArray((payload as { content?: unknown[] })?.content)
    ? ((payload as { content: Record<string, unknown>[] }).content as Record<
        string,
        unknown
      >[])
    : []

  return content
    .filter((item) => {
      const metadata = item.metadata as { url?: string } | undefined
      return Boolean(metadata?.url)
    })
    .map((item) => {
      const author = item.author as
        | { id?: string; name?: string; username?: string | null }
        | undefined
      const metadata = item.metadata as {
        url?: string
        artist?: string
        genre?: string | null
        duration?: number | null
      }
      const engagement = item.engagement as { views?: number; likes?: number } | undefined

      return {
        id: String(item.id || ""),
        title: String(item.title || "Untitled"),
        artist_name: String(author?.name || metadata?.artist || "Artist"),
        artist_id: author?.id ? String(author.id) : undefined,
        artist_username: author?.username || null,
        cover_art_url: (item.cover_image as string) || null,
        file_url: metadata?.url,
        genre: metadata?.genre || null,
        duration: metadata?.duration ?? null,
        plays: Number(engagement?.views || 0),
        likes: Number(engagement?.likes || 0),
        created_at: (item.created_at as string) || null,
      } satisfies DiscoverMusicTrack
    })
    .filter((track) => Boolean(track.id))
}
