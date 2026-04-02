"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SurfaceCard, SurfaceHero, SurfaceInput } from "@/components/surface/surface-primitives"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import { Calendar, ExternalLink, Globe, Loader2, MapPin, Newspaper, Briefcase, Sparkles, Users } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface HubEvent {
  id: string
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
}

interface HubNews {
  id: string
  title: string
  summary: string
  sourceName: string
  publishedAt: string
  url?: string
  topics: string[]
}

interface HubJob {
  id: string
  title: string
  city?: string | null
  state?: string | null
  country?: string | null
  payment_type?: string | null
  payment_amount?: number | null
}

interface HubQuickLink {
  id: string
  label: string
  href: string
}

interface HubPayload {
  success: boolean
  context: {
    isAuthenticated: boolean
    location: string | null
  }
  metrics: {
    opportunities: number
    events: number
    jobs: number
    network: number
    headlines: number
  }
  sections: {
    discover: HubEvent[]
    pulse: HubNews[]
    jobs: HubJob[]
    quickLinks: HubQuickLink[]
  }
}

const SHARD_CLIP_PATHS = [
  "polygon(0 4%, 95% 0, 100% 88%, 7% 100%)",
  "polygon(4% 0, 100% 8%, 92% 100%, 0 94%)",
  "polygon(0 0, 92% 5%, 100% 100%, 8% 92%)",
  "polygon(10% 0, 100% 12%, 88% 100%, 2% 86%)",
]

export function TourifyHubPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isLocating, setIsLocating] = useState(false)
  const [isLoadingHub, setIsLoadingHub] = useState(true)
  const [locationInput, setLocationInput] = useState("")
  const [appliedLocation, setAppliedLocation] = useState("")
  const [hubData, setHubData] = useState<HubPayload | null>(null)

  useEffect(() => {
    void loadHub()
  }, [appliedLocation])

  async function loadHub() {
    setIsLoadingHub(true)
    try {
      const locationParam = appliedLocation.trim()
        ? `?location=${encodeURIComponent(appliedLocation.trim())}&intent=grow`
        : ""
      const response = await fetch(`/api/hub${locationParam}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to fetch hub payload")
      const payload = (await response.json()) as HubPayload
      setHubData(payload)
    } catch (error) {
      console.error("[Hub] Failed to load hub:", error)
    } finally {
      setIsLoadingHub(false)
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
      console.error("[Hub] Geolocation failed:", error)
    } finally {
      setIsLocating(false)
    }
  }

  const sectionData = hubData?.sections
  const metricData = hubData?.metrics
  const tickerItems = sectionData?.pulse?.length ? sectionData.pulse : []
  const tickerLoop = [...tickerItems, ...tickerItems]
  const heroSubtitle = useMemo(() => {
    if (appliedLocation) return `Connected live signals near ${appliedLocation}.`
    return "One command center for Discover, Pulse, Events, Jobs, and your profile network."
  }, [appliedLocation])

  if (loading) {
    return <BrandLoadingScreen message="Loading hub..." logoSrc="/tourify-logo-white.svg" fullScreen={false} />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-slate-950 to-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-24 w-[120%] rotate-[-14deg] border border-white/20 bg-white/10 backdrop-blur-2xl" />
        <div className="absolute -right-20 top-2/3 h-20 w-[120%] rotate-[12deg] border border-cyan-200/25 bg-cyan-200/10 backdrop-blur-2xl" />
        <div className="absolute left-0 top-12 h-80 w-80 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-8 md:px-8">
        <SurfaceHero className="space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl space-y-3">
              <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Tourify Connected Hub
              </Badge>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Connect Everything. Move Faster.</h1>
              <p className="text-base text-slate-200 md:text-lg">{heroSubtitle}</p>
            </div>
            <div className="flex gap-2">
              {user ? (
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700" onClick={() => router.push("/dashboard")}>
                  Open Dashboard
                </Button>
              ) : (
                <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
                <Link href="/feed">Open Pulse</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <SurfaceInput
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                placeholder="Set your city, state"
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10" onClick={() => setAppliedLocation(locationInput.trim())}>
              Apply
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10" onClick={handleUseCurrentLocation} disabled={isLocating}>
              {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => {
              setLocationInput("")
              setAppliedLocation("")
            }}>
              Clear
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <HubMetric label="OpportunityIndex" value={metricData?.opportunities || 0} icon={<Sparkles className="h-4 w-4" />} />
            <HubMetric label="EventSignals" value={metricData?.events || 0} icon={<Calendar className="h-4 w-4" />} />
            <HubMetric label="OpenJobs" value={metricData?.jobs || 0} icon={<Briefcase className="h-4 w-4" />} />
            <HubMetric label="NetworkSignals" value={metricData?.network || 0} icon={<Users className="h-4 w-4" />} />
            <HubMetric label="Headlines" value={metricData?.headlines || 0} icon={<Newspaper className="h-4 w-4" />} />
          </div>
        </SurfaceHero>

        {tickerLoop.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-2xl">
            <div className="hub-ticker-track flex w-[200%] gap-3 px-3 py-2">
              {tickerLoop.map((item, index) => (
                <a
                  key={`${item.id}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hub-ticker-chip shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-100"
                >
                  <span className="mr-2 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px]">{item.topics?.[0] || "Signal"}</span>
                  {item.sourceName} // {item.title}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-1">
            <SectionTitle label="Discover" href="/discover" />
            {(sectionData?.discover || []).map((event, index) => (
              <SurfaceCard key={event.id} className="overflow-hidden" style={{ clipPath: SHARD_CLIP_PATHS[index % SHARD_CLIP_PATHS.length] }}>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-slate-300">{event.description || "Active demand signal from Discover."}</p>
                  <p className="text-xs text-slate-400">{formatSafeDate(event.event_date || null)}</p>
                  <p className="text-xs text-slate-400">{[event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(", ") || "Venue TBD"}</p>
                </CardContent>
              </SurfaceCard>
            ))}
            {!isLoadingHub && !(sectionData?.discover || []).length ? (
              <EmptyShard message="No discover signals right now. Try a new location." />
            ) : null}
          </section>

          <section className="space-y-4 xl:col-span-1">
            <SectionTitle label="Pulse" href="/feed" />
            {(sectionData?.pulse || []).map((item, index) => (
              <SurfaceCard key={item.id} className="overflow-hidden" style={{ clipPath: SHARD_CLIP_PATHS[index % SHARD_CLIP_PATHS.length] }}>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-slate-300">{item.summary}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.sourceName}</span>
                    <span>{formatSafeDate(item.publishedAt)}</span>
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:text-cyan-100">
                      Read Source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </CardContent>
              </SurfaceCard>
            ))}
            {!isLoadingHub && !(sectionData?.pulse || []).length ? (
              <EmptyShard message="No pulse stories loaded right now." />
            ) : null}
          </section>

          <section className="space-y-4 xl:col-span-1">
            <SectionTitle label="Jobs + Quick Paths" href="/jobs" />
            {(sectionData?.jobs || []).map((job, index) => (
              <SurfaceCard key={job.id} className="overflow-hidden" style={{ clipPath: SHARD_CLIP_PATHS[index % SHARD_CLIP_PATHS.length] }}>
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-base">{job.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-slate-400">{[job.city, job.state, job.country].filter(Boolean).join(", ") || "Remote / flexible"}</p>
                  <p className="text-xs text-slate-400 capitalize">
                    {job.payment_type || "compensation"} {typeof job.payment_amount === "number" ? `• $${job.payment_amount}` : ""}
                  </p>
                </CardContent>
              </SurfaceCard>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {(sectionData?.quickLinks || []).map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="justify-start border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={() => router.push(item.href)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .hub-ticker-track {
          animation: hubTickerScroll 34s linear infinite;
        }
        .hub-ticker-chip {
          animation: hubChipFloat 1300ms ease-in-out infinite alternate;
        }
        @keyframes hubTickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes hubChipFloat {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  )
}

function HubMetric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <SurfaceCard className="bg-white/5">
      <CardContent className="flex items-center justify-between p-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
        <div className="rounded-lg bg-purple-500/20 p-2 text-purple-100">{icon}</div>
      </CardContent>
    </SurfaceCard>
  )
}

function SectionTitle({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">{label}</h2>
      <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10">
        <Link href={href}>See more</Link>
      </Button>
    </div>
  )
}

function EmptyShard({ message }: { message: string }) {
  return (
    <SurfaceCard>
      <CardContent className="p-5 text-sm text-slate-300">{message}</CardContent>
    </SurfaceCard>
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
      { headers: { "Accept-Language": "en" } }
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
    console.warn("[Hub] Reverse geocode fallback:", error)
  }

  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
}
