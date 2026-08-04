"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Play,
  Pause,
  Plus,
  ListMusic,
  Music2,
  Loader2,
  Search,
  Shuffle,
  PlayCircle,
  Library,
  Headphones,
  Globe,
  Lock,
  Users,
  Share2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
} from "lucide-react"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { TrackCard } from "@/components/jukebox/track-card"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { ProviderBadge } from "@/components/music/provider-badge"
import {
  fetchUserPlaylists,
  fetchLibraryTracks,
  fetchDiscoverTracks,
  createPlaylist,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import type { NormalizedTrack } from "@/lib/music/providers/contracts"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(secs?: number | null) {
  if (!secs) return ""
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function fmtMs(ms?: number | null) {
  return ms ? fmtSeconds(ms / 1000) : ""
}

function fmtMinutes(secs: number) {
  const m = Math.round(secs / 60)
  return m < 1 ? "<1 min" : `${m} min`
}

function useDebounce<T>(val: T, ms: number) {
  const [d, setD] = useState(val)
  useEffect(() => {
    const t = setTimeout(() => setD(val), ms)
    return () => clearTimeout(t)
  }, [val, ms])
  return d
}

const GENRES = ["All", "Hip-Hop", "Electronic", "Pop", "R&B", "Rock", "Jazz", "Classical", "Country", "Metal", "Soul", "Reggae"]

// ─── Audius section ────────────────────────────────────────────────────────────

function AudiusSection({ playlists }: { playlists: JukeboxPlaylist[] }) {
  const jukebox = useJukeboxOptional()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<NormalizedTrack[]>([])
  const [trending, setTrending] = useState<NormalizedTrack[]>([])
  const [searchState, setSearchState] = useState<"idle" | "loading" | "results" | "no-results" | "error">("idle")
  const [trendingState, setTrendingState] = useState<"loading" | "ready" | "error">("loading")
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const debouncedQuery = useDebounce(query, 350)
  const abortRef = useRef<AbortController | null>(null)

  // Load weekly trending tracks on mount
  useEffect(() => {
    const ctrl = new AbortController()
    fetch("/api/music/providers/audius/trending?time=week", {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const j = await r.json()
        if (r.ok) { setTrending(j.data ?? []); setTrendingState("ready") }
        else setTrendingState("error")
      })
      .catch((e) => { if (e?.name !== "AbortError") setTrendingState("error") })
    return () => ctrl.abort()
  }, [])

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]); setSearchState("idle"); return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSearchState("loading")
    fetch(`/api/music/providers/audius/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`, {
      credentials: "include", signal: ctrl.signal,
    })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) { setSearchState("error"); return }
        const tracks: NormalizedTrack[] = j.data ?? []
        setResults(tracks)
        setSearchState(tracks.length === 0 ? "no-results" : "results")
      })
      .catch((e) => { if (e?.name !== "AbortError") setSearchState("error") })
    return () => ctrl.abort()
  }, [debouncedQuery])

  const handlePlay = useCallback((track: NormalizedTrack) => {
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
    if (jukebox.state.currentTrack?.provider_track_id === track.providerTrackId && jukebox.state.isPlaying) {
      jukebox.pause()
    } else {
      jukebox.play(jt)
    }
  }, [jukebox])

  const handleImport = useCallback(async (track: NormalizedTrack) => {
    if (!track.providerTrackId || importedIds.has(track.providerTrackId)) return
    setImportingId(track.providerTrackId)
    try {
      const res = await fetch("/api/music/import", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "audius", externalTrackId: track.providerTrackId, sourceSurface: "music_page" }),
      })
      const j = await res.json()
      if (!res.ok) { toast.error(j?.error?.message || "Import failed"); return }
      setImportedIds((p) => new Set([...p, track.providerTrackId!]))
      toast.success(`"${track.title}" added to your profile`)
    } catch { toast.error("Network error. Please try again.") }
    finally { setImportingId(null) }
  }, [importedIds])

  const displayTracks = searchState === "results" ? results : trending
  const showTrending = searchState === "idle" || searchState === "loading"

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        {searchState === "loading"
          ? <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin pointer-events-none" />
          : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Audius tracks and artists…"
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 h-11"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-lg leading-none">×</button>
        )}
      </div>

      {/* Error */}
      {searchState === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-red-900/20 border border-red-700/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Audius is temporarily unavailable. Try again shortly.
        </div>
      )}

      {/* No results */}
      {searchState === "no-results" && (
        <div className="flex flex-col items-center py-14 text-slate-500">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No tracks found for &ldquo;{debouncedQuery}&rdquo;</p>
        </div>
      )}

      {/* Section header */}
      {showTrending && trendingState !== "error" && (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">
            {trendingState === "loading" ? "Loading trending tracks…" : "Trending on Audius this week"}
          </span>
          {trendingState === "ready" && <ProviderBadge provider="audius" />}
          {trendingState === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        </div>
      )}
      {showTrending && trendingState === "error" && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
          <AlertCircle className="h-4 w-4" /> Could not load Audius tracks
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

      {/* Track list */}
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
                {/* Artwork + play overlay */}
                <button
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
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-lg bg-black/55 transition-opacity",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                  </div>
                </button>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("truncate text-sm font-medium", isCurrent ? "text-purple-300" : "text-white")}>
                      {track.title}
                    </p>
                    {isUnavailable && (
                      <Badge variant="secondary" className="text-[10px] shrink-0 bg-red-900/40 text-red-400 border-red-700/30 hidden sm:inline-flex">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="truncate text-xs text-slate-400">{track.artistName}</p>
                    {track.durationMs && <span className="text-xs text-slate-600 shrink-0">{fmtMs(track.durationMs)}</span>}
                  </div>
                </div>

                {/* Provider badge (links to Audius) */}
                <ProviderBadge
                  provider="audius"
                  canonicalUrl={pid ? `https://audius.co/tracks/${pid}` : undefined}
                  className="shrink-0 hidden sm:inline-flex"
                />

                {/* Add to profile */}
                <button
                  onClick={() => handleImport(track)}
                  disabled={isImporting || isImported || isUnavailable}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 flex items-center gap-1",
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
                  {isImported ? "Added" : isImporting
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <><Plus className="h-3 w-3" />Add</>}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Attribution */}
      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-slate-600">
        <span>Music powered by</span>
        <a href="https://audius.co" target="_blank" rel="noopener noreferrer"
          className="text-purple-500 hover:text-purple-400 inline-flex items-center gap-1">
          Audius <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

// ─── Playlist card ─────────────────────────────────────────────────────────────

function PlaylistCard({ playlist, onShare }: { playlist: JukeboxPlaylist; onShare: (id: string) => void }) {
  const VisIcon =
    playlist.visibility === "public" ? Globe :
    playlist.visibility === "unlisted" ? Users : Lock

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 hover:bg-white/8 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
        <ListMusic className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{playlist.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
          <VisIcon className="h-3 w-3" />
          <span>{playlist.items?.length ?? 0} track{(playlist.items?.length ?? 0) !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <button
        onClick={() => onShare(playlist.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white p-1 rounded"
        aria-label="Share playlist to feed"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MusicPage() {
  const jukebox = useJukeboxOptional()

  const [library, setLibrary] = useState<JukeboxTrack[]>([])
  const [playlists, setPlaylists] = useState<JukeboxPlaylist[]>([])
  const [libLoading, setLibLoading] = useState(true)

  const [discoverTracks, setDiscoverTracks] = useState<JukeboxTrack[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverGenre, setDiscoverGenre] = useState("All")
  const [discoverSort, setDiscoverSort] = useState<"recent" | "popular" | "trending">("recent")

  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)

  // Detect Audius flags — safe for SSR (will be false server-side)
  const audiusEnabled =
    process.env.NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED === "true"

  // Load library + playlists
  useEffect(() => {
    setLibLoading(true)
    Promise.all([fetchLibraryTracks(), fetchUserPlaylists({ includeItems: true })])
      .then(([lib, pls]) => { setLibrary(lib); setPlaylists(pls) })
      .catch(() => {})
      .finally(() => setLibLoading(false))
  }, [])

  // Load discover
  const loadDiscover = useCallback(async (genre: string, sort: "recent" | "popular" | "trending") => {
    setDiscoverLoading(true)
    try {
      const tracks = await fetchDiscoverTracks({ genre: genre === "All" ? undefined : genre, sortBy: sort, limit: 30 })
      setDiscoverTracks(tracks)
    } catch { setDiscoverTracks([]) }
    finally { setDiscoverLoading(false) }
  }, [])

  useEffect(() => { loadDiscover(discoverGenre, discoverSort) }, [discoverGenre, discoverSort, loadDiscover])

  const totalLibrarySecs = useMemo(() => library.reduce((s, t) => s + (t.duration ?? 0), 0), [library])

  async function handleCreatePlaylist() {
    if (!newTitle.trim()) return
    setCreatingPlaylist(true)
    try {
      await createPlaylist(newTitle.trim(), newDesc.trim() || undefined)
      const pls = await fetchUserPlaylists({ includeItems: true })
      setPlaylists(pls)
      setNewTitle(""); setNewDesc(""); setShowNewPlaylist(false)
      toast.success("Playlist created")
    } catch { toast.error("Failed to create playlist") }
    finally { setCreatingPlaylist(false) }
  }

  async function handleSharePlaylist(id: string) {
    const res = await fetch("/api/music/share", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: id, createPost: true }),
    })
    res.ok ? toast.success("Playlist shared to feed") : toast.error("Failed to share")
  }

  function handlePlayLibrary(track: JukeboxTrack) {
    if (!jukebox) return
    if (jukebox.state.currentTrack?.id === track.id && jukebox.state.isPlaying) jukebox.pause()
    else jukebox.play(track)
  }

  function handlePlayAllLibrary() {
    if (!jukebox || library.length === 0) return
    jukebox.playPlaylist(library)
    toast.success(`Playing ${library.length} tracks`)
  }

  function handleShuffleLibrary() {
    if (!jukebox || library.length === 0) return
    jukebox.playPlaylist([...library].sort(() => Math.random() - 0.5))
    toast.success("Shuffling library")
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-40">

      {/* Page hero */}
      <div className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-pink-900/20 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 py-9">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Headphones className="h-4 w-4 text-purple-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-purple-400">Music</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your Music</h1>
              <p className="mt-1 text-sm text-slate-400">
                Library · Discover · Playlists
                {audiusEnabled && <> · <span className="text-purple-400 font-medium">Audius</span></>}
              </p>
            </div>
            {!libLoading && library.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="bg-white/8 text-slate-300 border-white/10 text-xs">
                  {library.length} saved
                </Badge>
                <Badge variant="secondary" className="bg-white/8 text-slate-300 border-white/10 text-xs">
                  {fmtMinutes(totalLibrarySecs)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-6">
        <Tabs defaultValue="library" className="space-y-5">

          {/* Tab bar */}
          <TabsList className="bg-white/5 border border-white/10 rounded-xl h-11 p-1 w-full sm:w-auto flex gap-0.5">
            <TabsTrigger value="library" className="rounded-lg text-slate-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-sm flex-1 sm:flex-none">
              <Library className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Library
              {library.length > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">{library.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="discover" className="rounded-lg text-slate-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-sm flex-1 sm:flex-none">
              <Globe className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Discover
            </TabsTrigger>
            {audiusEnabled && (
              <TabsTrigger value="audius" className="rounded-lg text-slate-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-sm flex-1 sm:flex-none">
                <Music2 className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                Audius
              </TabsTrigger>
            )}
            <TabsTrigger value="playlists" className="rounded-lg text-slate-400 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-sm flex-1 sm:flex-none">
              <ListMusic className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
              Playlists
              {playlists.length > 0 && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">{playlists.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Library ──────────────────────────────────────────────────── */}
          <TabsContent value="library" className="mt-0 space-y-4 focus-visible:outline-none">
            {libLoading ? (
              <div className="flex flex-col items-center py-20 gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading your library…</p>
              </div>
            ) : library.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Library className="h-8 w-8 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">Your library is empty</p>
                  <p className="text-sm text-slate-500 mt-1">Save tracks from artist profiles to build your collection</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Button onClick={handlePlayAllLibrary} className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-5 rounded-full text-sm">
                    <PlayCircle className="h-4 w-4 mr-2" /> Play all
                  </Button>
                  <Button variant="ghost" onClick={handleShuffleLibrary} className="text-slate-400 hover:text-white h-9 px-4 rounded-full text-sm">
                    <Shuffle className="h-4 w-4 mr-2" /> Shuffle
                  </Button>
                </div>

                <div className="space-y-0.5">
                  {library.map((track, i) => {
                    const isCurrent = jukebox?.state.currentTrack?.id === track.id
                    const isPlaying = isCurrent && jukebox?.state.isPlaying
                    return (
                      <div
                        key={track.id}
                        onClick={() => handlePlayLibrary(track)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all border",
                          isCurrent
                            ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 border-purple-500/25"
                            : "hover:bg-white/5 border-transparent"
                        )}
                      >
                        {/* Index */}
                        <span className="w-5 text-center text-xs text-slate-600 group-hover:hidden shrink-0 tabular-nums">
                          {isPlaying ? null : i + 1}
                        </span>
                        <span className="w-5 text-center hidden group-hover:inline shrink-0">
                          {isPlaying
                            ? <Pause className="h-3.5 w-3.5 text-purple-400 mx-auto" />
                            : <Play className="h-3.5 w-3.5 text-white mx-auto" />}
                        </span>

                        <TrackCoverImage
                          src={track.cover_art_url}
                          trackId={track.id}
                          className="h-10 w-10 rounded-lg shrink-0"
                          iconClassName="h-4 w-4"
                        />

                        <div className="flex-1 min-w-0">
                          <p className={cn("truncate text-sm font-medium", isCurrent ? "text-purple-300" : "text-white")}>
                            {track.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="truncate text-xs text-slate-400">{track.artist_name}</p>
                            {track.provider === "audius" && <ProviderBadge provider="audius" className="shrink-0" />}
                          </div>
                        </div>

                        {track.genre && (
                          <Badge variant="secondary" className="hidden sm:inline-flex bg-purple-500/10 text-purple-300 border-purple-500/20 text-[10px] shrink-0">
                            {track.genre}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-600 shrink-0 w-10 text-right tabular-nums">
                          {fmtSeconds(track.duration)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Discover ─────────────────────────────────────────────────── */}
          <TabsContent value="discover" className="mt-0 space-y-4 focus-visible:outline-none">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 shrink-0">
                {(["recent", "popular", "trending"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setDiscoverSort(s)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                      discoverSort === s ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                    )}
                  >{s}</button>
                ))}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setDiscoverGenre(g)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 border",
                      discoverGenre === g
                        ? "bg-purple-600 text-white border-purple-600"
                        : "text-slate-400 hover:text-white border-white/10"
                    )}
                  >{g}</button>
                ))}
              </div>
            </div>

            {discoverLoading ? (
              <div className="flex flex-col items-center py-16 gap-3 text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin" />
                <p className="text-sm">Loading tracks…</p>
              </div>
            ) : discoverTracks.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2 text-slate-500">
                <Music2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">No tracks found</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {discoverTracks.map((track) => (
                  <TrackCard key={track.id} track={track} playlists={playlists} compact />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Audius ───────────────────────────────────────────────────── */}
          {audiusEnabled && (
            <TabsContent value="audius" className="mt-0 focus-visible:outline-none">
              <AudiusSection playlists={playlists} />
            </TabsContent>
          )}

          {/* ── Playlists ─────────────────────────────────────────────────── */}
          <TabsContent value="playlists" className="mt-0 space-y-4 focus-visible:outline-none">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Your playlists</h2>
              <Button
                size="sm"
                onClick={() => setShowNewPlaylist(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white h-8 px-3 rounded-full text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New playlist
              </Button>
            </div>

            {libLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-8">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : playlists.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ListMusic className="h-8 w-8 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">No playlists yet</p>
                  <p className="text-sm text-slate-500 mt-1">Create your first playlist to organise your tracks</p>
                </div>
                <Button size="sm" onClick={() => setShowNewPlaylist(true)} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full">
                  <Plus className="h-4 w-4 mr-2" /> Create playlist
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {playlists.map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} onShare={handleSharePlaylist} />
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* New playlist dialog */}
      <Dialog open={showNewPlaylist} onOpenChange={setShowNewPlaylist}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Create playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist name…"
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              autoFocus
            />
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowNewPlaylist(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreatePlaylist}
                disabled={!newTitle.trim() || creatingPlaylist}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                {creatingPlaylist ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
