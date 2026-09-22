"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"

import type { FinanceScopeHit, FinanceScopeKind } from "@/lib/admin/finance-scope-search"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FinanceScopeSelection {
  kind: FinanceScopeKind
  id: string
  label: string
  value: string
}

interface FinanceScopePickerProps {
  label: string
  kinds: FinanceScopeKind[]
  selected: FinanceScopeSelection | null
  onSelect: (selection: FinanceScopeSelection | null) => void
  placeholder?: string
  requestHeaders?: Record<string, string>
  required?: boolean
  className?: string
  /** When empty query, still fetch top results for this org. */
  prefetchEmpty?: boolean
}

/**
 * FIN-104 — Scoped search picker for finance tour/event/vendor/category (no raw UUID entry).
 */
export function FinanceScopePicker({
  label,
  kinds,
  selected,
  onSelect,
  placeholder,
  requestHeaders,
  required,
  className,
  prefetchEmpty = true,
}: FinanceScopePickerProps) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<FinanceScopeHit[]>([])
  const [unavailable, setUnavailable] = useState<Partial<Record<FinanceScopeKind, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const kindsKey = kinds.join(",")

  useEffect(() => {
    if (!prefetchEmpty && !query.trim()) {
      setHits([])
      return
    }

    const handle = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          kinds: kindsKey,
          limit: "12",
        })
        const res = await fetch(`/api/admin/finances/scope-search?${params}`, {
          credentials: "include",
          cache: "no-store",
          headers: requestHeaders,
        })
        const data = await res.json().catch(() => ({}))
        setHits(Array.isArray(data.hits) ? data.hits : [])
        setUnavailable(data.unavailable && typeof data.unavailable === "object" ? data.unavailable : {})
      } catch {
        setHits([])
      } finally {
        setIsLoading(false)
      }
    }, 220)

    return () => window.clearTimeout(handle)
  }, [query, kindsKey, requestHeaders, prefetchEmpty])

  const kindHint = kinds.join(" / ")

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-slate-300">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </Label>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-sm border border-slate-700 bg-slate-800/80 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{selected.label}</p>
            <p className="truncate text-xs text-slate-500 capitalize">{selected.kind}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-slate-400 hover:text-white"
            onClick={() => onSelect(null)}
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder || `Search ${kindHint}`}
              className="border-slate-700 bg-slate-800 pl-9 text-white"
              autoComplete="off"
            />
          </div>
          <div className="max-h-40 overflow-y-auto rounded-sm border border-slate-700/80 bg-slate-950/40">
            {isLoading ? (
              <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>
            ) : hits.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                No authorized {kindHint} matches
                {unavailable.po ? ` — ${unavailable.po}` : ""}
              </p>
            ) : (
              <ul className="divide-y divide-slate-800" role="listbox" aria-label={label}>
                {hits.map((hit) => (
                  <li key={`${hit.kind}:${hit.id}`}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-800/80"
                      onClick={() => {
                        onSelect({
                          kind: hit.kind,
                          id: hit.id,
                          label: hit.label,
                          value: hit.value,
                        })
                        setQuery("")
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">{hit.label}</span>
                        {hit.meta ? (
                          <span className="block truncate text-xs text-slate-500">{hit.meta}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                        {hit.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface FinanceParentScopePickerProps {
  eventId: string
  tourId: string
  onChange: (next: { event_id: string; tour_id: string }) => void
  requestHeaders?: Record<string, string>
  required?: boolean
}

/**
 * Mutual-exclusion event OR tour picker for budgets/settlements.
 */
export function FinanceParentScopePicker({
  eventId,
  tourId,
  onChange,
  requestHeaders,
  required,
}: FinanceParentScopePickerProps) {
  const selected: FinanceScopeSelection | null = eventId
    ? { kind: "event", id: eventId, label: `Event ${eventId.slice(0, 8)}…`, value: eventId }
    : tourId
      ? { kind: "tour", id: tourId, label: `Tour ${tourId.slice(0, 8)}…`, value: tourId }
      : null

  // When we have an id but only a truncated label, refresh label from search once selected via picker
  const [display, setDisplay] = useState<FinanceScopeSelection | null>(selected)

  useEffect(() => {
    if (!eventId && !tourId) {
      setDisplay(null)
      return
    }
    if (display && ((eventId && display.id === eventId) || (tourId && display.id === tourId)))
      return
    setDisplay(selected)
  }, [eventId, tourId])

  return (
    <FinanceScopePicker
      label="Event or tour"
      kinds={["event", "tour"]}
      selected={display}
      required={required}
      requestHeaders={requestHeaders}
      placeholder="Search events and tours in this organization"
      onSelect={(next) => {
        setDisplay(next)
        if (!next) {
          onChange({ event_id: "", tour_id: "" })
          return
        }
        if (next.kind === "event")
          onChange({ event_id: next.value, tour_id: "" })
        else if (next.kind === "tour")
          onChange({ event_id: "", tour_id: next.value })
      }}
    />
  )
}
