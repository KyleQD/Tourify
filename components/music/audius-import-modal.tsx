"use client"

/**
 * components/music/audius-import-modal.tsx
 *
 * Search Audius and import a track into the authenticated artist's profile.
 * All UI states per doc 07_FRONTEND_UI_INTEGRATION.md are handled:
 *   empty → debounced searching → results → no-results
 *   → provider-unavailable → importing → already-imported → error
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Music, Loader2, Check, AlertCircle, X, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProviderBadge } from "./provider-badge"
import type { NormalizedTrack } from "@/lib/music/providers/contracts"

interface ImportResult {
  id: string
  title: string
  cover_art_url: string | null
  duration: number | null
  genre: string | null
  metadata: Record<string, unknown> | null
  alreadyImported: boolean
}

interface AudiusImportModalProps {
  open: boolean
  onClose: () => void
  /** Called after a successful import with the canonical artist_music data */
  onImportComplete: (track: ImportResult) => void
  artistProfileId?: string | null
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDurationMs(ms: number | null | undefined): string {
  if (!ms) return ""
  return formatDuration(ms / 1000)
}

// Debounce hook
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function AudiusImportModal({
  open,
  onClose,
  onImportComplete,
  artistProfileId,
}: AudiusImportModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<NormalizedTrack[]>([])
  const [searchState, setSearchState] = useState<
    "idle" | "searching" | "results" | "no-results" | "provider-error"
  >("idle")
  const [searchError, setSearchError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [importError, setImportError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLUListElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery("")
      setResults([])
      setSearchState("idle")
      setSearchError(null)
      setImportError(null)
    }
  }, [open])

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setSearchState("idle")
      setSearchError(null)
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    setSearchState("searching")
    setSearchError(null)
    setImportError(null)

    fetch(
      `/api/music/providers/audius/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`,
      { credentials: "include", signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) {
          const msg = json?.error?.message || "Audius search is temporarily unavailable."
          if (json?.error?.code === "FEATURE_DISABLED") {
            setSearchState("provider-error")
            setSearchError("Audius integration is not enabled.")
          } else {
            setSearchState("provider-error")
            setSearchError(msg)
          }
          return
        }
        const tracks: NormalizedTrack[] = json.data ?? []
        setResults(tracks)
        setSearchState(tracks.length === 0 ? "no-results" : "results")
      })
      .catch((err) => {
        if ((err as Error)?.name === "AbortError") return
        setSearchState("provider-error")
        setSearchError("Could not reach Audius. Please try again.")
      })

    return () => controller.abort()
  }, [debouncedQuery])

  const handleImport = useCallback(
    async (track: NormalizedTrack) => {
      if (!track.providerTrackId) return
      setImportingId(track.providerTrackId)
      setImportError(null)

      try {
        const res = await fetch("/api/music/import", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "audius",
            externalTrackId: track.providerTrackId,
            artistProfileId: artistProfileId ?? null,
            sourceSurface: "artist_music_manager",
          }),
        })

        const json = await res.json()

        if (!res.ok) {
          setImportError(json?.error?.message || "Import failed. Please try again.")
          return
        }

        const result: ImportResult = json.data
        setImportedIds((prev) => new Set([...prev, track.providerTrackId!]))
        onImportComplete(result)
      } catch {
        setImportError("Network error. Please check your connection and try again.")
      } finally {
        setImportingId(null)
      }
    },
    [artistProfileId, onImportComplete]
  )

  // Keyboard navigation for results list
  const handleResultKeyDown = (e: React.KeyboardEvent, track: NormalizedTrack, index: number) => {
    const items = resultsRef.current?.querySelectorAll<HTMLButtonElement>("[data-result-action]")
    if (!items) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      items[Math.min(index + 1, items.length - 1)]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (index === 0) inputRef.current?.focus()
      else items[index - 1]?.focus()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleImport(track)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <ProviderBadge provider="audius" />
                Add Track from Audius
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm mt-1">
                Search Audius and add a track to your profile.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search input */}
        <div className="px-6 pt-4">
          <div className="relative">
            {searchState === "searching" ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            )}
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a track or artist…"
              className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
              aria-label="Search Audius"
              aria-describedby={searchState === "searching" ? "search-status" : undefined}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && results.length > 0) {
                  e.preventDefault()
                  const first = resultsRef.current?.querySelector<HTMLButtonElement>("[data-result-action]")
                  first?.focus()
                }
              }}
            />
          </div>

          {/* Live region for search status */}
          <div
            id="search-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {searchState === "searching" && "Searching Audius…"}
            {searchState === "no-results" && `No results found for "${debouncedQuery}"`}
            {searchState === "results" && `${results.length} results found`}
          </div>
        </div>

        {/* Import error banner */}
        {importError && (
          <div className="mx-6 mt-3 flex items-start gap-2 rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{importError}</span>
          </div>
        )}

        {/* Results list */}
        <div className="overflow-y-auto max-h-[360px] px-2 pt-2 pb-4">
          {/* Idle / empty state */}
          {searchState === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Music className="h-8 w-8 mb-2" aria-hidden="true" />
              <p className="text-sm">Enter at least 2 characters to search</p>
            </div>
          )}

          {/* Provider error */}
          {searchState === "provider-error" && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400" role="status">
              <AlertCircle className="h-8 w-8 mb-2 text-amber-400" aria-hidden="true" />
              <p className="text-sm text-center px-4">{searchError || "Audius is temporarily unavailable."}</p>
            </div>
          )}

          {/* No results */}
          {searchState === "no-results" && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500" role="status">
              <Search className="h-8 w-8 mb-2" aria-hidden="true" />
              <p className="text-sm">No tracks found for &ldquo;{debouncedQuery}&rdquo;</p>
            </div>
          )}

          {/* Results */}
          {searchState === "results" && (
            <ul
              ref={resultsRef}
              role="listbox"
              aria-label="Audius search results"
              className="space-y-1"
            >
              {results.map((track, index) => {
                const isImporting = importingId === track.providerTrackId
                const isImported = track.providerTrackId
                  ? importedIds.has(track.providerTrackId)
                  : false

                return (
                  <li key={track.providerTrackId ?? track.id} role="option" aria-selected={false}>
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-800 transition-colors group">
                      {/* Artwork */}
                      <div className="h-10 w-10 shrink-0 rounded-md bg-slate-700 overflow-hidden">
                        {track.artworkUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={track.artworkUrl}
                            alt={`${track.title} artwork`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Music className="h-4 w-4 text-slate-500" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">{track.title}</p>
                        <p className="truncate text-xs text-slate-400">{track.artistName}</p>
                        {track.durationMs && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            <span aria-label={`Duration: ${formatDurationMs(track.durationMs)}`}>
                              {formatDurationMs(track.durationMs)}
                            </span>
                          </p>
                        )}
                      </div>

                      {/* Action button */}
                      <button
                        data-result-action
                        onClick={() => !isImported && !isImporting && handleImport(track)}
                        onKeyDown={(e) => handleResultKeyDown(e, track, index)}
                        disabled={isImporting || isImported}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400",
                          isImported
                            ? "bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 cursor-default"
                            : isImporting
                            ? "bg-slate-700 text-slate-400 cursor-wait"
                            : "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                        )}
                        aria-label={
                          isImported
                            ? `${track.title} already added`
                            : isImporting
                            ? `Adding ${track.title}…`
                            : `Add ${track.title} to profile`
                        }
                      >
                        {isImported ? (
                          <span className="flex items-center gap-1"><Check className="h-3 w-3" aria-hidden="true" /> Added</span>
                        ) : isImporting ? (
                          <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Adding…</span>
                        ) : (
                          "Add"
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Attribution footer */}
        <div className="border-t border-slate-700 px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Music powered by{" "}
            <a
              href="https://audius.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 rounded"
            >
              Audius
            </a>
          </p>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
