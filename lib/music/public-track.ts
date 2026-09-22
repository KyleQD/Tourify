import { createClient } from "@/lib/supabase/server"
import { isArtistEventDiscoverable } from "@/lib/artist/artist-event-visibility"

export interface PublicTrackArtist {
  id: string
  userId: string
  name: string
  slug: string | null
  username: string | null
  avatarUrl: string | null
  profilePath: string | null
}

export interface PublicTrackEvent {
  id: string
  title: string
  slug: string | null
  eventDate: string
  venueName: string | null
  location: string | null
  ticketUrl: string | null
}

export interface PublicTrackPageData {
  track: any
  artist: PublicTrackArtist
  relatedTracks: any[]
  upcomingEvents: PublicTrackEvent[]
  listing: any | null
}

const publicTrackSelect = `
  id, title, description, type, genre, release_date, duration,
  cover_art_url, lyrics, spotify_url, apple_music_url, soundcloud_url,
  youtube_url, tags, stats, is_featured, is_pinned, is_public, is_visible,
  moderation_status, rights_confirmed, access_mode, preview_mode,
  preview_duration_seconds, preview_status, allow_library_add,
  allow_profile_feature, allow_downloads, origin_status,
  certification_status, certification_level, certification_public_id,
  metadata, user_id, created_at, updated_at
`

function publicTrackQuery(query: any) {
  return query
    .eq("is_public", true)
    .eq("is_visible", true)
    .eq("moderation_status", "approved")
    .eq("rights_confirmed", true)
}

function mapEvent(event: any): PublicTrackEvent {
  return {
    id: String(event.id),
    title: String(event.title || event.name || "Upcoming show"),
    slug: event.slug ? String(event.slug) : null,
    eventDate: String(event.event_date || ""),
    venueName: event.venue_name ? String(event.venue_name) : null,
    location: [event.city, event.state, event.country].filter(Boolean).join(", ") || null,
    ticketUrl: event.ticket_url ? String(event.ticket_url) : null,
  }
}

export async function getPublicTrackPageData(trackId: string): Promise<PublicTrackPageData | null> {
  const supabase: any = await createClient()
  const { data: track, error: trackError } = await publicTrackQuery(
    supabase.from("artist_music").select(publicTrackSelect).eq("id", trackId)
  ).maybeSingle()

  if (trackError || !track) return null

  const [artistResult, relatedByArtistResult, relatedByGenreResult, eventsResult, listingResult] = await Promise.all([
    supabase
      .from("artist_profiles")
      .select("id, user_id, artist_name, url_slug")
      .eq("user_id", track.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    publicTrackQuery(
      supabase.from("artist_music").select(publicTrackSelect).eq("user_id", track.user_id).neq("id", track.id)
    ).order("is_pinned", { ascending: false }).order("is_featured", { ascending: false }).order("created_at", { ascending: false }).limit(8),
    track.genre
      ? publicTrackQuery(
          supabase.from("artist_music").select(publicTrackSelect).eq("genre", track.genre).neq("id", track.id)
        ).order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select("id, title, name, slug, event_date, venue_name, city, state, country, ticket_url, status, producer_settings, visibility, is_public")
      .eq("artist_id", track.user_id)
      .eq("status", "published")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date", { ascending: true })
      .limit(12),
    supabase
      .from("marketplace_listings")
      .select("id, title, base_price, currency, status, music_track_id")
      .eq("music_track_id", track.id)
      .eq("category", "music")
      .eq("status", "published")
      .limit(1)
      .maybeSingle(),
  ])

  const artistProfile = artistResult.data
  if (!artistProfile) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", track.user_id)
    .maybeSingle()

  const artistSlug = artistProfile.url_slug || profile?.username || null
  const artist: PublicTrackArtist = {
    id: String(artistProfile.id),
    userId: String(track.user_id),
    name: String(artistProfile.artist_name || "Artist"),
    slug: artistProfile.url_slug ? String(artistProfile.url_slug) : null,
    username: profile?.username ? String(profile.username) : null,
    avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : null,
    profilePath: artistSlug ? `/artist/${encodeURIComponent(String(artistSlug))}` : null,
  }

  const seen = new Set<string>([String(track.id)])
  const relatedTracks = [...(relatedByArtistResult.data || []), ...(relatedByGenreResult.data || [])]
    .filter((item: any) => {
      const id = String(item.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .slice(0, 8)

  return {
    track,
    artist,
    relatedTracks,
    upcomingEvents: (eventsResult.data || []).filter(isArtistEventDiscoverable).map(mapEvent).slice(0, 8),
    listing: listingResult.data || null,
  }
}
