"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SurfaceCard, SurfaceHero, SurfaceInput } from "@/components/surface/surface-primitives"
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Compass,
  Disc3,
  Flame,
  Heart,
  Loader2,
  MapPin,
  Music,
  Pause,
  Play,
  Search,
  Sparkles,
  Users,
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { getArtistPublicProfilePath, resolvePublicProfilePath } from "@/lib/utils/public-profile-routes"
import { FollowFriendButton } from "@/components/social/follow-friend-button"

interface DiscoverProfile {
  id: string
  username: string
  account_type: "artist" | "venue" | "organization" | "general"
  display_name: string
  avatar_url?: string | null
  bio?: string
  location?: string | null
  verified: boolean
  stats: {
    followers: number
    following: number
    posts: number
  }
  creator_type?: string | null
  service_offerings?: string[]
  available_for_hire?: boolean
  owner_user_id?: string | null
  account_id?: string | null
}

interface DiscoverEvent {
  id: string
  slug: string | null
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
  attendance: {
    attending: number
    interested: number
    total: number
  }
}

interface DiscoverPost {
  id: string
  user_id?: string | null
  author_profile_id?: string | null
  account_type?: string | null
  posted_as_type?: string | null
  content: string
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  profiles: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
    is_verified?: boolean
  }
}

interface ForYouItem {
  id: string
  item_type: "post" | "event" | "profile"
  score: number
  post?: DiscoverPost
  event?: DiscoverEvent
  profile?: DiscoverProfile
}

interface DiscoverMusicTrack {
  id: string
  title: string
  artist_name: string
  artist_id?: string
  artist_username?: string | null
  cover_art_url?: string | null
  file_url?: string
  genre?: string | null
  duration?: number | null
  plays?: number
  likes?: number
}

interface DiscoverPayload {
  success: boolean
  sections: {
    for_you: ForYouItem[]
    trending: DiscoverPost[]
    upcoming: DiscoverEvent[]
    people: DiscoverProfile[]
    artists: DiscoverProfile[]
    venues: DiscoverProfile[]
    organizations?: DiscoverProfile[]
    suggestions: DiscoverProfile[]
    hire_matches: DiscoverProfile[]
    new_music?: DiscoverMusicTrack[]
    trending_music?: DiscoverMusicTrack[]
    new_artists?: DiscoverProfile[]
    nearby_events?: DiscoverEvent[]
  }
  stats: {
    trending_count: number
    upcoming_count: number
    people_count: number
    suggestions_count: number
    hire_matches_count: number
  }
}

type DiscoverSectionId = "for-you" | "near-you" | "artists" | "music" | "posts" | "venues" | "organizations"

const LOCATION_STORAGE_KEY = "tourify.discover.location"

const SECTION_CHIPS: Array<{ id: DiscoverSectionId; label: string }> = [
  { id: "near-you", label: "Near You" },
  { id: "artists", label: "Artists" },
  { id: "music", label: "Music" },
  { id: "posts", label: "Posts" },
  { id: "venues", label: "Venues" },
  { id: "organizations", label: "Orgs" },
]

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

export default function DiscoverPage() {
  const router = useRouter()
  const { user } = useAuth()
  const jukebox = useJukeboxOptional()
  const sectionRefs = useRef<Partial<Record<DiscoverSectionId, HTMLElement | null>>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [hasHydratedLocation, setHasHydratedLocation] = useState(false)
  const [sections, setSections] = useState<DiscoverPayload["sections"]>({
    for_you: [],
    trending: [],
    upcoming: [],
    people: [],
    artists: [],
    venues: [],
    organizations: [],
    suggestions: [],
    hire_matches: [],
    new_music: [],
    trending_music: [],
    new_artists: [],
    nearby_events: [],
  })

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
    setAppliedLocation(locationInput.trim())
  }

  function clearLocation() {
    setLocationInput("")
    setAppliedLocation("")
  }

  function scrollToSection(id: DiscoverSectionId) {
    const node = sectionRefs.current[id]
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/discover/users?q=${encodeURIComponent(query)}`)
  }

  function handlePlayTrack(track: DiscoverMusicTrack) {
    if (!jukebox || !track.file_url) {
      toast.error("Playback is unavailable right now")
      return
    }

    const jukeboxTrack: JukeboxTrack = {
      id: track.id,
      title: track.title,
      artist_name: track.artist_name,
      artist_id: track.artist_id,
      duration: track.duration || undefined,
      file_url: track.file_url,
      cover_art_url: track.cover_art_url || undefined,
      genre: track.genre || undefined,
      is_public: true,
    }

    const isCurrent =
      jukebox.state.currentTrack?.id === track.id && jukebox.state.isPlaying
    if (isCurrent) jukebox.pause()
    else jukebox.play(jukeboxTrack)
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sections

    return {
      ...sections,
      for_you: sections.for_you.filter((item) => {
        if (item.post)
          return textIncludes(query, item.post.content, item.post.profiles.username)
        if (item.event)
          return textIncludes(
            query,
            item.event.title,
            item.event.venue_name,
            item.event.venue_city
          )
        if (item.profile)
          return textIncludes(
            query,
            item.profile.display_name,
            item.profile.username,
            item.profile.bio,
            item.profile.location
          )
        return false
      }),
      trending: sections.trending.filter((post) =>
        textIncludes(query, post.content, post.profiles.username, post.profiles.full_name)
      ),
      upcoming: sections.upcoming.filter((event) =>
        textIncludes(query, event.title, event.venue_name, event.venue_city, event.venue_state)
      ),
      nearby_events: (sections.nearby_events || []).filter((event) =>
        textIncludes(query, event.title, event.venue_name, event.venue_city, event.venue_state)
      ),
      artists: sections.artists.filter((profile) =>
        textIncludes(
          query,
          profile.display_name,
          profile.username,
          profile.bio,
          profile.location,
          profile.creator_type
        )
      ),
      new_artists: (sections.new_artists || []).filter((profile) =>
        textIncludes(
          query,
          profile.display_name,
          profile.username,
          profile.bio,
          profile.location
        )
      ),
      suggestions: sections.suggestions.filter((profile) =>
        textIncludes(query, profile.display_name, profile.username, profile.bio, profile.location)
      ),
      venues: sections.venues.filter((profile) =>
        textIncludes(query, profile.display_name, profile.username, profile.bio, profile.location)
      ),
      organizations: (sections.organizations || []).filter((profile) =>
        textIncludes(query, profile.display_name, profile.username, profile.bio, profile.location)
      ),
      new_music: (sections.new_music || []).filter((track) =>
        textIncludes(query, track.title, track.artist_name, track.genre)
      ),
      trending_music: (sections.trending_music || []).filter((track) =>
        textIncludes(query, track.title, track.artist_name, track.genre)
      ),
    }
  }, [sections, searchQuery])

  const nearYouEvents =
    appliedLocation && (filtered.nearby_events?.length || 0) > 0
      ? filtered.nearby_events || []
      : filtered.upcoming

  const artistRail = useMemo(() => {
    const seen = new Set<string>()
    const combined = [
      ...(filtered.new_artists || []),
      ...filtered.suggestions.filter((profile) => profile.account_type === "artist"),
      ...filtered.artists,
    ]
    return combined.filter((profile) => {
      if (seen.has(profile.id)) return false
      seen.add(profile.id)
      return true
    })
  }, [filtered.artists, filtered.new_artists, filtered.suggestions])

  const musicRail = useMemo(() => {
    const seen = new Set<string>()
    const combined = [...(filtered.new_music || []), ...(filtered.trending_music || [])]
    return combined.filter((track) => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
  }, [filtered.new_music, filtered.trending_music])

  const featuredEvent = nearYouEvents[0] || null
  const featuredArtist = artistRail[0] || null
  const showForYou = Boolean(user) && filtered.for_you.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">
        <SurfaceHero className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200">
                <Compass className="h-4 w-4" />
                Discover
              </div>
              <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                Find artists, shows near you, new music, and what&apos;s trending
              </h1>
              <p className="text-base text-slate-300 md:text-lg">
                Explore the local scene and grow your graph beyond who you already follow.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-white/20 text-slate-200 hover:bg-white/10">
                <Link href="/discover/events">All events</Link>
              </Button>
              <Button asChild className="rounded-xl bg-violet-600 hover:bg-violet-700">
                <Link href="/discover/users">Find people</Link>
              </Button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <SurfaceInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search artists, events, music, venues..."
              className="pl-9"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <SurfaceInput
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    applyLocation()
                  }
                }}
                placeholder="City, state"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-slate-200 hover:bg-white/10"
              onClick={applyLocation}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-slate-200 hover:bg-white/10"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Near me
            </Button>
            {appliedLocation ? (
              <>
                <Badge className="border-emerald-500/30 bg-emerald-500/20 text-emerald-200">
                  Near {appliedLocation}
                </Badge>
                <Button
                  variant="ghost"
                  className="text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={clearLocation}
                >
                  Clear
                </Button>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {SECTION_CHIPS.map((chip) => (
              <Button
                key={chip.id}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={() => scrollToSection(chip.id)}
              >
                {chip.label}
              </Button>
            ))}
          </div>

          {!isLoading && (featuredEvent || featuredArtist) ? (
            <FeaturedHero
              event={featuredEvent}
              artist={featuredArtist}
              locationLabel={appliedLocation}
              onOpenEvent={() => featuredEvent && openEvent(router, featuredEvent)}
              onOpenArtist={() => featuredArtist && openProfile(router, featuredArtist)}
            />
          ) : null}
        </SurfaceHero>

        {showForYou ? (
          <section
            ref={(node) => {
              sectionRefs.current["for-you"] = node
            }}
            className="scroll-mt-24 space-y-4"
          >
            <SectionHeader title="For You" href="/discover/users" />
            {isLoading ? (
              <LoadingRail />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.for_you.slice(0, 6).map((item) => (
                  <ForYouCard
                    key={item.id}
                    item={item}
                    onOpenProfile={(profile) => openProfile(router, profile)}
                    onOpenEvent={(event) => openEvent(router, event)}
                    onOpenPost={(post) => openPost(router, post)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section
          ref={(node) => {
            sectionRefs.current["near-you"] = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader
            title={appliedLocation ? `Happening near ${appliedLocation}` : "Happening Near You"}
            href="/discover/events"
          />
          {isLoading ? (
            <LoadingRail />
          ) : nearYouEvents.length > 0 ? (
            <HorizontalRail>
              {nearYouEvents.map((event) => (
                <div key={event.id} className="w-[280px] flex-shrink-0">
                  <EventCard event={event} onOpen={() => openEvent(router, event)} />
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <EmptyState
              message={
                appliedLocation
                  ? "No upcoming events near that location yet. Try another city or browse all events."
                  : "Set your location to prioritize local shows, or browse upcoming events nationwide."
              }
              actionHref="/discover/events"
              actionLabel="Browse events"
              secondaryAction={
                !appliedLocation
                  ? { label: "Use Near me", onClick: handleUseCurrentLocation }
                  : undefined
              }
            />
          )}
        </section>

        <section
          ref={(node) => {
            sectionRefs.current.artists = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader title="Artists to Discover" href="/discover/users" />
          {isLoading ? (
            <LoadingRail />
          ) : artistRail.length > 0 ? (
            <HorizontalRail>
              {artistRail.slice(0, 12).map((profile) => (
                <div key={profile.id} className="w-[240px] flex-shrink-0">
                  <ProfileCard
                    profile={profile}
                    onOpen={() => openProfile(router, profile)}
                  />
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <EmptyState
              message="No artist suggestions right now. Explore the people directory to find creators."
              actionHref="/discover/users"
              actionLabel="Find people"
            />
          )}
        </section>

        <section
          ref={(node) => {
            sectionRefs.current.music = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader title="Fresh Music" href="/music" />
          {isLoading ? (
            <LoadingRail />
          ) : musicRail.length > 0 ? (
            <HorizontalRail>
              {musicRail.slice(0, 12).map((track) => (
                <div key={track.id} className="w-[220px] flex-shrink-0">
                  <MusicTrackCard
                    track={track}
                    isPlaying={
                      jukebox?.state.currentTrack?.id === track.id && Boolean(jukebox?.state.isPlaying)
                    }
                    onPlay={() => handlePlayTrack(track)}
                    canPlay={Boolean(jukebox && track.file_url)}
                  />
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <EmptyState
              message="No tracks discovered yet. Check back as artists upload new music."
              actionHref="/music"
              actionLabel="Open music"
            />
          )}
        </section>

        <section
          ref={(node) => {
            sectionRefs.current.posts = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader title="Trending on Tourify" href="/" />
          {isLoading ? (
            <LoadingRail />
          ) : filtered.trending.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.trending.slice(0, 9).map((post) => (
                <PostCard key={post.id} post={post} onOpen={() => openPost(router, post)} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="No trending posts on Tourify right now. Follow artists and check back soon."
              actionHref="/"
              actionLabel="Open feed"
            />
          )}
        </section>

        <section
          ref={(node) => {
            sectionRefs.current.venues = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader title="Venues Nearby" href="/discover/users" />
          {isLoading ? (
            <LoadingRail />
          ) : filtered.venues.length > 0 ? (
            <HorizontalRail>
              {filtered.venues.slice(0, 12).map((profile) => (
                <div key={profile.id} className="w-[240px] flex-shrink-0">
                  <ProfileCard
                    profile={profile}
                    onOpen={() => openProfile(router, profile)}
                  />
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <EmptyState
              message={
                appliedLocation
                  ? "No venues matched that location yet. Try a broader city or browse people."
                  : "Set a location to surface venues near you."
              }
              actionHref="/discover/users"
              actionLabel="Browse people"
            />
          )}
        </section>

        <section
          ref={(node) => {
            sectionRefs.current.organizations = node
          }}
          className="scroll-mt-24 space-y-4"
        >
          <SectionHeader title="Organizations" href="/discover/users" />
          {isLoading ? (
            <LoadingRail />
          ) : (filtered.organizations || []).length > 0 ? (
            <HorizontalRail>
              {(filtered.organizations || []).slice(0, 12).map((profile) => (
                <div key={profile.id} className="w-[240px] flex-shrink-0">
                  <ProfileCard
                    profile={profile}
                    onOpen={() => openProfile(router, profile)}
                  />
                </div>
              ))}
            </HorizontalRail>
          ) : (
            <EmptyState
              message="No organizations to discover yet. Follow orgs from search as they join Tourify."
              actionHref="/search"
              actionLabel="Search"
            />
          )}
        </section>

        <SurfaceCard className="border-white/10 bg-slate-900/50">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Briefcase className="h-4 w-4" />
                Looking for work or talent?
              </div>
              <p className="text-sm text-slate-400">
                Hire and job matching live on Jobs — Discover stays focused on culture and the scene.
              </p>
            </div>
            <Button asChild className="rounded-xl">
              <Link href="/jobs">
                Open Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </SurfaceCard>
      </div>
    </div>
  )
}

function FeaturedHero({
  event,
  artist,
  locationLabel,
  onOpenEvent,
  onOpenArtist,
}: {
  event: DiscoverEvent | null
  artist: DiscoverProfile | null
  locationLabel: string
  onOpenEvent: () => void
  onOpenArtist: () => void
}) {
  if (event) {
    return (
      <button
        type="button"
        onClick={onOpenEvent}
        className="w-full rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/40 p-5 text-left transition hover:border-white/25"
      >
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-violet-200">
          <Calendar className="h-3.5 w-3.5" />
          {locationLabel ? `Featured near ${locationLabel}` : "Featured event"}
        </div>
        <p className="text-xl font-semibold md:text-2xl">{event.title}</p>
        <p className="mt-1 text-sm text-slate-300">
          {[formatSafeDate(event.event_date || null), event.venue_name, event.venue_city]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
    )
  }

  if (!artist) return null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onOpenArtist} className="flex items-center gap-3 text-left">
        <Avatar className="h-14 w-14">
          <AvatarImage src={artist.avatar_url || ""} />
          <AvatarFallback>{artist.display_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-violet-200">
            <Users className="h-3.5 w-3.5" />
            Rising artist
          </div>
          <p className="text-xl font-semibold">{artist.display_name}</p>
          <p className="text-sm text-slate-300">
            @{artist.username}
            {artist.location ? ` · ${artist.location}` : ""}
          </p>
        </div>
      </button>
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-xl border-white/20" onClick={onOpenArtist}>
          View
        </Button>
        <FollowFriendButton
          kind="follow"
          accountType="artist"
          targetAccountId={artist.account_id || null}
          targetUserId={artist.owner_user_id || artist.id}
          className="rounded-xl"
        />
      </div>
    </div>
  )
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {href ? (
        <Button asChild variant="outline" size="sm" className="border-white/20 text-slate-200 hover:bg-white/10">
          <Link href={href}>
            See all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

function HorizontalRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 [scrollbar-width:thin]">
      {children}
    </div>
  )
}

function LoadingRail() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <SurfaceCard key={index} className="bg-slate-900/50">
          <CardContent className="flex items-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="text-slate-300">Loading discover content...</span>
          </CardContent>
        </SurfaceCard>
      ))}
    </div>
  )
}

function EmptyState({
  message,
  actionHref,
  actionLabel,
  secondaryAction,
}: {
  message: string
  actionHref?: string
  actionLabel?: string
  secondaryAction?: { label: string; onClick: () => void }
}) {
  return (
    <SurfaceCard className="bg-slate-900/60">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex flex-wrap gap-2">
          {actionHref && actionLabel ? (
            <Button asChild size="sm" className="rounded-xl">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-white/20"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </SurfaceCard>
  )
}

function ForYouCard({
  item,
  onOpenProfile,
  onOpenEvent,
  onOpenPost,
}: {
  item: ForYouItem
  onOpenProfile: (profile: DiscoverProfile) => void
  onOpenEvent: (event: DiscoverEvent) => void
  onOpenPost: (post: DiscoverPost) => void
}) {
  if (item.profile)
    return (
      <ProfileCard
        profile={item.profile}
        onOpen={() => onOpenProfile(item.profile!)}
        hideFollow
      />
    )

  if (item.event) return <EventCard event={item.event} onOpen={() => onOpenEvent(item.event!)} />

  if (item.post) return <PostCard post={item.post} onOpen={() => onOpenPost(item.post!)} />

  return null
}

function ProfileCard({
  profile,
  onOpen,
  hideFollow = false,
}: {
  profile: DiscoverProfile
  onOpen: () => void
  hideFollow?: boolean
}) {
  const isFollowable =
    profile.account_type === "artist" ||
    profile.account_type === "venue" ||
    profile.account_type === "organization"

  return (
    <motion.div whileHover={{ y: -2 }}>
      <SurfaceCard className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>{profile.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{profile.display_name}</CardTitle>
              <p className="truncate text-xs text-slate-400">@{profile.username}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {profile.account_type === "venue" ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  venue
                </span>
              ) : (
                profile.account_type
              )}
            </Badge>
            {profile.verified ? <Badge className="bg-blue-500/20 text-blue-200">Verified</Badge> : null}
            {profile.creator_type ? (
              <Badge className="border-fuchsia-500/30 bg-fuchsia-500/20 text-fuchsia-100">
                {profile.creator_type}
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 text-sm text-slate-300">{profile.bio || "No bio yet."}</p>
          {profile.location ? (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </div>
          ) : null}
          <div className="text-xs text-slate-400">{profile.stats.followers} followers</div>
          <div className="flex gap-2">
            <Button onClick={onOpen} size="sm" variant="outline" className="flex-1 rounded-xl border-white/20">
              View
            </Button>
            {!hideFollow ? (
              <FollowFriendButton
                kind={isFollowable ? "follow" : "friend"}
                accountType={profile.account_type}
                targetAccountId={isFollowable ? profile.account_id || null : null}
                targetUserId={profile.owner_user_id || (isFollowable ? null : profile.id)}
                className="flex-1 rounded-xl"
              />
            ) : null}
          </div>
        </CardContent>
      </SurfaceCard>
    </motion.div>
  )
}

function EventCard({ event, onOpen }: { event: DiscoverEvent; onOpen: () => void }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <SurfaceCard className="h-full">
        <CardHeader>
          <CardTitle className="text-base">{event.title}</CardTitle>
          <p className="text-xs text-slate-400">{formatSafeDate(event.event_date || null)}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-sm text-slate-300">
            {event.description || "No description yet."}
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3" />
            {[event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(", ") ||
              "Venue TBD"}
          </div>
          <div className="text-xs text-slate-400">{event.attendance.total} interested/attending</div>
          <Button onClick={onOpen} size="sm" className="w-full rounded-xl">
            <Calendar className="mr-2 h-3.5 w-3.5" />
            View Event
          </Button>
        </CardContent>
      </SurfaceCard>
    </motion.div>
  )
}

function PostCard({ post, onOpen }: { post: DiscoverPost; onOpen: () => void }) {
  return (
    <motion.div whileHover={{ y: -2 }}>
      <SurfaceCard className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.profiles.avatar_url || ""} />
                <AvatarFallback>{post.profiles.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {post.profiles.full_name || post.profiles.username}
                </p>
                <p className="truncate text-xs text-slate-400">@{post.profiles.username}</p>
              </div>
            </div>
            <Flame className="h-4 w-4 text-orange-300" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="line-clamp-4 text-sm text-slate-300">{post.content || "No content available."}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{post.likes_count} likes</span>
            <span>{post.comments_count} comments</span>
            <span>{post.shares_count} shares</span>
          </div>
          <div className="text-xs text-slate-500">{formatSafeDate(post.created_at)}</div>
          <Button onClick={onOpen} size="sm" variant="outline" className="w-full rounded-xl border-white/20">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Open post
          </Button>
        </CardContent>
      </SurfaceCard>
    </motion.div>
  )
}

function MusicTrackCard({
  track,
  onPlay,
  isPlaying,
  canPlay,
}: {
  track: DiscoverMusicTrack
  onPlay: () => void
  isPlaying: boolean
  canPlay: boolean
}) {
  const artistHandle = track.artist_username || track.artist_name
  const artistHref =
    getArtistPublicProfilePath(artistHandle) ||
    (track.artist_id ? `/artist/${track.artist_id}` : null)

  return (
    <motion.div whileHover={{ y: -2 }}>
      <SurfaceCard className="h-full">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            {track.cover_art_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.cover_art_url}
                alt=""
                className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                <Music className="h-6 w-6 text-white/60" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{track.title}</p>
              <p className="truncate text-sm text-slate-400">{track.artist_name}</p>
              {track.genre ? (
                <Badge
                  variant="secondary"
                  className="mt-1 border-violet-500/20 bg-violet-500/15 text-[10px] text-violet-300"
                >
                  {track.genre}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {track.plays !== undefined && track.plays > 0 ? (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {track.plays.toLocaleString()}
              </span>
            ) : null}
            {track.likes !== undefined && track.likes > 0 ? (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {track.likes.toLocaleString()}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {canPlay ? (
              <Button onClick={onPlay} size="sm" className="flex-1 rounded-xl">
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-3.5 w-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Play
                  </>
                )}
              </Button>
            ) : null}
            {artistHref ? (
              <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl border-white/20">
                <Link href={artistHref}>
                  <Disc3 className="mr-2 h-3.5 w-3.5" />
                  Artist
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </SurfaceCard>
    </motion.div>
  )
}

function openProfile(router: ReturnType<typeof useRouter>, profile: DiscoverProfile) {
  const path =
    resolvePublicProfilePath({
      id: profile.id,
      username: profile.username,
      account_type: profile.account_type,
    }) || `/profile/${profile.username}`
  router.push(path)
}

function openEvent(router: ReturnType<typeof useRouter>, event: DiscoverEvent) {
  if (event.slug) {
    router.push(`/events/${event.slug}`)
    return
  }

  router.push(`/events/${event.id}`)
}

function openPost(router: ReturnType<typeof useRouter>, post: DiscoverPost) {
  const username = post.profiles?.username
  if (!username) {
    router.push("/")
    return
  }
  const path = resolvePublicProfilePath({
    id: String(post.author_profile_id || post.user_id || post.profiles?.id || ''),
    username,
    account_type: post.account_type || post.posted_as_type || 'general',
  })
  router.push(path || `/profile/${username}`)
}
