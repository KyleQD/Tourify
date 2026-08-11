"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  Plus,
  Loader2,
  Search,
  AlertCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { ProviderBadge } from "@/components/music/provider-badge"
import type { NormalizedTrack } from "@/lib/music/providers/contracts"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function fmtMs(ms?: number | null) {
  if (!ms) return ""
  const secs = ms / 1000
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function useDebounce<T>(val: T, ms: number) {
  const [d, setD] = useState(val)
  useEffect(() => {
    const t = setTimeout(() => setD(val), ms)
    return () => clearTimeout(t)
  }, [val, ms])
  return d
}

/**
 * Audius provider section: debounced search (aborts stale requests),
 * weekly trending, import-to-profile. All failures are isolated to this
 * component — native sections never depend on Audius.
 */
export function MusicAudiusSection({ initialQuery = "" }: { initialQuery?: string }) {
  const jukebox = useJukeboxOptional()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<NormalizedTrack[]>([])
  const [trending, setTrending] = useState<NormalizedTrack[]>([])
  const [searchState, setSearchState] = useState<"idle" | "loading" | "results" | "no-results" | "error">("idle")
  const [trendingState, setTrendingState] = useState<"loading" | "ready" | "error">("loading")
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const debouncedQuery = useDebounce(query, 350)
  const abortRef = useRef<AbortController | null>(null)

  const loadTrending = useCallback(() => {
    setTrendingState("loading")
    fetch("/api/music/providers/audius/trending?time=week", { credentials: "include" })
      .then(async (r) => {
        const j = await r.json()
        if (r.ok) {
          setTrending(j.data ?? [])
          setTrendingState("ready")
        } else setTrendingState("error")
      })
      .catch(() => setTrendingState("error"))
  }, [])

  useEffect(() => {
    loadTrending()
  }, [loadTrending])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      setSearchState("idle")
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSearchState("loading")
    fetch(`/api/music/providers/audius/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) {
          setSearchState("error")
          return
        }
        const tracks: NormalizedTrack[] = j.data ?? []
        setResults(tracks)
        setSearchState(tracks.length === 0 ? "no-results" : "results")
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setSearchState("error")
      })
    return () => ctrl.abort()
  }, [debouncedQuery])

  const handlePlay = useCallback(
    (track: NormalizedTrack) => {
      if (!jukebox || !track.providerTrackId) return
      const jt: JukeboxTrack = {
        id: track.id || track.providerTrackId,
        title: track.title,
        artist_name: track.artistName,
        cover_art_url: track.artworkUrl ?? undefined,
        file_url: "",
        provider: "audius",
        provider_track_id: track.providerTrackId,
        duration: track.durationMs ? track.durationMs / 1000 : undefined,
      }
      if (
        jukebox.state.currentTrack?.provider_track_id === track.providerTrackId &&
        jukebox.state.isPlaying
      ) {
        jukebox.pause()
      } else {
        jukebox.play(jt)
      }
    },
    [jukebox]
  )

  const handleImport = useCallback(
    async (track: NormalizedTrack) => {
      if (!track.providerTrackId || importedIds.has(track.providerTrackId)) return
      setImportingId(track.providerTrackId)
      try {
        const res = await fetch("/api/music/import", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "audius",
            externalTrackId: track.providerTrackId,
            sourceSurface: "music_page",
          }),
        })
        const j = await res.json()
        if (!res.ok) {
          toast.error(j?.error?.message || "Import failed")
          return
        }
        setImportedIds((p) => new Set([...p, track.providerTrackId!]))
        toast.success(`"${track.title}" added to your profile`)
      } catch {
        toast.error("Network error. Please try again.")
      } finally {
        setImportingId(null)
      }
    },
    [importedIds]
  )

  const displayTracks = searchState === "results" ? results : trending
  const showTrending = searchState === "idle" || searchState === "loading"

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          Audius
          <ProviderBadge provider="audius" />
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Search and play the Audius partner catalog without leaving Tourify.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        {searchState === "loading" ? (
          <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Audius tracks and artists…"
          aria-label="Search Audius"
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 h-11"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear Audius search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {searchState === "error" && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-red-900/20 border border-red-700/30 px-4 py-3 text-sm text-red-300 max-w-xl"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          Audius is temporarily unavailable. Try again shortly.
        </div>
      )}

      {searchState === "no-results" && (
        <div className="flex flex-col items-center py-14 text-slate-500">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No tracks found for &ldquo;{debouncedQuery}&rdquo;</p>
        </div>
      )}

      {showTrending && trendingState !== "error" && (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">
            {trendingState === "loading" ? "Loading trending tracks…" : "Trending on Audius this week"}
          </span>
          {trendingState === "loading" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          )}
        </div>
      )}
      {showTrending && trendingState === "error" && (
        <div
          role="alert"
          className="flex items-center gap-3 text-slate-500 text-sm py-4"
        >
          <AlertCircle className="h-4 w-4" /> Could not load Audius tracks
          <button
            type="button"
            onClick={loadTrending}
            className="text-purple-400 hover:text-purple-300 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {searchState === "results" && (
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{debouncedQuery}&rdquo;
          </span>
        </div>
      )}

      {displayTracks.length > 0 && (
        <div className="space-y-1">
          {displayTracks.map((track) => {
            const pid = track.providerTrackId ?? track.id
            const isCurrent = jukebox?.state.currentTrack?.provider_track_id === pid
            const isPlaying = isCurrent && jukebox?.state.isPlaying
            const isImporting = importingId === pid
            const isImported = importedIds.has(pid)
            const isUnavailable = track.availability === "unavailable"

            return (
              <div
                key={pid}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  isCurrent
                    ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 border border-purple-500/25"
                    : "hover:bg-white/5 border border-transparent",
                  isUnavailable && "opacity-40"
                )}
              >
                <button
                  type="button"
                  onClick={() => !isUnavailable && handlePlay(track)}
                  disabled={isUnavailable}
                  className="relative shrink-0"
                  aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                >
                  <TrackCoverImage
                    src={track.artworkUrl}
                    className="h-12 w-12 rounded-lg"
                    iconClassName="h-5 w-5"
                  />
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-lg bg-black/55 transition-opacity",
                      isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    )}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isCurrent ? "text-purple-300" : "text-white"
                      )}
                    >
                      {track.title}
                    </p>
                    {isUnavailable && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0 bg-red-900/40 text-red-400 border-red-700/30 hidden sm:inline-flex"
                      >
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="truncate text-xs text-slate-400">{track.artistName}</p>
                    {track.durationMs && (
                      <span className="text-xs text-slate-600 shrink-0">{fmtMs(track.durationMs)}</span>
                    )}
                  </div>
                </div>

                <ProviderBadge
                  provider="audius"
                  canonicalUrl={pid ? `https://audius.co/tracks/${pid}` : undefined}
                  className="shrink-0 hidden sm:inline-flex"
                />

                <button
                  type="button"
                  onClick={() => handleImport(track)}
                  disabled={isImporting || isImported || isUnavailable}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 flex items-center gap-1 min-h-8",
                    isImported
                      ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 cursor-default"
                      : isImporting
                        ? "bg-slate-700 text-slate-400 cursor-wait"
                        : isUnavailable
                          ? "invisible"
                          : "bg-purple-600/80 hover:bg-purple-500 text-white"
                  )}
                  aria-label={isImported ? "Added to profile" : `Add ${track.title} to profile`}
                >
                  {isImported ? (
                    "Added"
                  ) : isImporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-600">
        <span>Music powered by</span>
        <a
          href="https://audius.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-500 hover:text-purple-400 inline-flex items-center gap-1"
        >
          Audius <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
