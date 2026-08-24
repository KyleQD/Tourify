"use client"

/**
 * CanonicalPlacePicker (P4-T01..T07).
 *
 * - Searches canonical geo_places (names + aliases) with debounce/abort.
 * - Explicit selection only: ambiguous same-name cities are disambiguated by
 *   the user via visible context; nothing auto-resolves.
 * - "Cannot find it?" flow submits an internal resolution candidate.
 * - Optional public-visibility checkbox, PRIVATE by default, disabled unless
 *   the location source is explicit user entry (never GPS/IP).
 * - The operational display string stays in the parent form (P4-T03); this
 *   component emits canonical identity only. No GPS/IP access anywhere.
 */
import { useState } from "react"
import { MapPin, Search, X } from "lucide-react"

import {
  useCanonicalPlaceSearch,
  type PlaceSearchItem,
} from "@/hooks/useCanonicalPlaceSearch"
import { resolveLocationVisibility } from "@/lib/world/places/visibility"
import type { PlaceVisibility } from "@/lib/world/places/visibility"

export interface SelectedPlace {
  placeId: string
  name: string
  canonicalPath: string
  countryCode: string | null
}

export interface CanonicalPlacePickerProps {
  label?: string
  value: SelectedPlace | null
  onChange: (place: SelectedPlace | null) => void
  onUnresolvedSubmit?: (queryText: string) => Promise<void> | void
  visibility?: PlaceVisibility
  onVisibilityChange?: (visibility: PlaceVisibility) => void
  source?: "user_entry" | "device_gps" | "ip_derived" | "inferred"
  showVisibilityControl?: boolean
  telemetrySink?: ((event: { outcome: string }) => void) | null
}

export function CanonicalPlacePicker({
  label = "Location",
  value,
  onChange,
  onUnresolvedSubmit,
  visibility = "private",
  onVisibilityChange,
  showVisibilityControl = false,
  source = "user_entry",
  telemetrySink = null,
}: CanonicalPlacePickerProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [cannotFind, setCannotFind] = useState(false)
  const [submittingUnresolved, setSubmittingUnresolved] = useState(false)
  const [submittedNote, setSubmittedNote] = useState(false)

  const { items, loading, error } = useCanonicalPlaceSearch(query)

  const effectiveVisibility = resolveLocationVisibility({ userChoice: visibility, source })

  function choose(item: PlaceSearchItem) {
    telemetrySink?.({ outcome: "selected" })
    onChange({
      placeId: item.id,
      name: item.name,
      canonicalPath: item.canonicalPath,
      countryCode: item.countryCode,
    })
    setQuery("")
    setOpen(false)
    setCannotFind(false)
  }

  async function submitUnresolved() {
    if (!query.trim() || !onUnresolvedSubmit) return
    setSubmittingUnresolved(true)
    try {
      await onUnresolvedSubmit(query.trim())
      telemetrySink?.({ outcome: "unresolved_submitted" })
      setSubmittedNote(true)
      setCannotFind(false)
    } finally {
      setSubmittingUnresolved(false)
    }
  }

  return (
    <div className="relative" data-testid="canonical-place-picker">
      <label className="mb-1 block text-sm font-medium text-slate-200">{label}</label>

      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2">
          <span className="flex items-center gap-2 text-sm text-white">
            <MapPin className="h-4 w-4 text-cyan-300" />
            {value.name}
            <span className="text-xs text-slate-400">{value.canonicalPath}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-slate-400 transition hover:text-white"
            aria-label="Clear selected place"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
                setSubmittedNote(false)
              }}
              placeholder="Search city, region, or country…"
              className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none"
            />
          </div>

          {open && query.trim().length >= 2 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/10 bg-[#0a0d24] shadow-xl">
              {loading && <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>}
              {!loading && error && <li className="px-3 py-2 text-xs text-red-300">{error}</li>}
              {!loading && !error && items.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-400">No matches.</li>
              )}
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-100 hover:bg-violet-500/20"
                  >
                    <span>{item.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">
                      {item.displayName && item.displayName !== item.name ? item.displayName : item.placeType}
                    </span>
                  </button>
                </li>
              ))}
              {items.length > 1 && (
                <li className="border-t border-white/10 px-3 py-1.5 text-[11px] text-slate-500">
                  Multiple matches — pick the exact place above.
                </li>
              )}
            </ul>
          )}

          {query.trim().length >= 2 && items.length === 0 && !loading && !error && (
            <div className="mt-1 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-xs text-slate-300">
              {!cannotFind ? (
                <button type="button" onClick={() => setCannotFind(true)} className="font-medium text-cyan-300 hover:text-cyan-200">
                  Can&rsquo;t find it? Request this place
                </button>
              ) : submittingUnresolved ? (
                <span className="text-slate-400">Submitting…</span>
              ) : submittedNote ? (
                <span className="text-emerald-300">Request recorded for editorial review.</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void submitUnresolved()}
                  className="rounded border border-cyan-300/40 px-2 py-1 font-medium text-cyan-200 hover:bg-cyan-300/10"
                >
                  Submit &ldquo;{query.trim()}&rdquo; for review
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showVisibilityControl && value && (
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={effectiveVisibility === "public"}
            disabled={source !== "user_entry"}
            onChange={(event) => onVisibilityChange?.(event.target.checked ? "public" : "private")}
            className="accent-violet-500"
          />
          Show my location publicly on my profile
        </label>
      )}
    </div>
  )
}
