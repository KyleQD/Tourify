"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { SurfaceCard, SurfaceHero, SurfaceInput, SurfaceTabsList } from "@/components/surface/surface-primitives"
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  Flame,
  GraduationCap,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface DiscoverProfile {
  id: string
  username: string
  account_type: "artist" | "venue" | "general"
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

interface DiscoverPayload {
  success: boolean
  sections: {
    for_you: ForYouItem[]
    trending: DiscoverPost[]
    upcoming: DiscoverEvent[]
    people: DiscoverProfile[]
    artists: DiscoverProfile[]
    venues: DiscoverProfile[]
    suggestions: DiscoverProfile[]
    hire_matches: DiscoverProfile[]
  }
  stats: {
    trending_count: number
    upcoming_count: number
    people_count: number
    suggestions_count: number
    hire_matches_count: number
  }
}

interface IntentOption {
  id: DiscoverIntent
  label: string
  description: string
  icon: React.ReactNode
}

type DiscoverIntent = "grow" | "network" | "book" | "learn"
type DiscoverTab = "for-you" | "events" | "trending" | "people" | "hire"

const intentOptions: IntentOption[] = [
  {
    id: "grow",
    label: "Grow Reach",
    description: "Spot proven creators and formats you can apply this week.",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: "network",
    label: "Build Team",
    description: "Connect with collaborators, venues, and operators that move projects forward.",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: "book",
    label: "Book Shows",
    description: "Find active stages and demand signals so you can close more dates.",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "learn",
    label: "Sharpen Skills",
    description: "Learn from high-signal posts and repeat what already works.",
    icon: <GraduationCap className="h-4 w-4" />,
  },
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

export default function DiscoverPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [creatorTypeInput, setCreatorTypeInput] = useState("")
  const [serviceInput, setServiceInput] = useState("")
  const [appliedCreatorType, setAppliedCreatorType] = useState("")
  const [appliedService, setAppliedService] = useState("")
  const [availableForHireOnly, setAvailableForHireOnly] = useState(false)
  const [selectedIntent, setSelectedIntent] = useState<DiscoverIntent>("grow")
  const [activeTab, setActiveTab] = useState<DiscoverTab>("for-you")
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<DiscoverPayload["stats"]>({
    trending_count: 0,
    upcoming_count: 0,
    people_count: 0,
    suggestions_count: 0,
    hire_matches_count: 0,
  })
  const [sections, setSections] = useState<DiscoverPayload["sections"]>({
    for_you: [],
    trending: [],
    upcoming: [],
    people: [],
    artists: [],
    venues: [],
    suggestions: [],
    hire_matches: [],
  })

  useEffect(() => {
    loadDiscover({
      intent: selectedIntent,
      location: appliedLocation,
      creatorType: appliedCreatorType,
      service: appliedService,
      availableForHire: availableForHireOnly
    })
  }, [selectedIntent, appliedLocation, appliedCreatorType, appliedService, availableForHireOnly])

  async function loadDiscover(params: {
    intent: DiscoverIntent
    location: string
    creatorType?: string
    service?: string
    availableForHire?: boolean
  }) {
    setIsLoading(true)
    try {
      const discoverParams = new URLSearchParams({
        limit: "12",
        intent: params.intent
      })
      if (params.location.trim()) discoverParams.set("location", params.location.trim())
      if (params.creatorType?.trim()) discoverParams.set("creatorType", params.creatorType.trim())
      if (params.service?.trim()) discoverParams.set("service", params.service.trim())
      if (params.availableForHire) discoverParams.set("availableForHire", "true")

      const response = await fetch(`/api/discover?${discoverParams.toString()}`)
      if (!response.ok) throw new Error("Failed to load discover")

      const payload = (await response.json()) as DiscoverPayload
      setSections(payload.sections)
      setStats(payload.stats)
    } catch (error) {
      console.error("Discover load error:", error)
      toast.error("Unable to load discover right now")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFollow(profileId: string) {
    if (!user) {
      toast.error("Please sign in to follow people")
      return
    }

    const isFollowing = followingIds.has(profileId)
    const action = isFollowing ? "unfollow" : "follow"

    try {
      const response = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          following_id: profileId,
          action,
        }),
      })

      if (!response.ok) throw new Error("Follow update failed")

      setFollowingIds((prev) => {
        const updated = new Set(prev)
        if (isFollowing) updated.delete(profileId)
        else updated.add(profileId)
        return updated
      })

      toast.success(isFollowing ? "Unfollowed" : "Following")
    } catch (error) {
      console.error("Follow action failed:", error)
      toast.error("Could not update follow status")
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
      if (geolocationError?.code === 1) {
        toast.error("Location permission denied")
      } else if (geolocationError?.code === 2) {
        toast.error("Unable to detect current location")
      } else if (geolocationError?.code === 3) {
        toast.error("Location request timed out")
      } else {
        toast.error("Failed to use current location")
      }
    } finally {
      setIsLocating(false)
    }
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sections

    const textIncludes = (...values: Array<string | null | undefined>) =>
      values.some((value) => String(value || "").toLowerCase().includes(query))

    return {
      ...sections,
      for_you: sections.for_you.filter((item) => {
        if (item.post) return textIncludes(item.post.content, item.post.profiles.username)
        if (item.event) return textIncludes(item.event.title, item.event.venue_name, item.event.venue_city)
        if (item.profile) return textIncludes(item.profile.display_name, item.profile.username, item.profile.bio, item.profile.location, item.profile.creator_type, ...(item.profile.service_offerings || []))
        return false
      }),
      trending: sections.trending.filter((post) => textIncludes(post.content, post.profiles.username)),
      upcoming: sections.upcoming.filter((event) => textIncludes(event.title, event.venue_name, event.venue_city, event.venue_state)),
      people: sections.people.filter((profile) => textIncludes(profile.display_name, profile.username, profile.bio, profile.location, profile.creator_type, ...(profile.service_offerings || []))),
      artists: sections.artists.filter((profile) => textIncludes(profile.display_name, profile.username, profile.bio, profile.location, profile.creator_type, ...(profile.service_offerings || []))),
      venues: sections.venues.filter((profile) => textIncludes(profile.display_name, profile.username, profile.bio, profile.location)),
      suggestions: sections.suggestions.filter((profile) => textIncludes(profile.display_name, profile.username, profile.bio, profile.location, profile.creator_type, ...(profile.service_offerings || []))),
      hire_matches: sections.hire_matches.filter((profile) => textIncludes(profile.display_name, profile.username, profile.bio, profile.location, profile.creator_type, ...(profile.service_offerings || []))),
    }
  }, [sections, searchQuery])

  const audienceSignal = stats.people_count + stats.suggestions_count + stats.trending_count * 2
  const tabAvailability = useMemo(
    () => ({
      "for-you": filtered.for_you.length > 0,
      events: filtered.upcoming.length > 0,
      trending: filtered.trending.length > 0,
      people: filtered.people.length > 0,
      hire: filtered.hire_matches.length > 0,
    }),
    [filtered]
  )
  const visibleTabs = useMemo(
    () => (Object.entries(tabAvailability) as Array<[DiscoverTab, boolean]>)
      .filter(([, isVisible]) => isVisible)
      .map(([tab]) => tab),
    [tabAvailability]
  )

  useEffect(() => {
    if (isLoading) return
    if (visibleTabs.includes(activeTab)) return
    setActiveTab(visibleTabs[0] || "for-you")
  }, [activeTab, isLoading, visibleTabs])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <SurfaceHero className="p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
                <Compass className="h-4 w-4" />
                Opportunity Radar
              </div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                Find the right opportunities faster
              </h1>
              <p className="text-slate-300 text-base md:text-lg">
                Track what is moving now, connect with the right people, and turn momentum into bookings, growth, and real outcomes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-white/20 text-slate-200 hover:bg-white/10">
                <Link href="/feed">Pulse</Link>
              </Button>
              <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-700">
                <Link href="/events">Explore Events</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SignalCard label="Trending signals" value={stats.trending_count} icon={<Flame className="h-4 w-4" />} />
            <SignalCard label="Upcoming events" value={stats.upcoming_count} icon={<Calendar className="h-4 w-4" />} />
            <SignalCard label="People to meet" value={stats.people_count} icon={<Users className="h-4 w-4" />} />
            <SignalCard label="Opportunity index" value={audienceSignal} icon={<Zap className="h-4 w-4" />} />
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            RSS-only mode enabled
          </div>

          <div className="mt-2 max-w-xl relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <SurfaceInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search people, events, venues, opportunities..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <SurfaceInput
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                placeholder="Narrow results by location (city, state)"
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-slate-200 hover:bg-white/10"
              onClick={() => setAppliedLocation(locationInput.trim())}
            >
              Apply Location
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-slate-200 hover:bg-white/10"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              Use my current location
            </Button>
            {appliedLocation ? (
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/10"
                onClick={() => {
                  setLocationInput("")
                  setAppliedLocation("")
                }}
              >
                Clear
              </Button>
            ) : null}
            {appliedLocation ? (
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/30">
                Near {appliedLocation}
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <SurfaceInput
              value={creatorTypeInput}
              onChange={(event) => setCreatorTypeInput(event.target.value)}
              placeholder="Creator type (photographer, designer...)"
            />
            <SurfaceInput
              value={serviceInput}
              onChange={(event) => setServiceInput(event.target.value)}
              placeholder="Service keyword (video, merch, styling...)"
            />
            <Button
              variant={availableForHireOnly ? "default" : "outline"}
              className={availableForHireOnly ? "rounded-xl bg-emerald-600 hover:bg-emerald-700" : "rounded-xl border-white/20 text-slate-200 hover:bg-white/10"}
              onClick={() => setAvailableForHireOnly((current) => !current)}
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Available for hire only
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-slate-200 hover:bg-white/10"
              onClick={() => {
                setAppliedCreatorType(creatorTypeInput.trim())
                setAppliedService(serviceInput.trim())
              }}
            >
              Apply match filters
            </Button>
          </div>
          {(appliedCreatorType || appliedService || availableForHireOnly) ? (
            <div className="flex flex-wrap gap-2">
              {appliedCreatorType ? (
                <Badge className="bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/30">
                  Creator: {appliedCreatorType}
                </Badge>
              ) : null}
              {appliedService ? (
                <Badge className="bg-cyan-500/20 text-cyan-100 border-cyan-500/30">
                  Service: {appliedService}
                </Badge>
              ) : null}
              {availableForHireOnly ? (
                <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30">
                  Hire-ready only
                </Badge>
              ) : null}
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs text-slate-300 hover:bg-white/10"
                onClick={() => {
                  setCreatorTypeInput("")
                  setServiceInput("")
                  setAppliedCreatorType("")
                  setAppliedService("")
                  setAvailableForHireOnly(false)
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </SurfaceHero>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Choose your outcome</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {intentOptions.map((intentOption) => (
              <button
                key={intentOption.id}
                onClick={() => setSelectedIntent(intentOption.id)}
                className={`text-left rounded-2xl border p-4 transition ${
                  selectedIntent === intentOption.id
                    ? "border-purple-400/60 bg-purple-500/10"
                    : "border-white/10 bg-slate-900/50 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2 text-sm text-purple-200 mb-2">
                  {intentOption.icon}
                  {intentOption.label}
                </div>
                <p className="text-sm text-slate-300">{intentOption.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <QuickPathCard
            title="Land paid work"
            description="Open active roles and apply where demand is already live."
            href="/jobs"
            icon={<Briefcase className="h-4 w-4" />}
          />
          <QuickPathCard
            title="Find collaborators"
            description="Connect with artists and teams ready to build now."
            href="/friends/search"
            icon={<Users className="h-4 w-4" />}
          />
          <QuickPathCard
            title="Track live demand"
            description="See which events and venues are accelerating."
            href="/discover/events"
            icon={<Calendar className="h-4 w-4" />}
          />
          <QuickPathCard
            title="Study winning content"
            description="Open top-performing posts in Pulse and adapt the playbook."
            href="/feed"
            icon={<Sparkles className="h-4 w-4" />}
          />
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DiscoverTab)} className="space-y-6">
          <SurfaceTabsList>
            {(isLoading || tabAvailability["for-you"]) ? (
              <TabsTrigger value="for-you"><Sparkles className="h-4 w-4 mr-2" />For You</TabsTrigger>
            ) : null}
            {(isLoading || tabAvailability.people) ? (
              <TabsTrigger value="people"><Users className="h-4 w-4 mr-2" />People</TabsTrigger>
            ) : null}
            {(isLoading || tabAvailability.hire) ? (
              <TabsTrigger value="hire"><Briefcase className="h-4 w-4 mr-2" />Hire Matches</TabsTrigger>
            ) : null}
            {(isLoading || tabAvailability.events) ? (
              <TabsTrigger value="events"><Calendar className="h-4 w-4 mr-2" />Events</TabsTrigger>
            ) : null}
            {(isLoading || tabAvailability.trending) ? (
              <TabsTrigger value="trending"><Flame className="h-4 w-4 mr-2" />Trending</TabsTrigger>
            ) : null}
          </SurfaceTabsList>

          <TabsContent value="for-you" className="space-y-6">
            <SectionHeader title="High-impact picks for your goal" href="/friends/search" />
            {isLoading ? <LoadingGrid /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.for_you.map((item) => (
                  <ForYouCard
                    key={item.id}
                    item={item}
                    onOpenProfile={(profile) => openProfile(router, profile)}
                    onOpenEvent={(event) => openEvent(router, event)}
                    onOpenPost={() => router.push("/feed")}
                  />
                ))}
              </div>
            )}
            {!isLoading && filtered.for_you.length === 0 ? (
              <EmptyState message="No RSS matches for this goal right now. Try another intent or remove location filtering." />
            ) : null}
          </TabsContent>

          <TabsContent value="hire" className="space-y-6">
            <SectionHeader title="Creators ready for paid opportunities" href="/search" />
            {isLoading ? <LoadingGrid /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filtered.hire_matches.slice(0, 12).map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isFollowing={followingIds.has(profile.id)}
                    onFollow={handleFollow}
                    onOpen={() => openProfile(router, profile)}
                  />
                ))}
              </div>
            )}
            {!isLoading && filtered.hire_matches.length === 0 ? (
              <EmptyState message="No hire-ready creator matches yet. Try broadening creator type or service filters." />
            ) : null}
          </TabsContent>

          <TabsContent value="people" className="space-y-6">
            <SectionHeader title="People driving momentum right now" href="/friends/search" />
            {isLoading ? <LoadingGrid /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filtered.people.slice(0, 12).map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isFollowing={followingIds.has(profile.id)}
                    onFollow={handleFollow}
                    onOpen={() => openProfile(router, profile)}
                  />
                ))}
              </div>
            )}
            {!isLoading && filtered.people.length === 0 ? (
              <EmptyState message="People suggestions are disabled in RSS-only mode." />
            ) : null}
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <SectionHeader title="Where demand is building now" href="/events" />
            {isLoading ? <LoadingGrid /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.upcoming.map((event) => (
                  <EventCard key={event.id} event={event} onOpen={() => openEvent(router, event)} />
                ))}
              </div>
            )}
            {!isLoading && filtered.upcoming.length === 0 ? (
              <EmptyState message="No event-like stories were detected from RSS right now." />
            ) : null}
          </TabsContent>

          <TabsContent value="trending" className="space-y-6">
            <SectionHeader title="Content with traction" href="/feed" />
            {isLoading ? <LoadingGrid /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.trending.map((post) => (
                  <PostCard key={post.id} post={post} onOpen={() => router.push("/feed")} />
                ))}
              </div>
            )}
            {!isLoading && filtered.trending.length === 0 ? (
              <EmptyState message="No trending RSS stories available right now. Try changing location or refresh." />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SignalCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <SurfaceCard className="bg-slate-900/70">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-200">
          {icon}
        </div>
      </CardContent>
    </SurfaceCard>
  )
}

function QuickPathCard({
  title,
  description,
  href,
  icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <Link href={href}>
      <SurfaceCard className="hover:border-purple-400/40 transition h-full">
        <CardContent className="p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-200">
            {icon}
          </div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </CardContent>
      </SurfaceCard>
    </Link>
  )
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Button asChild variant="outline" size="sm" className="border-white/20 text-slate-200 hover:bg-white/10">
        <Link href={href}>
          See more
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <SurfaceCard key={index} className="bg-slate-900/50">
          <CardContent className="p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="text-slate-300">Loading discover content...</span>
          </CardContent>
        </SurfaceCard>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <SurfaceCard className="bg-slate-900/60">
      <CardContent className="p-6 text-sm text-slate-300">{message}</CardContent>
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
  onOpenPost: () => void
}) {
  if (item.profile)
    return (
      <ProfileCard profile={item.profile} onFollow={() => null} onOpen={() => onOpenProfile(item.profile!)} isFollowing={false} hideFollow />
    )

  if (item.event)
    return (
      <EventCard event={item.event} onOpen={() => onOpenEvent(item.event!)} />
    )

  if (item.post)
    return (
      <PostCard post={item.post} onOpen={onOpenPost} />
    )

  return null
}

function ProfileCard({
  profile,
  onOpen,
  onFollow,
  isFollowing,
  hideFollow = false,
}: {
  profile: DiscoverProfile
  onOpen: () => void
  onFollow: (profileId: string) => void
  isFollowing: boolean
  hideFollow?: boolean
}) {
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
              <CardTitle className="text-base truncate">{profile.display_name}</CardTitle>
              <p className="text-xs text-slate-400 truncate">@{profile.username}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize">{profile.account_type}</Badge>
            {profile.verified ? <Badge className="bg-blue-500/20 text-blue-200">Verified</Badge> : null}
            {profile.creator_type ? (
              <Badge className="bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/30">
                {profile.creator_type}
              </Badge>
            ) : null}
            {profile.available_for_hire ? (
              <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/30">
                Available for hire
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-slate-300 line-clamp-2">{profile.bio || "No bio yet."}</p>
          {profile.service_offerings?.length ? (
            <div className="flex flex-wrap gap-1">
              {profile.service_offerings.slice(0, 3).map((service) => (
                <Badge key={service} variant="outline" className="border-white/20 text-slate-200">
                  {service}
                </Badge>
              ))}
            </div>
          ) : null}
          {profile.location ? (
            <div className="text-xs text-slate-400 flex items-center gap-1">
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
              <Button onClick={() => onFollow(profile.id)} size="sm" className="flex-1 rounded-xl">
                {isFollowing ? "Following" : "Follow"}
              </Button>
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
          <p className="text-sm text-slate-300 line-clamp-2">{event.description || "No description yet."}</p>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(", ") || "Venue TBD"}
          </div>
          <div className="text-xs text-slate-400">{event.attendance.total} interested/attending</div>
          <Button onClick={onOpen} size="sm" className="w-full rounded-xl">
            <Calendar className="h-3.5 w-3.5 mr-2" />
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
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={post.profiles.avatar_url || ""} />
                <AvatarFallback>{post.profiles.username.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{post.profiles.full_name || post.profiles.username}</p>
                <p className="text-xs text-slate-400 truncate">@{post.profiles.username}</p>
              </div>
            </div>
            <TrendingUp className="h-4 w-4 text-purple-300" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300 line-clamp-4">{post.content || "No content available."}</p>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>{post.likes_count} likes</span>
            <span>{post.comments_count} comments</span>
            <span>{post.shares_count} shares</span>
          </div>
          <div className="text-xs text-slate-500">{formatSafeDate(post.created_at)}</div>
          <Button onClick={onOpen} size="sm" variant="outline" className="w-full rounded-xl border-white/20">
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            Open in Pulse
          </Button>
        </CardContent>
      </SurfaceCard>
    </motion.div>
  )
}

function openProfile(router: ReturnType<typeof useRouter>, profile: DiscoverProfile) {
  if (profile.account_type === "artist") {
    router.push(`/artist/${profile.username}`)
    return
  }

  if (profile.account_type === "venue") {
    router.push(`/venue/${profile.username}`)
    return
  }

  router.push(`/profile/${profile.username}`)
}

function openEvent(router: ReturnType<typeof useRouter>, event: DiscoverEvent) {
  if (event.slug) {
    router.push(`/events/${event.slug}`)
    return
  }

  router.push(`/events/${event.id}`)
}
