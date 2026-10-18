"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck, CassetteTape, ChevronDown, Disc3, Globe2, MapPin, Music2,
  Play, RotateCw, SlidersHorizontal, Sparkles, Stamp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import type { JukeboxVisualTheme } from "@/lib/jukebox/visual-themes"
import {
  CITIES, DECADES, MOOD_OPTIONS, crateTracks, tracksForCity, tracksForDecade, tracksForMood,
  type JukeboxCity, type JukeboxDecade, type JukeboxMood,
} from "@/lib/jukebox/discovery-extras"

type Mode = "mood" | "era" | "city" | "crate" | "passport"
const MODES: { id: Mode; label: string }[] = [
  { id: "mood", label: "Mood Dial" },
  { id: "era", label: "Time Machine" },
  { id: "city", label: "City Sounds" },
  { id: "crate", label: "Crate Dig" },
  { id: "passport", label: "Passport" },
]
const PASSPORT_KEY = "tourify-jukebox-passport-v1"

function ChoiceRow({ track, onPlay }: { track: JukeboxTrack; onPlay: (track: JukeboxTrack) => void }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      onClick={() => onPlay(track)}
      aria-label={"Play " + track.title + " by " + track.artist_name}
    >
      <TrackCoverImage
        src={track.cover_art_url}
        trackId={track.id}
        className="h-9 w-9 shrink-0 rounded-md"
        iconClassName="h-4 w-4"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-white">{track.title}</span>
        <span className="block truncate text-[10px] text-white/50">{track.artist_name}</span>
      </span>
      <Play className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden="true" />
    </button>
  )
}

function DiscoveryMessage({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-white/60">{children}</p>
}

export function JukeboxDiscoveryPlayground({
  tracks,
  theme,
  onPlay,
}: {
  tracks: JukeboxTrack[]
  theme: JukeboxVisualTheme
  onPlay: (track: JukeboxTrack) => void
}) {
  const ctx = useJukeboxOptional()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("mood")
  const [mood, setMood] = useState<JukeboxMood>("adventure")
  const [decade, setDecade] = useState<JukeboxDecade>("1980s")
  const [city, setCity] = useState<JukeboxCity>("Las Vegas")
  const [seed, setSeed] = useState(0)
  const [passportOn, setPassportOn] = useState(false)
  const [stamps, setStamps] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const value = localStorage.getItem(PASSPORT_KEY)
      if (value) {
        const record: unknown = JSON.parse(value)
        if (record && typeof record === "object") {
          const saved = record as { enabled?: unknown; stamps?: unknown }
          setPassportOn(saved.enabled === true)
          if (Array.isArray(saved.stamps)) {
            setStamps(saved.stamps.filter((item): item is string =>
              typeof item === "string" && item.length > 0 && item.length < 80
            ).slice(0, 60))
          }
        }
      }
    } catch {
      // Private browsing can block localStorage; the player should still work.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(PASSPORT_KEY, JSON.stringify({ enabled: passportOn, stamps }))
    } catch {}
  }, [hydrated, passportOn, stamps])

  const playingTrack = ctx?.state.currentTrack || null
  const playing = Boolean(ctx?.state.isPlaying)
  // Earn one local genre stamp only after the audio player reports playback.
  // These are personal-device keepsakes, NOT server-verified participation badges.
  useEffect(() => {
    const genre = playingTrack?.genre?.trim()
    if (!passportOn || !playing || !genre || genre.length > 64) return
    setStamps((previous) => previous.some((value) => value.toLowerCase() === genre.toLowerCase())
      ? previous
      : [...previous, genre].slice(0, 60))
  }, [passportOn, playing, playingTrack?.id, playingTrack?.genre])

  const matches = useMemo(() => {
    if (mode === "mood") return tracksForMood(tracks, mood).slice(0, 4)
    if (mode === "era") return tracksForDecade(tracks, decade).slice(0, 4)
    if (mode === "city") return tracksForCity(tracks, city).slice(0, 4)
    if (mode === "crate") return crateTracks(tracks, seed, playingTrack?.id, 3)
    return []
  }, [tracks, mode, mood, decade, city, seed, playingTrack?.id])

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span className="flex items-center gap-2">
          <span className={cn("rounded-lg bg-gradient-to-br p-2", theme.previewGradient)}>
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span><strong className="block text-xs text-white">Discovery Playground</strong>
            <span className="block text-[10px] text-white/50">Moods, decades, cities & record crates</span></span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/70 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-white/10 p-3">
          <div className="flex flex-wrap gap-1.5" aria-label="Choose music discovery experience">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  mode === item.id ? "bg-white/20 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >{item.label}</button>
            ))}
          </div>

          {mode === "mood" && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><SlidersHorizontal className="h-3.5 w-3.5" /> Pick your mood</p>
              <div className="grid grid-cols-2 gap-1.5">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={mood === option.id}
                    onClick={() => setMood(option.id)}
                    className={cn("rounded-xl border p-2 text-left text-[11px] transition", mood === option.id ? "border-white/60 bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10")}
                  >
                    <strong className="block">{option.name}</strong>
                    <span className="text-[10px] text-white/45">{option.description}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/45">Mood matches use artist-supplied genre and tags, not audio analysis.</p>
            </div>
          )}

          {mode === "era" && (
            <div className="space-y-2">
              <label htmlFor="jukebox-decade" className="flex items-center gap-1.5 text-xs font-semibold text-white"><CassetteTape className="h-3.5 w-3.5" /> Music Time Machine</label>
              <select
                id="jukebox-decade"
                value={decade}
                onChange={(e) => setDecade(e.target.value as JukeboxDecade)}
                className="w-full rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-xs text-white"
              >{DECADES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <p className="text-[10px] text-white/45">Only tracks explicitly tagged with a release year or decade appear. Upload dates are never used as release dates.</p>
            </div>
          )}

          {mode === "city" && (
            <div className="space-y-2">
              <label htmlFor="jukebox-city" className="flex items-center gap-1.5 text-xs font-semibold text-white"><MapPin className="h-3.5 w-3.5" /> City Soundtracks</label>
              <select
                id="jukebox-city"
                value={city}
                onChange={(e) => setCity(e.target.value as JukeboxCity)}
                className="w-full rounded-lg border border-white/20 bg-slate-900 px-2 py-2 text-xs text-white"
              >{CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <p className="text-[10px] text-white/45">Cities require explicit artist city, scene, or hometown tags. Location isn't guessed.</p>
            </div>
          )}

          {mode === "crate" && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Disc3 className="h-3.5 w-3.5" /> Mystery Record Crate</p>
              <p className="text-[11px] leading-relaxed text-white/60">Dig through three real tracks from the current discovery pool.</p>
              <button
                type="button"
                onClick={() => setSeed((value) => value + 1)}
                disabled={tracks.length < 2}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs text-white transition hover:bg-white/20 disabled:opacity-40"
              ><RotateCw className="h-3.5 w-3.5" /> Dig again</button>
            </div>
          )}

          {mode === "passport" ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Globe2 className="h-3.5 w-3.5" /> My Music Passport</p>
              <p className="text-[11px] leading-relaxed text-white/60">Collect personal genre stamps while you listen. Stored on this device, and not a verified badge or account achievement.</p>
              <button
                type="button"
                aria-pressed={passportOn}
                onClick={() => setPassportOn((value) => !value)}
                className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", passportOn ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/20 bg-white/10")}
              >{passportOn ? "Collecting stamps · On" : "Start collecting · Off"}</button>
              {stamps.length ? <div className="flex flex-wrap gap-1.5">
                {stamps.map((stamp) => <span key={stamp} className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-200"><Stamp className="h-3 w-3" />{stamp}</span>)}
              </div> : <DiscoveryMessage>No stamps collected yet. Play a track with a genre while collecting is on.</DiscoveryMessage>}
              {stamps.length > 0 && (
                <button type="button" onClick={() => setStamps([])} className="text-[10px] text-white/60 underline underline-offset-2 hover:text-white">Clear local stamps</button>
              )}
              <p className="flex items-center gap-1 text-[10px] text-white/45"><BadgeCheck className="h-3 w-3" /> Future server-verified achievements will be separate.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {matches.length ? matches.map((track) =>
                <ChoiceRow key={track.id} track={track} onPlay={onPlay} />
              ) : <DiscoveryMessage>
                {mode === "era" ? "No tracks with verified decade tags in this discovery selection yet." :
                 mode === "city" ? "No artists tagged with this city in this discovery selection yet." :
                 mode === "mood" ? "No tracks match this mood yet. Try Explore for a broader mix." :
                 "The record crate is empty right now."}
              </DiscoveryMessage>}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
