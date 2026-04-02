"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import { SurfaceCard, SurfaceHero, SurfaceInput } from "@/components/surface/surface-primitives"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, Newspaper, Sparkles, Calendar, ExternalLink } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import type { NewsFeedItem } from "@/lib/news/types"

interface DiscoverEvent {
  id: string
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
}

interface DiscoverPayload {
  sections: {
    upcoming: DiscoverEvent[]
  }
}

interface NewsFeedResponse {
  items: NewsFeedItem[]
}

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isDemoHost, setIsDemoHost] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [discoverEvents, setDiscoverEvents] = useState<DiscoverEvent[]>([])
  const [newsItems, setNewsItems] = useState<NewsFeedItem[]>([])

  useEffect(() => {
    setIsHydrated(true)
    if (typeof window === "undefined") return

    const currentHost = window.location.hostname
    setIsDemoHost(currentHost === "demo.tourify.live")
  }, [])

  useEffect(() => {
    if (!isHydrated || isDemoHost || loading) return
    if (isAuthenticated && user) {
      router.push("/dashboard")
      return
    }

    router.push("/login")
  }, [isHydrated, isDemoHost, loading, isAuthenticated, user, router])

  useEffect(() => {
    if (!isDemoHost) return
    void loadHomeUpdates({ location: appliedLocation })
  }, [isDemoHost, appliedLocation])

  async function loadHomeUpdates({ location }: { location: string }) {
    setIsRefreshing(true)

    try {
      const locationParam = location.trim() ? `&location=${encodeURIComponent(location.trim())}` : ""
      const newsQueryParam = location.trim() ? `&query=${encodeURIComponent(location.trim())}` : ""

      const [discoverResponse, newsResponse] = await Promise.all([
        fetch(`/api/discover?limit=6&intent=grow${locationParam}`, { cache: "no-store" }),
        fetch(`/api/news/feed?limit=6&facet=local${newsQueryParam}`, { cache: "no-store" }),
      ])

      if (discoverResponse.ok) {
        const discoverPayload = (await discoverResponse.json()) as DiscoverPayload
        setDiscoverEvents(discoverPayload.sections.upcoming.slice(0, 3))
      }

      if (newsResponse.ok) {
        const newsPayload = (await newsResponse.json()) as NewsFeedResponse
        setNewsItems(newsPayload.items.slice(0, 4))
      }
    } catch (error) {
      console.error("Failed to load home updates:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return

    setIsLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000,
        })
      })

      const location = await reverseGeocode({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })

      setLocationInput(location)
      setAppliedLocation(location)
    } catch (error) {
      console.error("Failed to resolve location:", error)
    } finally {
      setIsLocating(false)
    }
  }

  const heroSubtitle = useMemo(() => {
    if (!appliedLocation) return "Live updates from Discover and Pulse, personalized by your location."
    return `Showing fresh opportunities and music news near ${appliedLocation}.`
  }, [appliedLocation])

  if (!isHydrated || loading) {
    return <BrandLoadingScreen message="Loading..." logoSrc="/tourify-logo-white.svg" fullScreen={true} />
  }

  if (!isDemoHost) {
    return <BrandLoadingScreen message="Loading..." logoSrc="/tourify-logo-white.svg" fullScreen={true} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <SurfaceHero className="space-y-5 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Demo Live Feed
              </Badge>
              <h1 className="text-3xl font-bold md:text-5xl">Welcome to Tourify Live</h1>
              <p className="text-base text-slate-300 md:text-lg">{heroSubtitle}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="border-white/25 text-slate-100 hover:bg-white/10">
                <Link href="/discover">Open Discover</Link>
              </Button>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/feed">Open Pulse</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <SurfaceInput
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                placeholder="City, state"
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="border-white/25 text-slate-100 hover:bg-white/10" onClick={() => setAppliedLocation(locationInput.trim())}>
              Apply location
            </Button>
            <Button
              variant="outline"
              className="border-white/25 text-slate-100 hover:bg-white/10"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              Use current location
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => {
              setLocationInput("")
              setAppliedLocation("")
            }}>
              Clear
            </Button>
          </div>
        </SurfaceHero>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Calendar className="h-5 w-5 text-purple-300" />
                Discover Updates
              </h2>
              <Button asChild variant="outline" size="sm" className="border-white/20 text-slate-200 hover:bg-white/10">
                <Link href="/discover">See more</Link>
              </Button>
            </div>

            {discoverEvents.map((event) => (
              <SurfaceCard key={event.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-slate-300">{event.description || "No summary available yet."}</p>
                  <p className="text-xs text-slate-400">{formatSafeDate(event.event_date || null)}</p>
                  <p className="text-xs text-slate-400">{[event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(", ") || "Venue details coming soon"}</p>
                </CardContent>
              </SurfaceCard>
            ))}

            {!isRefreshing && discoverEvents.length === 0 ? (
              <SurfaceCard>
                <CardContent className="p-5 text-sm text-slate-300">
                  No discover updates were found for this location yet.
                </CardContent>
              </SurfaceCard>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Newspaper className="h-5 w-5 text-cyan-300" />
                Pulse Updates
              </h2>
              <Button asChild variant="outline" size="sm" className="border-white/20 text-slate-200 hover:bg-white/10">
                <Link href="/feed">See more</Link>
              </Button>
            </div>

            {newsItems.map((item) => (
              <SurfaceCard key={item.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-slate-300">{item.summary}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.sourceName}</span>
                    <span>{formatSafeDate(item.publishedAt)}</span>
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-cyan-100"
                    >
                      Open source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </CardContent>
              </SurfaceCard>
            ))}

            {!isRefreshing && newsItems.length === 0 ? (
              <SurfaceCard>
                <CardContent className="p-5 text-sm text-slate-300">
                  No pulse updates were found for this location yet.
                </CardContent>
              </SurfaceCard>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

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
    const city = address.city || address.town || address.village || address.hamlet || address.county || ""
    const state = address.state || address.region || ""

    if (city && state) return `${city}, ${state}`
    if (city) return String(city)
    if (state) return String(state)
  } catch (error) {
    console.warn("Reverse geocode fallback to coordinates:", error)
  }

  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
}

