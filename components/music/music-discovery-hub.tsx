"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight, CassetteTape, ChevronRight, Compass, Disc3, Headphones,
  Heart, Library, ListMusic, MapPin, Music2, Pause, Play, Search,
  Shuffle, SlidersHorizontal, Sparkles, TrendingUp, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { fetchDiscoverTracks, fetchFavoriteTracks } from "@/lib/services/jukebox.service"
import { pickDailyTrack, uniquePlayableTracks } from "@/lib/jukebox/home-discovery"
import {
  CITIES, DECADES, MOOD_OPTIONS, crateTracks, tracksForCity,
  tracksForDecade, tracksForMood, type JukeboxCity, type JukeboxDecade,
  type JukeboxMood,
} from "@/lib/jukebox/discovery-extras"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"

type DiscoverMode = "for-you" | "trending" | "new"
type Journey = "mood" | "era" | "city" | "crate"

function findInitialMode(value: string | null): DiscoverMode {
  return value === "trending" || value === "new" ? value : "for-you"
}

function sortByGenreAffinity(tracks: JukeboxTrack[], liked: JukeboxTrack[]): JukeboxTrack[] {
  if (!liked.length) return tracks
  const ids = new Set(liked.map((track) => track.id))
  const genres = new Set(liked.map((track) => track.genre?.trim().toLowerCase()).filter(Boolean))
  return [...tracks].sort((a, b) => {
    const weight = (track: JukeboxTrack) =>
      (genres.has(track.genre?.trim().toLowerCase()) ? 2 : 0) + (ids.has(track.id) ? -3 : 0)
    return weight(b) - weight(a)
  })
}

function iconButtonBase() {
  return "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 p-2.5 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-35"
}

function MusicTile({
  track, onPlay, currentId, playing, compact = false,
}: {
  track: JukeboxTrack
  onPlay: (track: JukeboxTrack) => void
  currentId?: string
  playing: boolean
  compact?: boolean
}) {
  const active = currentId === track.id
  const artistHref = track.artist_id ? getArtistPublicProfilePath(track.artist_id) : null
  return (
    <article className={cn(
      "group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2.5 transition hover:border-violet-400/40 hover:bg-white/[0.065]",
      compact ? "w-[156px] shrink-0 sm:w-[172px]" : "w-[185px] shrink-0 sm:w-[210px]"
    )}>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-900">
        <TrackCoverImage
          src={track.cover_art_url}
          trackId={track.id}
          alt={track.title + " album artwork"}
          className="h-full w-full transition duration-300 motion-safe:group-hover:scale-105"
          iconClassName="h-10 w-10"
        />
        <button type="button" onClick={() => onPlay(track)}
          aria-label={(active && playing ? "Pause " : "Play ") + track.title + " by " + track.artist_name}
          className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg shadow-black/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {active && playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        {active && playing && <span className="absolute left-2 top-2 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">Playing</span>}
      </div>
      <div className="space-y-1 px-0.5 pb-1 pt-2.5">
        <p className="truncate text-sm font-semibold text-white" title={track.title}>{track.title}</p>
        {artistHref ? (
          <Link href={artistHref} className="block truncate text-xs text-slate-400 hover:text-violet-200">{track.artist_name}</Link>
        ) : <p className="truncate text-xs text-slate-400">{track.artist_name}</p>}
        {track.genre && <p className="truncate text-[10px] text-violet-300/80">{track.genre}</p>}
      </div>
    </article>
  )
}

function MusicRail({
  title, eyebrow, description, tracks, onPlay, currentId, playing, small,
}: {
  title: string; eyebrow?: string; description?: string; tracks: JukeboxTrack[]
  onPlay: (track: JukeboxTrack) => void; currentId?: string; playing: boolean; small?: boolean
}) {
  if (!tracks.length) return null
  return (
    <section className="space-y-3" aria-label={title}>
      <div>
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">{eyebrow}</p>}
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {tracks.map((track) => <div key={track.id} className="snap-start">
          <MusicTile track={track} onPlay={onPlay} currentId={currentId} playing={playing} compact={small} />
        </div>)}
      </div>
    </section>
  )
}

export function MusicDiscoveryHub() {
  const params = useSearchParams()
  const ctx = useJukeboxOptional()
  const [recent, setRecent] = useState<JukeboxTrack[]>([])
  const [trending, setTrending] = useState<JukeboxTrack[]>([])
  const [favorites, setFavorites] = useState<JukeboxTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [mode, setMode] = useState<DiscoverMode>(() => findInitialMode(params.get("mode")))
  const [query, setQuery] = useState(() => params.get("q") || "")
  const [genre, setGenre] = useState(() => params.get("genre") || "all")
  const [journey, setJourney] = useState<Journey>("mood")
  const [mood, setMood] = useState<JukeboxMood>("adventure")
  const [decade, setDecade] = useState<JukeboxDecade>("1980s")
  const [city, setCity] = useState<JukeboxCity>("Las Vegas")
  const [crateSeed, setCrateSeed] = useState(1)
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const update = () => setDailyDate(new Date().toISOString().slice(0, 10))
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    // Preserve initial deep links from the homepage Jukebox and browser navigation.
    setMode(findInitialMode(params.get("mode")))
    setQuery(params.get("q") || "")
    setGenre(params.get("genre") || "all")
  }, [params])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setLoadError(false)
      const results = await Promise.allSettled([
        fetchDiscoverTracks({ sortBy: "recent", limit: 80 }),
        fetchDiscoverTracks({ sortBy: "trending", limit: 80 }),
        fetchFavoriteTracks({ limit: 50 }),
      ])
      if (!mounted) return
      setRecent(results[0].status === "fulfilled" ? uniquePlayableTracks(results[0].value) : [])
      setTrending(results[1].status === "fulfilled" ? uniquePlayableTracks(results[1].value) : [])
      setFavorites(results[2].status === "fulfilled" ? results[2].value.data : [])
      setLoadError(results[0].status === "rejected" && results[1].status === "rejected")
      setLoading(false)
    }
    void load()
    return () => { mounted = false }
  }, [])

  const catalog = useMemo(() => uniquePlayableTracks([...trending, ...recent]), [trending, recent])
  // Match the homepage Jukebox's deterministic fallback candidate window.
  // Once editorial scheduling is available, both screens must read the same approved slot.
  const daily = useMemo(() => pickDailyTrack(
    uniquePlayableTracks([...recent.slice(0, 50), ...trending.slice(0, 35)]),
    dailyDate
  ), [recent, trending, dailyDate])
  const spotlight = useMemo(() =>
    catalog.find((track) => track.id === params.get("track")) || daily,
  [catalog, params, daily])
  const ranked = useMemo(() => sortByGenreAffinity(catalog, favorites), [catalog, favorites])
  const genres = useMemo(() => {
    const counts = new Map<string, number>()
    for (const track of catalog) {
      const name = track.genre?.trim()
      if (name && name.length < 45) counts.set(name, (counts.get(name) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([name]) => name)
  }, [catalog])
  const artistSpotlights = useMemo(() => {
    const seen = new Set<string>()
    return ranked.filter((track) => {
      if (!track.artist_id || seen.has(track.artist_id)) return false
      seen.add(track.artist_id)
      return true
    }).slice(0, 9)
  }, [ranked])
  const searchActive = Boolean(query.trim()) || genre !== "all"
  const list = useMemo(() => {
    const base = mode === "new" ? recent : mode === "trending" ? trending : ranked
    const q = query.trim().toLowerCase()
    return base.filter((track) => {
      const correctGenre = genre === "all" || track.genre?.toLowerCase() === genre.toLowerCase()
      const correctQuery = !q || [track.title, track.artist_name, track.genre || "", ...(track.tags || [])]
        .some((value) => value.toLowerCase().includes(q))
      return correctGenre && correctQuery
    })
  }, [mode, recent, trending, ranked, query, genre])

  const journeyTracks = useMemo(() => {
    if (journey === "mood") return tracksForMood(catalog, mood).slice(0, 6)
    if (journey === "era") return tracksForDecade(catalog, decade).slice(0, 6)
    if (journey === "city") return tracksForCity(catalog, city).slice(0, 6)
    return crateTracks(catalog, crateSeed, ctx?.state.currentTrack?.id, 6)
  }, [catalog, journey, mood, decade, city, crateSeed, ctx?.state.currentTrack?.id])

  const nowPlaying = ctx?.state.currentTrack || null
  const isPlaying = Boolean(ctx?.state.isPlaying)
  const spotlightPlaying = spotlight?.id === nowPlaying?.id && isPlaying

  function play(track: JukeboxTrack) {
    if (!ctx) return
    if (ctx.state.currentTrack?.id === track.id) ctx.togglePlayPause()
    else ctx.play(track, { source: "music-discovery-hub" })
  }

  function shuffleCatalog() {
    if (!ctx || !catalog.length) return
    const candidates = catalog.filter((track) => track.id !== nowPlaying?.id)
    const choices = candidates.length ? candidates : catalog
    ctx.play(choices[Math.floor(Math.random() * choices.length)], { source: "music-discovery-surprise" })
  }

  function changeMode(next: DiscoverMode) {
    setMode(next)
  }

  return (
    <main className="min-h-screen bg-[#080913] text-white">
      <div className="relative mx-auto max-w-[1400px] space-y-9 overflow-hidden px-4 pb-24 pt-5 sm:px-7 sm:pt-9">
        <div className="pointer-events-none absolute -top-60 left-1/3 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[110px]" aria-hidden="true" />

        <header className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" aria-label="Go to your Jukebox on the homepage" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-fuchsia-950/40 focus-visible:ring-2 focus-visible:ring-white">
              <Disc3 className="h-6 w-6" aria-hidden="true" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300">Flow Jukebox presents</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Music Discovery<span className="text-violet-400">.</span></h1>
              <p className="text-xs text-slate-400">Find something worth listening to.</p>
            </div>
          </div>
          <nav aria-label="Music navigation" className="flex flex-wrap gap-2 text-xs">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-slate-200 hover:bg-white/10"><Disc3 className="h-3.5 w-3.5" />Jukebox</Link>
            <Link href="/music" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-slate-200 hover:bg-white/10"><Library className="h-3.5 w-3.5" />My Library</Link>
            <button type="button" onClick={() => ctx?.setExpanded(true, "discover")} className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-2.5 text-violet-100 hover:bg-violet-500/25"><Headphones className="h-3.5 w-3.5" />Open Player</button>
          </nav>
        </header>

        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(270px,1fr)]">
          <section className="relative flex min-h-[290px] flex-col justify-end overflow-hidden rounded-[28px] border border-violet-400/15 bg-gradient-to-br from-[#34215d] via-[#1b1538] to-[#0b0f22] p-5 shadow-2xl shadow-violet-950/20 sm:min-h-[330px] sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[65px]" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative w-[136px] shrink-0 self-start rounded-2xl border border-white/10 bg-white/10 p-2 shadow-2xl shadow-black/30 sm:w-[180px]">
                {spotlight ? <TrackCoverImage src={spotlight.cover_art_url} trackId={spotlight.id} alt={spotlight.title + " cover"} className="aspect-square w-full rounded-xl" iconClassName="h-11 w-11" /> :
                  <div className="flex aspect-square items-center justify-center rounded-xl bg-violet-500/20"><Music2 className="h-12 w-12 text-violet-200" /></div>}
                <div className="pointer-events-none absolute -bottom-3 -right-3 rounded-full border-4 border-[#1b1538] bg-fuchsia-500 p-2"><Sparkles className="h-5 w-5" /></div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-200"><Sparkles className="h-3 w-3" />{params.has("track") && spotlight?.id === params.get("track") ? "Your discovery spotlight" : "Today's discovery"}</p>
                <h2 className="line-clamp-2 text-3xl font-black tracking-tight sm:text-4xl">{spotlight?.title || (loading ? "Digging through records…" : "Your next favorite starts here")}</h2>
                <p className="mt-1 text-sm text-purple-100/65">{spotlight?.artist_name || "Explore independent music from Tourify artists"}</p>
                {spotlight?.genre && <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold">{spotlight.genre}</span>}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => spotlight && play(spotlight)} disabled={!spotlight}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-violet-100 disabled:opacity-50">
                    {spotlightPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{spotlightPlaying ? "Pause track" : "Listen now"}
                  </button>
                  <button type="button" onClick={shuffleCatalog} disabled={!catalog.length}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40">
                    <Shuffle className="h-4 w-4" />Surprise me
                  </button>
                  {spotlight?.artist_id && <Link href={getArtistPublicProfilePath(spotlight.artist_id) || "/discover"}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-100 hover:text-white">Meet the artist <ArrowRight className="h-3 w-3" /></Link>}
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#111525] p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">Your listening room</p>
              <h2 className="mt-1 text-xl font-bold">The music follows you.</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">Explore artists, tracks and scenes without closing your Jukebox.</p>
            </div>
            {nowPlaying ? (
              <div className="flex items-center gap-3 rounded-2xl border border-violet-400/15 bg-violet-500/10 p-3">
                <TrackCoverImage src={nowPlaying.cover_art_url} trackId={nowPlaying.id} alt="" className="h-14 w-14 rounded-xl" />
                <div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-violet-300">NOW PLAYING</p><p className="truncate text-sm font-semibold">{nowPlaying.title}</p><p className="truncate text-xs text-slate-400">{nowPlaying.artist_name}</p></div>
                <button type="button" className={iconButtonBase()} aria-label={isPlaying ? "Pause music" : "Resume music"} onClick={() => ctx?.togglePlayPause()}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-slate-400">Pick a song below to begin listening.</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/music" className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"><ListMusic className="h-5 w-5 text-violet-300" /><span className="text-xs font-semibold">Playlists</span><span className="text-[10px] text-slate-500">Collect favorites</span></Link>
              <Link href="/discover" className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"><Compass className="h-5 w-5 text-fuchsia-300" /><span className="text-xs font-semibold">Explore Flow</span><span className="text-[10px] text-slate-500">Artists & events</span></Link>
            </div>
          </aside>
        </div>

        <section className="relative space-y-4" aria-label="Find music">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex min-w-0 flex-1 items-center rounded-2xl border border-white/15 bg-white/[0.055] p-1 focus-within:border-violet-400">
              <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Search songs, artists, genres and tags</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Search songs, artists, genres…" className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="mr-2 rounded-full p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>}
            </label>
            <div className="flex shrink-0 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.045] p-1" role="group" aria-label="Music feed">
              {([
                { id: "for-you" as const, label: "For You", icon: Sparkles },
                { id: "trending" as const, label: "Trending", icon: TrendingUp },
                { id: "new" as const, label: "Just Added", icon: Music2 },
              ]).map((item) => {
                const Icon = item.icon
                return <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => changeMode(item.id)}
                  className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition", mode === item.id ? "bg-violet-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white")}>
                  <Icon className="h-3.5 w-3.5" />{item.label}
                </button>
              })}
            </div>
          </div>
          {genres.length > 0 && <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
            {["all", ...genres].map((item) => (
              <button key={item} type="button" onClick={() => setGenre(item)} aria-pressed={genre === item}
                className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold transition", genre === item ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/[0.045] text-slate-400 hover:border-violet-400/30 hover:text-white")}>
                {item === "all" ? "All sounds" : item}
              </button>
            ))}
          </div>}
        </section>

        {loading ? (
          <section role="status" className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <div className="h-5 w-40 animate-pulse rounded-lg bg-white/10" />
            <p className="text-sm text-slate-400">Loading the music catalog…</p>
          </section>
        ) : searchActive ? (
          <section className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Music Search</p>
                <h2 className="text-2xl font-bold">{list.length} {list.length === 1 ? "track" : "tracks"} found</h2></div>
              <button type="button" onClick={() => { setQuery(""); setGenre("all") }} className="text-xs font-semibold text-violet-300 hover:text-white">Clear filters</button>
            </div>
            {list.length ? <div className="grid grid-cols-2 justify-items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((track) => <div key={track.id} className="[&>article]:!w-full"><MusicTile track={track} onPlay={play} currentId={nowPlaying?.id} playing={isPlaying} /></div>)}
            </div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-slate-400">No published tracks match this search in the current catalog. Try another artist or genre.</div>}
          </section>
        ) : (
          <div className="space-y-10">
            {catalog.length ? <>
              <MusicRail title={mode === "trending" ? "Trending right now" : mode === "new" ? "Fresh from the studio" : "Picked for your ears"}
                eyebrow={mode === "for-you" ? "Personal discovery" : "Music radar"}
                description={mode === "for-you" ? favorites.length ? "A mix inspired by genres you've liked." : "A starting mix while we learn what you love." : mode === "trending" ? "From the catalog's trending music selection." : "Recently published tracks from the catalog."}
                tracks={(mode === "new" ? recent : mode === "trending" ? trending : ranked).slice(0, 12)}
                currentId={nowPlaying?.id} playing={isPlaying} onPlay={play} />
              <MusicRail title="Fresh finds" eyebrow="New music" description="Hear what artists have recently shared."
                tracks={recent.filter((track) => track.id !== daily?.id).slice(0, 10)} currentId={nowPlaying?.id} playing={isPlaying} onPlay={play} small />
              {artistSpotlights.length > 0 && (
                <section className="space-y-4" aria-label="Meet the artists">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Behind the music</p>
                      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Meet the artists.</h2>
                      <p className="mt-0.5 text-xs text-slate-400">Start with the people behind the tracks you discover.</p>
                    </div>
                    <Link href="/discover" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-200 hover:text-white">
                      More on Discover <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    {artistSpotlights.map((track) => {
                      const href = getArtistPublicProfilePath(track.artist_id)
                      if (!href) return null
                      return <Link key={track.artist_id} href={href} className="group flex w-[170px] shrink-0 snap-start flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-fuchsia-400/30 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-violet-300">
                        <TrackCoverImage src={track.cover_art_url} trackId={track.id} alt="" className="aspect-square w-full rounded-xl" iconClassName="h-8 w-8" />
                        <p className="truncate text-sm font-semibold text-white">{track.artist_name}</p>
                        <p className="truncate text-[11px] text-slate-400">Listen to {track.title}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300">Artist profile <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span>
                      </Link>
                    })}
                  </div>
                </section>
              )}
              <MusicRail title="Getting attention" eyebrow="Trending on Tourify" description="Discover tracks that are finding an audience."
                tracks={trending.filter((track) => track.id !== daily?.id).slice(0, 10)} currentId={nowPlaying?.id} playing={isPlaying} onPlay={play} small />
            </> : <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-sm text-slate-400">
              {loadError ? "Music discovery is temporarily unavailable. Try again soon." : "No eligible public tracks are available in the catalog yet."}
            </div>}
          </div>
        )}

        <section className="space-y-5 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#18172d] to-[#0d1420] p-4 sm:p-6" aria-label="Take a music discovery journey">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Go beyond the shuffle</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Pick your own rabbit hole.</h2>
              <p className="mt-1 text-xs text-slate-400">Choose a sound, place or era — or take a chance on a record crate.</p></div>
            <div className="rounded-full border border-white/10 bg-white/5 p-2"><Compass className="h-5 w-5 text-violet-300" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              { id: "mood" as const, title: "Mood Dial", subtitle: "Find your feeling", icon: SlidersHorizontal },
              { id: "era" as const, title: "Time Machine", subtitle: "Travel through sound", icon: CassetteTape },
              { id: "city" as const, title: "City Sounds", subtitle: "Explore music scenes", icon: MapPin },
              { id: "crate" as const, title: "Crate Digging", subtitle: "Uncover a gem", icon: Disc3 },
            ]).map((item) => {
              const Icon = item.icon
              return <button type="button" key={item.id} aria-pressed={journey === item.id} onClick={() => setJourney(item.id)}
                className={cn("flex min-h-[94px] flex-col items-start justify-center gap-1 rounded-2xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-white", journey === item.id ? "border-violet-400/70 bg-violet-500/20" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                <Icon className="mb-1 h-5 w-5 text-violet-200" />
                <span className="text-xs font-bold">{item.title}</span>
                <span className="text-[10px] text-slate-400">{item.subtitle}</span>
              </button>
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {journey === "mood" && MOOD_OPTIONS.map((option) => <button type="button" key={option.id} aria-pressed={mood === option.id}
              onClick={() => setMood(option.id)} className={cn("rounded-full border px-3 py-2 text-xs", mood === option.id ? "border-fuchsia-300/60 bg-fuchsia-400/20 text-white" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10")}>{option.name}</button>)}
            {journey === "era" && <><label htmlFor="music-era-choice" className="text-xs text-slate-400">Choose a decade:</label>
              <select id="music-era-choice" value={decade} onChange={(event) => setDecade(event.target.value as JukeboxDecade)}
                className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs text-white">{DECADES.map((item) => <option key={item} value={item}>{item}</option>)}</select></>}
            {journey === "city" && <><label htmlFor="music-city-choice" className="text-xs text-slate-400">Explore a scene:</label>
              <select id="music-city-choice" value={city} onChange={(event) => setCity(event.target.value as JukeboxCity)}
                className="rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs text-white">{CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></>}
            {journey === "crate" && <button type="button" onClick={() => setCrateSeed((value) => value + 1)} disabled={catalog.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-4 py-2 text-xs font-semibold hover:bg-fuchsia-500/30 disabled:opacity-40"><Shuffle className="h-4 w-4" />Dig another crate</button>}
          </div>
          {journeyTracks.length ? <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {journeyTracks.map((track) => <MusicTile compact key={track.id} track={track} onPlay={play} playing={isPlaying} currentId={nowPlaying?.id} />)}
          </div> : <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-xs text-slate-400">
            {loading ? "Looking for records…" : journey === "era" ? "No tracks with explicit release-year or decade tags are available for this era yet." :
              journey === "city" ? "No tracks have confirmed city or scene tags for this location yet." :
              journey === "mood" ? "No songs currently match this mood. Try Explore." : "There aren't any eligible songs in this crate yet."}
          </div>}
          {(journey === "era" || journey === "city") && <p className="text-[11px] text-slate-500">Only explicitly tagged releases and music scenes appear. We don't guess a track's decade or hometown.</p>}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs text-slate-400">
          <p>Discover tracks from the eligible Tourify catalog. Playback stays subject to artist permissions and availability.</p>
          <div className="flex gap-3">
            <Link href="/music" className="inline-flex items-center gap-1 text-violet-200 hover:text-white"><Heart className="h-3.5 w-3.5" />Save to your library<ChevronRight className="h-3.5 w-3.5" /></Link>
            <Link href="/discover" className="inline-flex items-center gap-1 text-violet-200 hover:text-white">Explore artists and shows <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
