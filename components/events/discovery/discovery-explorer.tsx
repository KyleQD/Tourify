"use client"

/**
 * components/events/discovery/discovery-explorer.tsx
 *
 * Event discovery UX (Phase 3): search, manual location chooser,
 * "use my location", date presets, radius, category/genre, free filter,
 * sort controls — all URL-persisted. Renders behind EVENT_DISCOVERY_V2
 * (public twin NEXT_PUBLIC_EVENT_DISCOVERY_V2); the legacy discover rail
 * remains the fallback in app/events/page.tsx.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react"

interface DiscoveryItem {
  eventId: string
  title: string
  startAt: string | null
  venueName: string | null
  city: string | null
  stateCode: string | null
  distanceMeters: number | null
  isFree: boolean | null
  priceMin: number | null
  priceMax: number | null
  currency: string | null
  categoryKeys: string[]
  genreKeys: string[]
}

interface DiscoveryResponse {
  items: DiscoveryItem[]
  nextCursor: string | null
  usedLocation: boolean
  sort: string
}

type LocationState =
  | { kind: "none" }
  | { kind: "browser"; latitude: number; longitude: number; label: string }
  | { kind: "manual"; label: string }

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "this_weekend", label: "This weekend" },
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
] as const

const RADII_MILES = [5, 10, 25, 50, 100]

const SORT_OPTIONS = [
  { key: "nearby", label: "Nearby" },
  { key: "soonest", label: "Soonest" },
  { key: "popular", label: "Popular" },
  { key: "recently_added", label: "Recently added" },
] as const

function formatDate(iso: string | null): string {
  if (!iso) return "Date TBA"
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

function formatPrice(item: DiscoveryItem): string {
  if (item.isFree) return "Free"
  if (item.priceMin == null) return ""
  const cur = item.currency ?? "USD"
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n)
  if (item.priceMax != null && item.priceMax !== item.priceMin) return `${fmt(item.priceMin)} – ${fmt(item.priceMax)}`
  return fmt(item.priceMin)
}

function formatDistance(meters: number | null): string {
  if (meters == null) return ""
  const miles = meters / 1609.344
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`
}

export function DiscoveryExplorer() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get("q") ?? ""
  const datePreset = searchParams.get("datePreset") ?? ""
  const radius = searchParams.get("radius") ?? "25"
  const free = searchParams.get("free") === "true"
  const sort = searchParams.get("sort") ?? ""
  const genres = searchParams.get("genre") ?? ""

  const [location, setLocation] = useState<LocationState>({ kind: "none" })
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "denied" | "error">("idle")
  const [manualLocation, setManualLocation] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<DiscoveryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key)
        else params.set(key, value)
      }
      router.replace(`/events?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const requestBrowserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error")
      return
    }
    setLocationStatus("requesting")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          kind: "browser",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Current location",
        })
        setLocationStatus("idle")
      },
      () => setLocationStatus("denied"),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  const applyManualLocation = useCallback(() => {
    const label = manualLocation.trim()
    if (!label) return
    setLocation({ kind: "manual", label })
  }, [manualLocation])

  const clearLocation = useCallback(() => {
    setLocation({ kind: "none" })
    setManualLocation("")
    setLocationStatus("idle")
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (datePreset) params.set("datePreset", datePreset)
    if (free) params.set("free", "true")
    if (genres) params.set("genre", genres)
    if (sort) params.set("sort", sort)
    params.set("radius", radius)
    if (location.kind === "browser") {
      params.set("lat", String(location.latitude))
      params.set("lng", String(location.longitude))
      if (!sort) params.set("sort", "nearby")
    } else if (location.kind === "manual") {
      // City text rides the query channel until a geocoder is wired in.
      params.set("q", [q, location.label].filter(Boolean).join(" "))
    }
    params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
    return params.toString()
  }, [q, datePreset, free, genres, sort, radius, location])

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const id = ++requestId.current
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/events/search?${queryString}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`)
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data: DiscoveryResponse = await res.json()
        if (id !== requestId.current) return
        setResults((prev) => (append ? [...prev, ...data.items] : data.items))
        setNextCursor(data.nextCursor)
      } catch (err) {
        if (id !== requestId.current) return
        setError(err instanceof Error ? err.message : "Search failed")
        if (!append) setResults([])
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [queryString],
  )

  useEffect(() => {
    setResults([])
    setNextCursor(null)
    void fetchPage(null, false)
  }, [fetchPage])

  return (
    <div className="space-y-6" data-testid="discovery-explorer">
      {/* Search + location bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ q: (e.target as HTMLInputElement).value || null })
            }}
            placeholder="Search artists, venues, events…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          {location.kind === "none" ? (
            <>
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyManualLocation()}
                placeholder="City, State"
                aria-label="Enter a location"
                className="w-36 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={requestBrowserLocation}
                disabled={locationStatus === "requesting"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-200 hover:border-purple-500 disabled:opacity-50"
              >
                <LocateFixed className="h-4 w-4" aria-hidden />
                {locationStatus === "requesting" ? "Locating…" : "Use my location"}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2.5 text-sm text-purple-200">
              <MapPin className="h-4 w-4" aria-hidden />
              {location.label}
              <button type="button" onClick={clearLocation} aria-label="Clear location" className="text-purple-300 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-200 hover:border-purple-500 md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </button>
        </div>
      </div>

      {locationStatus === "denied" && (
        <p role="status" className="text-sm text-amber-300">
          Location permission was denied — enter a city above to see nearby events.
        </p>
      )}

      {/* Filters */}
      <div className={`${showFilters ? "block" : "hidden"} space-y-4 md:block`}>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date filters">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={datePreset === preset.key}
              onClick={() => updateParams({ datePreset: datePreset === preset.key ? null : preset.key })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                datePreset === preset.key
                  ? "bg-purple-600 text-white"
                  : "border border-slate-700 bg-slate-900/70 text-slate-300 hover:border-purple-500"
              }`}
            >
              {preset.label}
            </button>
          ))}

          <label className="ml-2 inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={free}
              onChange={(e) => updateParams({ free: e.target.checked ? "true" : null })}
              className="h-3.5 w-3.5 rounded border-slate-600 accent-purple-600"
            />
            Free only
          </label>

          {location.kind !== "none" && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              Radius
              <select
                value={radius}
                onChange={(e) => updateParams({ radius: e.target.value })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
              >
                {RADII_MILES.map((r) => (
                  <option key={r} value={String(r)}>
                    {r} mi
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-300">
            Sort
            <select
              value={sort || (location.kind === "browser" ? "nearby" : "soonest")}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key} disabled={option.key === "nearby" && location.kind === "none"}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
          <button type="button" onClick={() => void fetchPage(null, false)} className="ml-3 underline hover:text-white">
            Try again
          </button>
        </div>
      )}

      {!error && !loading && results.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-10 text-center">
          <p className="text-lg font-medium text-slate-200">No events found</p>
          <p className="mt-1 text-sm text-slate-400">
            Try widening the radius, clearing filters, or picking a different date range.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {results.map((item) => (
          <li key={item.eventId}>
            <a
              href={`/events/${item.eventId}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-purple-500/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 font-semibold text-white">{item.title}</h3>
                {item.distanceMeters != null && (
                  <span className="shrink-0 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-200">
                    {formatDistance(item.distanceMeters)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-300">{formatDate(item.startAt)}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {[item.venueName, item.city, item.stateCode].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={item.isFree ? "font-medium text-emerald-300" : "text-slate-300"}>{formatPrice(item)}</span>
                {item.genreKeys.slice(0, 2).map((g) => (
                  <span key={g} className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
                    {g}
                  </span>
                ))}
              </div>
            </a>
          </li>
        ))}
      </ul>

      {loading && <p className="py-6 text-center text-sm text-slate-400">Loading events…</p>}

      {nextCursor && !loading && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => void fetchPage(nextCursor, true)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-5 py-2.5 text-sm text-white hover:border-purple-500"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
