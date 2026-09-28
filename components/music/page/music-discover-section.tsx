"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { TrackCard } from "@/components/jukebox/track-card"
import {
  fetchDiscoverTracks,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import {
  CardGridSkeleton,
  SectionEmpty,
  SectionError,
  SectionHeading,
  TrackListSkeleton,
} from "./section-states"
import { MusicArtworkCard } from "./music-home"

const GENRES = [
  "All",
  "Hip-Hop",
  "Electronic",
  "Pop",
  "R&B",
  "Rock",
  "Jazz",
  "Classical",
  "Country",
  "Metal",
  "Soul",
  "Reggae",
]

type Sort = "recent" | "popular" | "trending"
type LoadState = "loading" | "ready" | "error"

const SORT_LABELS: Record<Sort, string> = {
  recent: "New on Tourify",
  popular: "Popular on Tourify",
  trending: "Trending on Tourify",
}

export function MusicDiscoverSection({
  playlists,
  genre,
  sort,
  onGenreChange,
  onSortChange,
}: {
  playlists: JukeboxPlaylist[]
  genre: string
  sort: string
  onGenreChange: (genre: string) => void
  onSortChange: (sort: string) => void
}) {
  const activeSort: Sort = sort === "popular" || sort === "trending" ? sort : "recent"
  const [tracks, setTracks] = useState<JukeboxTrack[]>([])
  const [state, setState] = useState<LoadState>("loading")
  const [newReleases, setNewReleases] = useState<JukeboxTrack[]>([])
  const [newState, setNewState] = useState<LoadState>("loading")

  const load = useCallback((g: string, s: Sort) => {
    setState("loading")
    fetchDiscoverTracks({ genre: g === "All" ? undefined : g, sortBy: s, limit: 30 })
      .then((t) => {
        setTracks(t)
        setState("ready")
      })
      .catch(() => setState("error"))
  }, [])

  useEffect(() => {
    load(genre, activeSort)
  }, [genre, activeSort, load])

  // "New releases" rail — only when the main list isn't already sorted by recent
  useEffect(() => {
    if (activeSort === "recent") return
    setNewState("loading")
    fetchDiscoverTracks({ sortBy: "recent", limit: 6 })
      .then((t) => {
        setNewReleases(t)
        setNewState("ready")
      })
      .catch(() => setNewState("error"))
  }, [activeSort])

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 shrink-0 self-start"
          role="group"
          aria-label="Sort discovery"
        >
          {(["recent", "popular", "trending"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSortChange(s)}
              aria-pressed={activeSort === s}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                activeSort === s ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide" role="group" aria-label="Filter by genre">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGenreChange(g)}
              aria-pressed={genre === g}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 border min-h-8",
                genre === g
                  ? "bg-purple-600 text-white border-purple-600"
                  : "text-slate-400 hover:text-white border-white/10"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* New releases rail (when browsing popular/trending) */}
      {activeSort !== "recent" && (newState !== "ready" || newReleases.length > 0) && (
        <section aria-labelledby="new-releases">
          <div id="new-releases">
            <SectionHeading title="New Releases" description="Latest drops from Tourify artists" />
          </div>
          <div className="mt-3">
            {newState === "loading" && <CardGridSkeleton />}
            {newState === "error" && (
              <SectionError title="Couldn't load new releases" />
            )}
            {newState === "ready" && newReleases.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {newReleases.map((t) => (
                  <MusicArtworkCard key={t.id} track={t} queue={newReleases} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main track list */}
      <section aria-label={SORT_LABELS[activeSort]}>
        <SectionHeading
          title={genre === "All" ? SORT_LABELS[activeSort] : `${SORT_LABELS[activeSort]} · ${genre}`}
        />
        <div className="mt-3">
          {state === "loading" && <TrackListSkeleton rows={8} />}
          {state === "error" && (
            <SectionError
              title="Couldn't load tracks"
              onRetry={() => load(genre, activeSort)}
            />
          )}
          {state === "ready" &&
            (tracks.length === 0 ? (
              <SectionEmpty
                icon="music"
                title={
                  genre === "All"
                    ? "No tracks found"
                    : `No ${genre} tracks yet`
                }
                description={
                  genre === "All"
                    ? "When artists publish on Tourify, their music will appear here."
                    : "Try another genre or check back soon."
                }
                actionLabel={genre !== "All" ? "Show all genres" : undefined}
                onAction={genre !== "All" ? () => onGenreChange("All") : undefined}
              />
            ) : (
              <div className="space-y-0.5">
                {tracks.map((t, i) => (
                  <TrackCard key={t.id} track={t} playlists={playlists} compact index={i} />
                ))}
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
