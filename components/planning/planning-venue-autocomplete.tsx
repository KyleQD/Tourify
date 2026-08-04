"use client"

import * as React from "react"
import { Loader2, MapPin, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import type {
  PlanningVenueResult,
  PlanningVenueSearchResponse,
} from "@/lib/planning/venue-search"
import { cn } from "@/lib/utils"

interface PlanningVenueAutocompleteProps {
  value: string
  onValueChange: (value: string) => void
  onSelect: (venue: PlanningVenueResult) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  disabled?: boolean
}

const EMPTY_GROUPS: PlanningVenueSearchResponse["groups"] = {
  catalog: [],
  tourifyProfiles: [],
}

function ResultGroup({
  label,
  results,
  onSelect,
}: {
  label: string
  results: PlanningVenueResult[]
  onSelect: (result: PlanningVenueResult) => void
}) {
  if (!results.length) return null
  return (
    <div className="p-1.5">
      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      {results.map((result) => (
        <button
          key={result.key}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(result)}
          className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-100">{result.name}</span>
            <span className="block truncate text-xs text-slate-400">
              {[result.address, result.city, result.state].filter(Boolean).join(", ") || "Location unavailable"}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function PlanningVenueAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder = "Venue name, city, or state",
  className,
  inputClassName,
  disabled,
}: PlanningVenueAutocompleteProps) {
  const [groups, setGroups] = React.useState(EMPTY_GROUPS)
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const requestRef = React.useRef<AbortController | null>(null)
  const resultsId = React.useId()

  React.useEffect(() => {
    const query = value.trim()
    requestRef.current?.abort()
    setGroups(EMPTY_GROUPS)
    if (query.length < 2) {
      setGroups(EMPTY_GROUPS)
      setLoading(false)
      return
    }

    const handle = window.setTimeout(async () => {
      const controller = new AbortController()
      requestRef.current = controller
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query, limit: "8" })
        const response = await fetch(`/api/planning/venues/search?${params}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.error || "Venue search failed")
        setGroups(body.groups || EMPTY_GROUPS)
        setOpen(true)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setGroups(EMPTY_GROUPS)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [value])

  React.useEffect(() => () => requestRef.current?.abort(), [])

  const hasResults = groups.catalog.length > 0 || groups.tourifyProfiles.length > 0

  function select(result: PlanningVenueResult) {
    onSelect(result)
    setGroups(EMPTY_GROUPS)
    setOpen(false)
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && (loading || hasResults)}
        aria-controls={resultsId}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => {
          onValueChange(event.target.value)
          setOpen(true)
        }}
        placeholder={placeholder}
        className={cn("pl-9 pr-9", inputClassName)}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
      ) : null}
      {open && value.trim().length >= 2 && (loading || hasResults) ? (
        <div
          id={resultsId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-2xl"
        >
          <ResultGroup label="Venue catalog" results={groups.catalog} onSelect={select} />
          <ResultGroup label="Tourify venue profile" results={groups.tourifyProfiles} onSelect={select} />
          {loading && !hasResults ? (
            <p className="px-3 py-3 text-sm text-slate-400">Searching venues…</p>
          ) : null}
        </div>
      ) : null}
      {open && !loading && value.trim().length >= 2 && !hasResults ? (
        <p className="mt-1 text-xs text-slate-500">No match yet. Keep the manual venue details below.</p>
      ) : null}
    </div>
  )
}
