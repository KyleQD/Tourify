"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronRight,
  Compass,
  Disc3,
  Heart,
  ListMusic,
  Maximize2,
  Music2,
  Palette,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { fetchDiscoverTracks, fetchFavoriteTracks } from "@/lib/services/jukebox.service"
import { getTheme, JUKEBOX_THEMES } from "@/lib/jukebox/visual-themes"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { PlayerSocialActions } from "@/components/jukebox/player-actions"
import { pickDailyTrack, uniquePlayableTracks } from "@/lib/jukebox/home-discovery"

interface JukeboxPlayerProps {
  className?: string
}

type DiscoveryMode = "for-you" | "trending"

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00"
  const seconds = Math.floor(value)
  return String(Math.floor(seconds / 60)) + ":" + String(seconds % 60).padStart(2, "0")
}

function TrackRow({
  track,
  label,
  onPlay,
}: {
  track: JukeboxTrack
  label?: string
  onPlay: (track: JukeboxTrack) => void
}) {
  return (
    <button
      type="button"
      className="group flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.035] p-2 text-left transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      onClick={() => onPlay(track)}
      aria-label={"Play " + track.title + " by " + track.artist_name}
    >
      <TrackCoverImage
        src={track.cover_art_url}
        trackId={track.id}
        className="h-10 w-10 shrink-0 rounded-lg"
        iconClassName="h-4 w-4"
      />
      <span className="min-w-0 flex-1">
        {label ? <span className="block text-[10px] font-semibold uppercase tracking-wider text-violet-300">{label}</span> : null}
        <span className="block truncate text-xs font-semibold text-white">{track.title}</span>
        <span className="block truncate text-[11px] text-slate-400">{track.artist_name}</span>
      </span>
      <Play className="h-4 w-4 shrink-0 text-white/60 group-hover:text-white" aria-hidden="true" />
    </button>
  )
}

export function JukeboxPlayer({ className }: JukeboxPlayerProps) {
  const ctx = useJukeboxOptional()
  const [recent, setRecent] = useState<JukeboxTrack[]>([])
  const [trending, setTrending] = useState<JukeboxTrack[]>([])
  const [favorites, setFavorites] = useState<JukeboxTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [mode, setMode] = useState<DiscoveryMode>("for-you")
  const [showSkins, setShowSkins] = useState(false)
  // The daily seed is UTC so every visitor shares the same calendar boundary.
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const refreshDay = () => setDay(new Date().toISOString().slice(0, 10))
    const timer = window.setInterval(refreshDay, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadFailed(false)
      const results = await Promise.allSettled([
        fetchDiscoverTracks({ sortBy: "recent", limit: 50 }),
        fetchDiscoverTracks({ sortBy: "trending", limit: 35 }),
        fetchFavoriteTracks({ limit: 20 }),
      ])
      if (!active) return
      const fresh = results[0].status === "fulfilled" ? results[0].value : []
      const hot = results[1].status === "fulfilled" ? results[1].value : []
      const liked = results[2].status === "fulfilled" ? results[2].value.data : []
      setRecent(uniquePlayableTracks(fresh))
      setTrending(uniquePlayableTracks(hot))
      setFavorites(liked)
      setLoadFailed(results[0].status === "rejected" && results[1].status === "rejected")
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])

  const theme = getTheme(ctx?.state.visualTheme || "default")
  const pool = useMemo(() => uniquePlayableTracks([...recent, ...trending]), [recent, trending])
  const daily = useMemo(() => pickDailyTrack(pool, day), [pool, day])
  const recommendations = useMemo(() => {
    const likedIds = new Set(favorites.map((track) => track.id))
    const genres = new Set(favorites.map((track) => track.genre?.toLowerCase()).filter(Boolean))
    const related = pool.filter((track) => (
      !likedIds.has(track.id) &&
      track.id !== daily?.id &&
      genres.has(track.genre?.toLowerCase())
    ))
    const remainder = pool.filter((track) => (
      !likedIds.has(track.id) && track.id !== daily?.id && !related.some((item) => item.id === track.id)
    ))
    return [...related, ...remainder].slice(0, 4)
  }, [favorites, pool, daily])

  const nowPlaying = ctx?.state.currentTrack || null
  const hero = nowPlaying || daily
  const heroIsPlaying = Boolean(nowPlaying && hero?.id === nowPlaying.id && ctx?.state.isPlaying)
  const heroIsCurrent = Boolean(nowPlaying && hero?.id === nowPlaying.id)
  const duration = ctx?.state.duration || 0
  const progress = heroIsCurrent ? ctx?.state.currentTime || 0 : 0
  const visibleTracks = mode === "trending"
    ? trending.filter((track) => track.id !== daily?.id).slice(0, 3)
    : recommendations.slice(0, 3)

  function play(track: JukeboxTrack) {
    if (!ctx) return
    if (ctx.state.currentTrack?.id === track.id) ctx.togglePlayPause()
    else ctx.play(track, { source: "jukebox-home" })
  }

  function surprise() {
    if (!ctx || !pool.length) return
    const options = pool.filter((track) => track.id !== ctx.state.currentTrack?.id)
    const choices = options.length ? options : pool
    ctx.play(choices[Math.floor(Math.random() * choices.length)], { source: "jukebox-surprise" })
  }

  return (
    <section
      aria-label="Flow Jukebox music discovery"
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border text-white shadow-2xl shadow-black/25",
        theme.widgetSurfaceClass || theme.barBgClass,
        theme.barBorderClass,
        className
      )}
    >
      <div className={cn("pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-gradient-to-br opacity-20 blur-3xl", theme.previewGradient)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative space-y-4 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg", theme.previewGradient)}>
              <Disc3 className={cn("h-5 w-5 text-white", heroIsPlaying && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide">JUKEBOX <span className="font-normal text-white/50">✦</span></h2>
              <p className="text-[11px] text-white/55">Your daily soundtrack</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Customize your jukebox"
              aria-label="Choose a Jukebox skin"
              aria-expanded={showSkins}
              onClick={() => setShowSkins((open) => !open)}
              className={cn("rounded-lg p-2 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white", showSkins && "bg-white/15")}
            ><Palette className="h-4 w-4" /></button>
            <button
              type="button"
              title="Open full player"
              aria-label="Open full Jukebox"
              onClick={() => ctx?.setExpanded(true, "discover")}
              className="rounded-lg p-2 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
            ><Maximize2 className="h-4 w-4" /></button>
          </div>
        </header>

        {showSkins && (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3" aria-label="Jukebox skin selector">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Make it yours</span>
              <span className="text-[10px] text-white/50">{JUKEBOX_THEMES.length} skins</span>
            </div>
            <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {JUKEBOX_THEMES.map((skin) => (
                <button
                  type="button"
                  key={skin.id}
                  title={skin.description}
                  aria-label={"Use " + skin.name + " skin"}
                  aria-pressed={skin.id === theme.id}
                  onClick={() => { ctx?.setVisualTheme(skin.id); setShowSkins(false) }}
                  className={cn(
                    "min-w-0 rounded-xl border p-1.5 text-left transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white",
                    skin.id === theme.id ? "border-white/70 bg-white/15" : "border-white/10"
                  )}
                >
                  <span className={cn("mb-1 block h-8 rounded-lg bg-gradient-to-r", skin.previewGradient)} aria-hidden="true" />
                  <span className="block truncate text-[10px] text-white/85">{skin.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/45">Your selection is saved on this device.</p>
          </div>
        )}

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3.5">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {hero ? (
                <TrackCoverImage
                  src={hero.cover_art_url}
                  trackId={hero.id}
                  className={cn(
                    "h-[76px] w-[76px] rounded-xl border border-white/10 shadow-xl sm:h-[88px] sm:w-[88px]",
                    heroIsPlaying && theme.artVariant === "spin" && "animate-spin motion-reduce:animate-none"
                  )}
                  iconClassName="h-7 w-7"
                />
              ) : (
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-xl bg-white/10 sm:h-[88px] sm:w-[88px]">
                  <Music2 className="h-8 w-8 text-white/50" />
                </div>
              )}
              {heroIsPlaying && <span className="absolute -bottom-1 -right-1 rounded-full border border-white/20 bg-violet-500 p-1"><Disc3 className="h-3 w-3 animate-spin motion-reduce:animate-none" /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {nowPlaying ? "Now playing" : "Song of the Day"}
              </p>
              <p className="line-clamp-2 text-base font-bold leading-tight">{hero?.title || (loading ? "Finding today's soundtrack…" : "Your next favorite awaits")}</p>
              <p className="mt-1 truncate text-xs text-white/55">{hero?.artist_name || "Explore new music on Flow"}</p>
              {hero?.genre ? <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">{hero.genre}</span> : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => ctx?.prev()}
              disabled={!nowPlaying}
              aria-label="Previous track"
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            ><SkipBack className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => hero && play(hero)}
              disabled={!hero}
              aria-label={heroIsPlaying ? "Pause" : "Play"}
              className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50", theme.previewGradient)}
            >{heroIsPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}</button>
            <button
              type="button"
              onClick={() => ctx?.next()}
              disabled={!nowPlaying}
              aria-label="Next track"
              className="rounded-full p-2 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            ><SkipForward className="h-4 w-4" /></button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="w-8 text-[10px] tabular-nums text-white/50">{formatTime(progress)}</span>
            <input
              aria-label="Seek through current track"
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={1}
              value={Math.min(progress, Math.max(1, duration))}
              disabled={!heroIsCurrent || duration <= 0}
              onChange={(event) => ctx?.seekTo(Number(event.currentTarget.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-violet-400 disabled:cursor-default"
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-white/50">{formatTime(heroIsCurrent ? duration : (hero?.duration || 0))}</span>
          </div>
          {ctx?.state.playbackError ? <p role="alert" className="mt-2 text-xs text-rose-300">{ctx.state.playbackError}</p> : null}
          {nowPlaying ? <div className="mt-2 flex justify-center"><PlayerSocialActions trackId={nowPlaying.id} initialInLibrary={nowPlaying.in_library} /></div> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Song of the Day</h3>
            <span className="text-[10px] text-white/45">{day}</span>
          </div>
          {daily ? <TrackRow track={daily} onPlay={play} label="Today's discovery" /> : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60">
              {loading ? "Loading today's pick…" : "No public tracks available for today's pick yet."}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1" role="group" aria-label="Discovery category">
            <button
              type="button"
              aria-pressed={mode === "for-you"}
              onClick={() => setMode("for-you")}
              className={cn("flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition", mode === "for-you" ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}
            ><WandSparkles className="h-3.5 w-3.5" /> For You</button>
            <button
              type="button"
              aria-pressed={mode === "trending"}
              onClick={() => setMode("trending")}
              className={cn("flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition", mode === "trending" ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}
            ><TrendingUp className="h-3.5 w-3.5" /> Trending</button>
          </div>
          {mode === "for-you" && (
            <p className="px-1 text-[10px] text-white/45">{favorites.length ? "Inspired by songs you've liked" : "Fresh discoveries to get you started"}</p>
          )}
          {visibleTracks.length ? (
            <div className="space-y-1.5">{visibleTracks.map((track) => <TrackRow key={track.id} track={track} onPlay={play} />)}</div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60">
              {loading ? "Finding songs…" : loadFailed ? "Music discovery is temporarily unavailable." : "More music will appear here as artists publish tracks."}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={surprise}
          disabled={!pool.length}
          className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/[0.07] p-3 text-left transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
        >
          <span className="flex items-center gap-2.5">
            <span className={cn("rounded-xl bg-gradient-to-br p-2", theme.previewGradient)}><Shuffle className="h-4 w-4" /></span>
            <span><strong className="block text-xs">Surprise Me</strong><span className="text-[10px] text-white/50">Take a musical detour</span></span>
          </span>
          <ChevronRight className="h-4 w-4 text-white/50 transition group-hover:translate-x-1" aria-hidden="true" />
        </button>

        <nav className="grid grid-cols-3 gap-1 border-t border-white/10 pt-3" aria-label="Jukebox collections">
          <button type="button" onClick={() => ctx?.setExpanded(true, "favorites")} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"><Heart className="h-4 w-4" />Liked</button>
          <button type="button" onClick={() => ctx?.setExpanded(true, "discover")} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"><Compass className="h-4 w-4" />Explore</button>
          <button type="button" onClick={() => ctx?.setExpanded(true, "playlists")} className="flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"><ListMusic className="h-4 w-4" />Playlists</button>
        </nav>
        <p className="text-center text-[10px] text-white/35">Powered by independent music on Tourify</p>
      </div>
    </section>
  )
}
