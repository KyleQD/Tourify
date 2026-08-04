"use client"

import { useCallback, useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TourOption {
  id: string
  name: string
}

interface StopOption {
  id: string
  name: string
  legLabel?: string | null
}

interface LogisticsScopeBarProps {
  orgLabel: string
  actingOrgId: string | null
  tourId: string | null
  eventId: string | null
  legId: string | null
  onChange: (next: {
    tourId?: string | null
    eventId?: string | null
    legId?: string | null
    eventName?: string | null
    tourName?: string | null
  }) => void
  className?: string
}

/**
 * LOG-104 — Organization → tour → stop/event (/leg) filters.
 * Does not auto-select a tour or event when URL scope is empty.
 */
export function LogisticsScopeBar({
  orgLabel,
  actingOrgId,
  tourId,
  eventId,
  legId,
  onChange,
  className,
}: LogisticsScopeBarProps) {
  const [tours, setTours] = useState<TourOption[]>([])
  const [stops, setStops] = useState<StopOption[]>([])
  const [isLoadingTours, setIsLoadingTours] = useState(false)
  const [isLoadingStops, setIsLoadingStops] = useState(false)
  const [scopeError, setScopeError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function loadTours() {
      setIsLoadingTours(true)
      setScopeError(null)
      try {
        const res = await fetch("/api/admin/tours?limit=100", {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load tours")
        const data = await res.json()
        if (data.orgId && actingOrgId && data.orgId !== actingOrgId) {
          setScopeError("Acting organization changed — tour list not applied")
          if (active) setTours([])
          return
        }
        const list: TourOption[] = Array.isArray(data.tours)
          ? data.tours.map((t: { id: string; name?: string; title?: string }) => ({
              id: String(t.id),
              name: String(t.name || t.title || "Untitled tour"),
            }))
          : []
        if (active) setTours(list)
      } catch {
        if (active) {
          setTours([])
          setScopeError("Unable to load tours for this organization")
        }
      } finally {
        if (active) setIsLoadingTours(false)
      }
    }
    void loadTours()
    return () => {
      active = false
    }
  }, [actingOrgId])

  useEffect(() => {
    let active = true
    async function loadStops() {
      if (!tourId) {
        setStops([])
        return
      }
      setIsLoadingStops(true)
      try {
        const res = await fetch(`/api/admin/tours/${tourId}/events`, {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) throw new Error("Failed to load stops")
        const data = await res.json()
        const rows = Array.isArray(data.events)
          ? data.events
          : Array.isArray(data.data)
            ? data.data
            : []
        const list: StopOption[] = rows.map(
          (e: {
            id: string
            name?: string
            title?: string
            leg_label?: string
            stop_label?: string
            city?: string
          }) => ({
            id: String(e.id),
            name: String(e.name || e.title || "Untitled stop"),
            legLabel: e.leg_label || e.stop_label || e.city || null,
          }),
        )
        if (active) setStops(list)
      } catch {
        if (active) setStops([])
      } finally {
        if (active) setIsLoadingStops(false)
      }
    }
    void loadStops()
    return () => {
      active = false
    }
  }, [tourId])

  const handleTourChange = useCallback(
    (value: string) => {
      if (value === "__all__") {
        onChange({ tourId: null, eventId: null, legId: null, tourName: null, eventName: null })
        return
      }
      const tour = tours.find((t) => t.id === value)
      onChange({
        tourId: value,
        eventId: null,
        legId: null,
        tourName: tour?.name || null,
        eventName: null,
      })
    },
    [onChange, tours],
  )

  const handleStopChange = useCallback(
    (value: string) => {
      if (value === "__all__") {
        onChange({ eventId: null, legId: null, eventName: null })
        return
      }
      const stop = stops.find((s) => s.id === value)
      onChange({
        eventId: value,
        legId: stop?.legLabel || null,
        eventName: stop?.name || null,
      })
    },
    [onChange, stops],
  )

  const legOptions = Array.from(
    new Set(stops.map((s) => s.legLabel).filter((v): v is string => Boolean(v))),
  )

  return (
    <div className={cn("flex w-full min-w-[240px] max-w-3xl flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-sm border border-slate-600/60 bg-slate-900/70 px-2 py-1 text-slate-200">
          Org · {orgLabel}
        </span>
        {actingOrgId ? (
          <span className="font-mono text-[10px] text-slate-500">{actingOrgId.slice(0, 8)}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={tourId || "__all__"} onValueChange={handleTourChange} disabled={isLoadingTours}>
          <SelectTrigger className="h-9 border-slate-600 bg-slate-900/70 text-slate-200">
            <SelectValue placeholder={isLoadingTours ? "Loading tours…" : "Tour (optional)"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tours</SelectItem>
            {tours.map((tour) => (
              <SelectItem key={tour.id} value={tour.id}>
                {tour.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={eventId || "__all__"}
          onValueChange={handleStopChange}
          disabled={!tourId || isLoadingStops}
        >
          <SelectTrigger className="h-9 border-slate-600 bg-slate-900/70 text-slate-200">
            <SelectValue
              placeholder={
                !tourId
                  ? "Select a tour first"
                  : isLoadingStops
                    ? "Loading stops…"
                    : "Stop / event"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All stops</SelectItem>
            {stops.map((stop) => (
              <SelectItem key={stop.id} value={stop.id}>
                {stop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={legId || "__all__"}
          onValueChange={(value) =>
            onChange({ legId: value === "__all__" ? null : value })
          }
          disabled={!tourId || legOptions.length === 0}
        >
          <SelectTrigger className="h-9 border-slate-600 bg-slate-900/70 text-slate-200">
            <SelectValue placeholder={legOptions.length ? "Leg / city" : "No legs"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All legs</SelectItem>
            {legOptions.map((leg) => (
              <SelectItem key={leg} value={leg}>
                {leg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scopeError ? <p className="text-xs text-amber-400">{scopeError}</p> : null}
    </div>
  )
}
