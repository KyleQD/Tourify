import type { SupabaseClient } from "@supabase/supabase-js"
import {
  resolveEventPageSkinId,
  type EventPageSkinId,
} from "@/lib/events/event-skin-tokens"
import {
  normalizeEventPageLayout,
  type EventPageLayout,
} from "@/lib/events/event-page-layout"
import {
  getArtistPublicProfilePath,
  getVenuePublicProfilePath,
} from "@/lib/utils/public-profile-routes"

export interface EventHostArtist {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  is_verified: boolean
  bio: string | null
  artist_name: string | null
  url_slug: string | null
  social_links: Record<string, string> | null
  profile_path: string | null
}

export interface EventLinkedVenue {
  id: string
  venue_name: string | null
  description: string | null
  tagline: string | null
  url_slug: string | null
  avatar_url: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  social_links: Record<string, string> | null
  profile_path: string | null
}

export interface PublicEventPageData {
  id: string
  title: string
  description?: string | null
  type?: string | null
  venue_id?: string | null
  venue_name?: string | null
  venue_address?: string | null
  venue_city?: string | null
  venue_state?: string | null
  venue_country?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  doors_open?: string | null
  ticket_url?: string | null
  ticket_price_min?: number | null
  ticket_price_max?: number | null
  capacity?: number | null
  status: string
  is_public: boolean
  poster_url?: string | null
  setlist?: string[] | null
  tags?: string[] | null
  social_links?: Record<string, string> | null
  artist_id?: string | null
  user_id: string
  slug: string
  created_at: string
  updated_at: string
  creator?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
    bio?: string | null
    url_slug?: string | null
    profile_path?: string | null
  }
  hostArtist?: EventHostArtist | null
  linkedVenue?: EventLinkedVenue | null
  pageTemplate?: EventPageSkinId
  pageLayout?: EventPageLayout
  [key: string]: unknown
}

function asSocialLinks(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0
  )
  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

export async function enrichPublicEventPageData(params: {
  supabase: SupabaseClient
  event: Record<string, any>
}): Promise<PublicEventPageData> {
  const { supabase, event } = params
  const artistId = typeof event.artist_id === "string" ? event.artist_id : null
  const venueId = typeof event.venue_id === "string" ? event.venue_id : null

  let hostArtist: EventHostArtist | null = null
  let linkedVenue: EventLinkedVenue | null = null

  if (artistId) {
    const [profileResult, artistProfileResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, bio")
        .eq("id", artistId)
        .maybeSingle(),
      supabase
        .from("artist_profiles")
        .select("user_id, bio, artist_name, url_slug, social_links")
        .eq("user_id", artistId)
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileResult.data
    const artistProfile = artistProfileResult.data

    if (profile || artistProfile) {
      const urlSlug =
        (typeof artistProfile?.url_slug === "string" && artistProfile.url_slug.trim()) ||
        (typeof profile?.username === "string" && profile.username.trim()) ||
        null
      const bio =
        (typeof artistProfile?.bio === "string" && artistProfile.bio.trim()) ||
        (typeof profile?.bio === "string" && profile.bio.trim()) ||
        null
      const displayName =
        (typeof artistProfile?.artist_name === "string" && artistProfile.artist_name.trim()) ||
        (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
        urlSlug ||
        null
      const avatarUrl =
        (typeof profile?.avatar_url === "string" && profile.avatar_url) || null

      hostArtist = {
        id: artistId,
        username: profile?.username ?? urlSlug,
        full_name: displayName,
        avatar_url: avatarUrl,
        is_verified: Boolean(profile?.is_verified),
        bio,
        artist_name: artistProfile?.artist_name ?? null,
        url_slug: urlSlug,
        social_links: asSocialLinks(artistProfile?.social_links),
        profile_path: getArtistPublicProfilePath(urlSlug),
      }
    }
  }

  if (venueId) {
    const { data: venue } = await supabase
      .from("venue_profiles")
      .select(
        "id, venue_name, description, url_slug, avatar_url, address, city, state, country, social_links"
      )
      .eq("id", venueId)
      .maybeSingle()

    if (venue) {
      const description =
        (typeof venue.description === "string" && venue.description.trim()) || null
      const tagline = description
        ? description.split(/[.!?]/)[0]?.trim().slice(0, 140) || null
        : null

      linkedVenue = {
        id: venue.id,
        venue_name: venue.venue_name ?? null,
        description,
        tagline,
        url_slug: venue.url_slug ?? null,
        avatar_url: venue.avatar_url ?? null,
        address: venue.address ?? null,
        city: venue.city ?? null,
        state: venue.state ?? null,
        country: venue.country ?? null,
        social_links: asSocialLinks(venue.social_links),
        profile_path: getVenuePublicProfilePath({
          id: venue.id,
          url_slug: venue.url_slug,
        }),
      }
    }
  }

  const title =
    (typeof event.title === "string" && event.title) ||
    (typeof event.name === "string" && event.name) ||
    "Event"

  const producerSettings =
    event.producer_settings && typeof event.producer_settings === "object"
      ? (event.producer_settings as Record<string, unknown>)
      : {}
  const pageTemplate = resolveEventPageSkinId(
    typeof producerSettings.page_template === "string"
      ? producerSettings.page_template
      : null
  )
  const pageLayout = normalizeEventPageLayout(producerSettings.page_layout)

  const creator = hostArtist
    ? {
        id: hostArtist.id,
        username: hostArtist.username || hostArtist.url_slug || "artist",
        full_name: hostArtist.full_name || hostArtist.artist_name || "Artist",
        avatar_url: hostArtist.avatar_url || undefined,
        is_verified: hostArtist.is_verified,
        bio: hostArtist.bio,
        url_slug: hostArtist.url_slug,
        profile_path: hostArtist.profile_path,
      }
    : undefined

  // Resolve native ticketing target on events_v2 (never assume legacy events.id)
  let ticketingEventId: string | null =
    (typeof event.promoted_event_v2_id === "string" && event.promoted_event_v2_id) ||
    (typeof event.event_v2_id === "string" && event.event_v2_id) ||
    null
  let ticketingEnabled = false

  if (!ticketingEventId) {
    // events_v2 rows use the same id when the public page already loads v2
    const { data: asV2 } = await supabase
      .from("events_v2")
      .select("id")
      .eq("id", event.id)
      .maybeSingle()
    if (asV2?.id) ticketingEventId = asV2.id
  }

  if (ticketingEventId) {
    const [{ data: config }, { count }] = await Promise.all([
      supabase
        .from("event_ticketing_config")
        .select("ticketing_enabled")
        .eq("event_id", ticketingEventId)
        .maybeSingle(),
      supabase
        .from("ticket_types")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ticketingEventId)
        .eq("is_active", true),
    ])
    ticketingEnabled = Boolean(config?.ticketing_enabled) && (count ?? 0) > 0
    // If config row missing but active types exist, still allow purchase CTA
    if (!config && (count ?? 0) > 0) ticketingEnabled = true
  }

  return {
    ...event,
    id: event.id,
    title,
    description: event.description ?? null,
    type: event.type ?? event.event_type ?? null,
    venue_id: venueId,
    venue_name: event.venue_name ?? linkedVenue?.venue_name ?? null,
    venue_address: event.venue_address ?? event.address ?? linkedVenue?.address ?? null,
    venue_city: event.venue_city ?? event.city ?? linkedVenue?.city ?? null,
    venue_state: event.venue_state ?? event.state ?? linkedVenue?.state ?? null,
    venue_country: event.venue_country ?? event.country ?? linkedVenue?.country ?? null,
    event_date: event.event_date,
    start_time: event.start_time ?? null,
    end_time: event.end_time ?? null,
    doors_open: event.doors_open ?? null,
    ticket_url: event.ticket_url ?? null,
    ticket_price_min: event.ticket_price_min ?? null,
    ticket_price_max: event.ticket_price_max ?? null,
    capacity: event.capacity ?? null,
    status: event.status ?? "draft",
    is_public: Boolean(event.is_public),
    poster_url: event.poster_url ?? null,
    setlist: Array.isArray(event.setlist) ? event.setlist : null,
    tags: Array.isArray(event.tags) ? event.tags : null,
    social_links: asSocialLinks(event.social_links),
    artist_id: artistId,
    user_id: artistId || event.user_id || event.id,
    slug: event.slug || event.id,
    created_at: event.created_at,
    updated_at: event.updated_at,
    creator,
    hostArtist,
    linkedVenue,
    pageTemplate,
    pageLayout,
    ticketing_event_id: ticketingEventId,
    ticketing_enabled: ticketingEnabled,
  }
}
