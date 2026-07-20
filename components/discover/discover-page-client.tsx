"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Briefcase, Building2, Users } from "lucide-react"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { Button } from "@/components/ui/button"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import { DiscoverMasthead, type DiscoverSectionId } from "@/components/discover/discover-masthead"
import {
  DiscoverHorizontalRail,
  DiscoverSection,
} from "@/components/discover/discover-section"
import { DiscoverArtistCard } from "@/components/discover/discover-artist-card"
import { DiscoverVenueCard } from "@/components/discover/discover-venue-card"
import { DiscoverEventCard } from "@/components/discover/discover-event-card"
import { DiscoverTourCard } from "@/components/discover/discover-tour-card"
import { DiscoverSongCard } from "@/components/discover/discover-song-card"
import { DiscoverAlbumCard } from "@/components/discover/discover-album-card"
import { trackDashboardUxEvent } from "@/lib/analytics/ux-event-client"
import type {
  DiscoverAlbum,
  DiscoverEvent,
  DiscoverMusicTrack,
  DiscoverProfile,
  DiscoverTour,
} from "@/lib/discover/types"
import {
  getArtistPublicProfilePath,
  getVenuePublicProfilePath,
} from "@/lib/utils/public-profile-routes"

interface DiscoverPayload {
  success: boolean
  sections: {
    upcoming: DiscoverEvent[]
    nearby_events?: DiscoverEvent[]
    new_artists?: DiscoverProfile[]
    venues?: DiscoverProfile[]
    tours?: DiscoverTour[]
    top_songs?: DiscoverMusicTrack[]
    top_albums_by_genre?: DiscoverAlbum[]
    new_music?: DiscoverMusicTrack[]
    trending_music?: DiscoverMusicTrack[]
  }
}

const LOCATION_STORAGE_KEY = "tourify.discover.location"

async function reverseGeocode({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    )

    if (!response.ok) throw new Error("Reverse geocode failed")

    const data = await response.json()
    const address = data?.address || {}

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.county ||
      ""
    const state = address.state || address.region || ""

    if (city && state) return `${city}, ${state}`
    if (city) return String(city)
    if (state) return String(state)
  } catch (error) {
    console.warn("Reverse geocoding failed, using coordinate fallback:", error)
  }

  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
}

function textIncludes(query: string, ...values: Array<string | null | undefined>) {
  return values.some((value) => String(value || "").toLowerCase().includes(query))
}

function toJukeboxTrack(track: {
  id: string
  title: string
  artist_name?: string
  artist_id?: string
  duration?: number | null
  file_url?: string
  cover_art_url?: string | null
  genre?: string | null
}): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: track.artist_name || "Artist",
    artist_id: track.artist_id,
    duration: track.duration || undefined,
    file_url: track.file_url || `/api/music/stream?trackId=${track.id}`,
    cover_art_url: track.cover_art_url || undefined,
    genre: track.genre || undefined,
    is_public: true,
  }
}

export function DiscoverPageClient() {
  const router = useRouter()
  const jukebox = useJukeboxOptional()
  const sectionRefs = useRef<Partial<Record<DiscoverSectionId, HTMLElement | null>>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [hasHydratedLocation, setHasHydratedLocation] = useState(false)
  const [sections, setSections] = useState<DiscoverPayload["sections"]>({
    upcoming: [],
    nearby_events: [],
    new_artists: [],
    venues: [],
    tours: [],
    top_songs: [],
    top_albums_by_genre: [],
  })

  useEffect(() => {
    void trackDashboardUxEvent({
      eventName: "discover_viewed",
      surface: "discover",
    })
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY)
      if (saved?.trim()) {
        setLocationInput(saved)
        setAppliedLocation(saved)
      }
    } catch {
      // ignore storage errors
    } finally {
      setHasHydratedLocation(true)
    }
  }, [])

  useEffect(() => {
    if (!hasHydratedLocation) return
    loadDiscover({ location: appliedLocation })
  }, [appliedLocation, hasHydratedLocation])

  useEffect(() => {
    if (!hasHydratedLocation) return
    try {
      if (appliedLocation.trim())
        window.localStorage.setItem(LOCATION_STORAGE_KEY, appliedLocation.trim())
      else window.localStorage.removeItem(LOCATION_STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }, [appliedLocation, hasHydratedLocation])

  async function loadDiscover(params: { location: string }) {
    setIsLoading(true)
    try {
      const discoverParams = new URLSearchParams({ limit: "12" })
      if (params.location.trim()) discoverParams.set("location", params.location.trim())

      const response = await fetch(`/api/discover?${discoverParams.toString()}`)
      if (!response.ok) throw new Error("Failed to load discover")

      const payload = (await response.json()) as DiscoverPayload
      setSections(payload.sections)
    } catch (error) {
      console.error("Discover load error:", error)
      toast.error("Unable to load discover right now")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser")
      return
    }

    setIsLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000,
        })
      })

      const { latitude, longitude } = position.coords
      const resolvedLocation = await reverseGeocode({ latitude, longitude })

      setLocationInput(resolvedLocation)
      setAppliedLocation(resolvedLocation)
      void trackDashboardUxEvent({
        eventName: "discover_location_applied",
        surface: "discover",
        metadata: { source: "geolocation", location: resolvedLocation },
      })
      toast.success(`Using location: ${resolvedLocation}`)
    } catch (error) {
      const geolocationError = error as GeolocationPositionError
      if (geolocationError?.code === 1) toast.error("Location permission denied")
      else if (geolocationError?.code === 2) toast.error("Unable to detect current location")
      else if (geolocationError?.code === 3) toast.error("Location request timed out")
      else toast.error("Failed to use current location")
    } finally {
      setIsLocating(false)
    }
  }

  function applyLocation() {
    const next = locationInput.trim()
    setAppliedLocation(next)
    void trackDashboardUxEvent({
      eventName: "discover_location_applied",
      surface: "discover",
      metadata: { source: "manual", location: next || null },
    })
  }

  function clearLocation() {
    setLocationInput("")
    setAppliedLocation("")
  }

  function scrollToSection(id: DiscoverSectionId) {
    const node = sectionRefs.current[id] || document.getElementById(id)
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    void trackDashboardUxEvent({
      eventName: "discover_search_submitted",
      surface: "discover",
      metadata: { query },
    })
    router.push(`/discover/users?q=${encodeURIComponent(query)}`)
  }

  function playTrack(
    track: {
      id: string
      title: string
      artist_name?: string
      artist_id?: string
      duration?: number | null
      file_url?: string
      cover_art_url?: string | null
      genre?: string | null
    },
    source: string
  ) {
    if (!jukebox || !track.file_url) {
      toast.error("Playback is unavailable right now")
      return
    }

    const jukeboxTrack = toJukeboxTrack(track)
    const isCurrent =
      jukebox.state.currentTrack?.id === track.id && jukebox.state.isPlaying
    if (isCurrent) jukebox.pause()
    else jukebox.play(jukeboxTrack, { source })
  }

  function openArtist(artist: DiscoverProfile) {
    void trackDashboardUxEvent({
      eventName: "discover_artist_opened",
      surface: "discover",
      metadata: { artistId: artist.id, username: artist.username },
    })
    router.push(getArtistPublicProfilePath(artist.username))
  }

  function openVenue(venue: DiscoverProfile) {
    void trackDashboardUxEvent({
      eventName: "discover_venue_opened",
      surface: "discover",
      metadata: { venueId: venue.id, username: venue.username },
    })
    const path = getVenuePublicProfilePath({
      id: venue.id,
      url_slug: venue.username,
    })
    if (!path) {
      toast.error("Venue profile unavailable")
      return
    }
    router.push(path)
  }

  function openEvent(event: DiscoverEvent) {
    void trackDashboardUxEvent({
      eventName: "discover_event_opened",
      surface: "discover",
      metadata: { eventId: event.id, slug: event.slug },
    })
    router.push(`/events/${event.slug || event.id}`)
  }

  function openTour(tour: DiscoverTour) {
    void trackDashboardUxEvent({
      eventName: "discover_tour_opened",
      surface: "discover",
      metadata: { tourId: tour.id, slug: tour.slug },
    })
    router.push(`/tours/${encodeURIComponent(tour.slug)}`)
  }

  function openAlbum(album: DiscoverAlbum) {
    void trackDashboardUxEvent({
      eventName: "discover_album_opened",
      surface: "discover",
      metadata: { albumId: album.id, artistId: album.artist_id },
    })
    const handle = album.artist_username || album.artist_id
    if (!handle) {
      toast.error("Artist profile unavailable")
      return
    }
    router.push(getArtistPublicProfilePath(handle))
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const artists = sections.new_artists || []
    const venues = sections.venues || []
    // Prefer full upcoming pool (all tables); nearby is boost/label only.
    const events =
      (sections.upcoming && sections.upcoming.length > 0
        ? sections.upcoming
        : sections.nearby_events) || []
    const tours = sections.tours || []
    const songs = sections.top_songs || []
    const albums = sections.top_albums_by_genre || []

    if (!query)
      return { artists, venues, events, tours, songs, albums }

    return {
      artists: artists.filter((artist) =>
        textIncludes(
          query,
          artist.display_name,
          artist.username,
          artist.bio,
          ...(artist.genres || [])
        )
      ),
      venues: venues.filter((venue) =>
        textIncludes(query, venue.display_name, venue.username, venue.bio, venue.location)
      ),
      events: events.filter((event) =>
        textIncludes(
          query,
          event.title,
          event.description,
          event.venue_name,
          event.venue_city,
          event.venue_state
        )
      ),
      tours: tours.filter((tour) =>
        textIncludes(
          query,
          tour.name,
          tour.description,
          ...(tour.cities || []),
          ...(tour.artist_names || [])
        )
      ),
      songs: songs.filter((track) =>
        textIncludes(query, track.title, track.artist_name, track.genre)
      ),
      albums: albums.filter((album) =>
        textIncludes(query, album.title, album.artist_name, album.genre)
      ),
    }
  }, [searchQuery, sections])

  const currentTrackId = jukebox?.state.currentTrack?.id
  const isPlaying = Boolean(jukebox?.state.isPlaying)

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 lg:px-8">
        <DiscoverMasthead
          searchQuery={searchQuery}
          locationInput={locationInput}
          appliedLocation={appliedLocation}
          isLocating={isLocating}
          onSearchQueryChange={setSearchQuery}
          onLocationInputChange={setLocationInput}
          onSearchSubmit={handleSearchSubmit}
          onApplyLocation={applyLocation}
          onClearLocation={clearLocation}
          onUseCurrentLocation={handleUseCurrentLocation}
          onScrollToSection={scrollToSection}
        />

        <div
          ref={(node) => {
            sectionRefs.current.artists = node
          }}
        >
          <DiscoverSection
            id="artists"
            title="Top New Artists"
            href="/discover/users"
            isLoading={isLoading}
            isEmpty={filtered.artists.length === 0}
            emptyMessage="No new artists to show yet. Browse people to find creators joining Tourify."
            emptyActionHref="/discover/users"
            emptyActionLabel="Browse people"
          >
            <DiscoverHorizontalRail>
              {filtered.artists.map((artist) => (
                <DiscoverArtistCard
                  key={artist.id}
                  artist={artist}
                  isPlaying={
                    Boolean(
                      artist.top_track &&
                        currentTrackId === artist.top_track.id &&
                        isPlaying
                    )
                  }
                  onOpen={() => openArtist(artist)}
                  onPlayTopTrack={() => {
                    if (!artist.top_track) return
                    playTrack(
                      {
                        ...artist.top_track,
                        artist_name: artist.display_name,
                        artist_id: artist.owner_user_id || artist.id,
                        genre: artist.genres?.[0] || null,
                      },
                      "discover_artist_card"
                    )
                  }}
                />
              ))}
            </DiscoverHorizontalRail>
          </DiscoverSection>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.venues = node
          }}
        >
          <DiscoverSection
            id="venues"
            title="Venues"
            href="/venues"
            isLoading={isLoading}
            isEmpty={filtered.venues.length === 0}
            emptyMessage="No venues to discover yet. Browse the venue directory as spaces join Tourify."
            emptyActionHref="/venues"
            emptyActionLabel="Browse venues"
          >
            <DiscoverHorizontalRail>
              {filtered.venues.map((venue) => (
                <DiscoverVenueCard
                  key={venue.id}
                  venue={venue}
                  onOpen={() => openVenue(venue)}
                />
              ))}
            </DiscoverHorizontalRail>
          </DiscoverSection>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.events = node
          }}
        >
          <DiscoverSection
            id="events"
            title="Upcoming Events"
            href="/discover/events"
            isLoading={isLoading}
            isEmpty={filtered.events.length === 0}
            emptyMessage={
              appliedLocation
                ? "No upcoming events matched that location yet."
                : "No upcoming events yet. Check back soon or browse all events."
            }
            emptyActionHref="/discover/events"
            emptyActionLabel="Browse events"
          >
            <DiscoverHorizontalRail>
              {filtered.events.map((event) => (
                <DiscoverEventCard
                  key={event.id}
                  event={event}
                  onOpen={() => openEvent(event)}
                />
              ))}
            </DiscoverHorizontalRail>
          </DiscoverSection>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.tours = node
          }}
        >
          <DiscoverSection
            id="tours"
            title="Tours"
            href="/discover/events"
            isLoading={isLoading}
            isEmpty={filtered.tours.length === 0}
            emptyMessage="No active tours to show yet. Check upcoming events for shows on the road."
            emptyActionHref="/discover/events"
            emptyActionLabel="Browse events"
          >
            <DiscoverHorizontalRail>
              {filtered.tours.map((tour) => (
                <DiscoverTourCard
                  key={tour.id}
                  tour={tour}
                  onOpen={() => openTour(tour)}
                />
              ))}
            </DiscoverHorizontalRail>
          </DiscoverSection>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.songs = node
          }}
        >
          <DiscoverSection
            id="songs"
            title="Top New Songs"
            href="/music"
            isLoading={isLoading}
            isEmpty={filtered.songs.length === 0}
            emptyMessage="No top songs yet. Explore the music library for the latest uploads."
            emptyActionHref="/music"
            emptyActionLabel="Open music"
          >
            <DiscoverHorizontalRail>
              {filtered.songs.map((track) => (
                <DiscoverSongCard
                  key={track.id}
                  track={track}
                  isPlaying={currentTrackId === track.id && isPlaying}
                  onPlay={() => playTrack(track, "discover_top_songs")}
                />
              ))}
            </DiscoverHorizontalRail>
          </DiscoverSection>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.albums = node
          }}
        >
          <DiscoverSection
            id="albums"
            title="Top New Albums"
            href="/music"
            isLoading={isLoading}
            isEmpty={filtered.albums.length === 0}
            emptyMessage="No albums ranked by genre yet. Artists can upload albums and EPs to appear here."
            emptyActionHref="/music"
            emptyActionLabel="Open music"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {filtered.albums.map((album) => (
                <DiscoverAlbumCard
                  key={album.id}
                  album={album}
                  isPlaying={currentTrackId === album.id && isPlaying}
                  onOpen={() => openAlbum(album)}
                  onPlay={() =>
                    playTrack(
                      {
                        id: album.id,
                        title: album.title,
                        artist_name: album.artist_name,
                        artist_id: album.artist_id,
                        file_url: album.file_url,
                        cover_art_url: album.cover_art_url,
                        genre: album.genre,
                      },
                      "discover_album"
                    )
                  }
                />
              ))}
            </div>
          </DiscoverSection>
        </div>

        <SurfaceCard className="border-white/10 bg-slate-900/50">
          <div className="flex flex-col gap-4 p-6">
            <div>
              <h3 className="text-lg font-semibold">More to explore</h3>
              <p className="mt-1 text-sm text-slate-400">
                Keep discovering people, venues, and opportunities across Tourify.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button asChild variant="outline" className="justify-between rounded-xl border-white/20">
                <Link href="/discover/users">
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    People
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between rounded-xl border-white/20">
                <Link href="/venues">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Venues
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between rounded-xl border-white/20">
                <Link href="/jobs">
                  <span className="inline-flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Jobs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
