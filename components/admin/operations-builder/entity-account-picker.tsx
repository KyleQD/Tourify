"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface EntityAccountSelection {
  id: string
  label: string
  meta?: string
}

interface EntityAccountPickerProps {
  label: string
  placeholder?: string
  searchUrl: string
  mapResult: (row: any) => EntityAccountSelection
  selected: EntityAccountSelection[]
  onSelect: (selection: EntityAccountSelection) => void
  onRemove: (id: string) => void
  multi?: boolean
  queryParam?: string
}

export function EntityAccountPicker({
  label,
  placeholder,
  searchUrl,
  mapResult,
  selected,
  onSelect,
  onRemove,
  multi = true,
  queryParam = "query",
}: EntityAccountPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<EntityAccountSelection[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const url = new URL(searchUrl, window.location.origin)
        url.searchParams.set(queryParam, query.trim())
        url.searchParams.set("limit", "12")
        const response = await fetch(url.pathname + url.search, { credentials: "include" })
        const data = await response.json().catch(() => ({}))
        const rows =
          data.venues ||
          data.artists ||
          data.crew ||
          data.members ||
          data.data?.members ||
          data.results ||
          data.items ||
          []
        setResults((Array.isArray(rows) ? rows : []).map(mapResult).filter((row: EntityAccountSelection) => row.id))
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 280)
    return () => window.clearTimeout(handle)
  }, [query, searchUrl, mapResult, queryParam])

  function handleSelect(item: EntityAccountSelection) {
    onSelect(item)
    if (!multi) setQuery("")
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-slate-300">{label}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
            placeholder={placeholder || `Search ${label.toLowerCase()}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? <p className="text-xs text-slate-500">Searching…</p> : null}
        {!isLoading && query.trim() && results.length === 0 ? (
          <p className="text-xs text-slate-500">No matches.</p>
        ) : null}
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item)}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-left hover:bg-slate-900"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.label}</p>
              {item.meta ? <p className="truncate text-xs text-slate-400">{item.meta}</p> : null}
            </div>
            <Badge variant="outline">Add</Badge>
          </button>
        ))}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            >
              <span className="truncate">{item.label}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-slate-500 hover:text-red-300"
                aria-label={`Remove ${item.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Nothing attached yet.</p>
      )}
    </div>
  )
}
