"use client"

import { useCallback, useEffect, useState } from "react"
import { Play, Pause, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { TrackCard } from "@/components/jukebox/track-card"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { ProviderBadge } from "@/components/music/provider-badge"
import {
  fetchDiscoverTracks,
  fetchFollowingTracks,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import {
  CardGridSkeleton,
  SectionEmpty,
  SectionError,
  SectionHeading,
  TrackListSkeleton,
} from "./section-states"
import type { MusicSection } from "./use-music-url-state"

type LoadState = "loading" | "ready" | "error"

interface HistoryItem {
  id: string
  title: string
  genre?: string | null
  duration?: number | null
  cover_art_url?: string | null
  file_url?: string | null
  artist_name?: string | null
  artist_user_id?: string | null
  listen_seconds?: number | null
}

function historyToTrack(item: HistoryItem): JukeboxTrack {
  return {
    id: item.id,
    title: item.title,
    artist_name: item.artist_name || "Unknown Artist",
    artist_id: item.artist_user_id ?? undefined,
    duration: item.duration ?? undefined,
    file_url: item.file_url || `/api/music/stream?trackId=${item.id}`,
    cover_art_url: item.cover_art_url ?? undefined,
    genre: item.genre ?? undefined,
  }
}

// ─── Artwork card (playable) ─────────────────────────────────────────────────

export function MusicArtworkCard({
  track,
  queue,
  subtitle,
  badge,
}: {
  track: JukeboxTrack
  queue: JukeboxTrack[]
  subtitle?: string
  badge?: React.ReactNode
}) {
  const jukebox = useJukeboxOptional()
  const isCurrent = jukebox?.state.currentTrack?.id === track.id
  const isPlaying = isCurrent && jukebox?.state.isPlaying

  return (
    <button
      type="button"
      onClick={() => {
        if (!jukebox) return
        if (isPlaying) jukebox.pause()
        else {
          const idx = queue.findIndex((t) => t.id === track.id)
          jukebox.playPlaylist(queue, idx >= 0 ? idx : 0)
        }
      }}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title} by ${track.artist_name}`}
      className={cn(
        "group text-left space-y-2 rounded-xl p-2 -m-2 transition-colors hover:bg-white/5",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
      )}
    >
      <div className="relative">
        <TrackCoverImage
          src={track.cover_art_url}
          trackId={track.id}
          className="aspect-square w-full rounded-xl"
          iconClassName="h-8 w-8"
        />
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 transition-opacity",
            isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          {isPlaying ? (
            <Pause className="h-8 w-8 text-white" />
          ) : (
            <Play className="h-8 w-8 text-white ml-1" />
          )}
        </div>
        {badge && <div className="absolute left-2 top-2">{badge}</div>}
      </div>
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-medium", isCurrent ? "text-purple-300" : "text-white")}>
          {track.title}
        </p>
        <p className="truncate text-xs text-slate-500">{subtitle ?? track.artist_name}</p>
      </div>
    </button>
  )
}

// ─── Horizontal card rail ────────────────────────────────────────────────────

function CardRail({ tracks, badgeProvider }: { tracks: JukeboxTrack[]; badgeProvider?: "audius" }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tracks.slice(0, 6).map((t) => (
        <MusicArtworkCard
          key={t.id}
          track={t}
          queue={tracks}
          badge={badgeProvider ? <ProviderBadge provider="audius" /> : undefined}
        />
      ))}
    </div>
  )
}

// ─── Music Home ──────────────────────────────────────────────────────────────

export function MusicHome({
  playlists,
  audiusEnabled,
  onNavigate,
}: {
  playlists: JukeboxPlaylist[]
  audiusEnabled: boolean
  onNavigate: (section: MusicSection) => void
}) {
  const [history, setHistory] = useState<JukeboxTrack[]>([])
  const [historyState, setHistoryState] = useState<LoadState>("loading")
  const [popular, setPopular] = useState<JukeboxTrack[]>([])
  const [popularState, setPopularState] = useState<LoadState>("loading")
  const [following, setFollowing] = useState<JukeboxTrack[]>([])
  const [followingState, setFollowingState] = useState<LoadState>("loading")
  const [audiusPicks, setAudiusPicks] = useState<JukeboxTrack[]>([])
  const [audiusState, setAudiusState] = useState<LoadState>("loading")

  const loadHistory = useCallback(() => {
    setHistoryState("loading")
    fetch("/api/music/history?limit=12", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        const j = await r.json()
        const items: HistoryItem[] = Array.isArray(j.data) ? j.data : []
        setHistory(items.map(historyToTrack))
        setHistoryState("ready")
      })
      .catch(() => setHistoryState("error"))
  }, [])

  const loadPopular = useCallback(() => {
    setPopularState("loading")
    fetchDiscoverTracks({ sortBy: "popular", limit: 12 })
      .then((t) => {
        setPopular(t)
        setPopularState("ready")
      })
      .catch(() => setPopularState("error"))
  }, [])

  const loadFollowing = useCallback(() => {
    setFollowingState("loading")
    fetchFollowingTracks({ limit: 6 })
      .then(({ data }) => {
        setFollowing(data)
        setFollowingState("ready")
      })
      .catch(() => setFollowingState("error"))
  }, [])

  const loadAudius = useCallback(() => {
    if (!audiusEnabled) return
    setAudiusState("loading")
    fetch("/api/music/providers/audius/trending?time=week", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        const j = await r.json()
        const tracks: JukeboxTrack[] = (j.data ?? []).slice(0, 6).map((t: {
          id?: string
          providerTrackId?: string | null
          title: string
          artistName: string
          artworkUrl?: string | null
          durationMs?: number | null
        }): JukeboxTrack => ({
          id: t.id || t.providerTrackId || "",
          title: t.title,
          artist_name: t.artistName,
          cover_art_url: t.artworkUrl ?? undefined,
          file_url: "",
          provider: "audius",
          provider_track_id: t.providerTrackId ?? undefined,
          duration: t.durationMs ? t.durationMs / 1000 : undefined,
        }))
        setAudiusPicks(tracks.filter((t) => t.id))
        setAudiusState("ready")
      })
      .catch(() => setAudiusState("error"))
  }, [audiusEnabled])

  useEffect(() => {
    loadHistory()
    loadPopular()
    loadFollowing()
    loadAudius()
  }, [loadHistory, loadPopular, loadFollowing, loadAudius])

  const hasHistory = historyState === "ready" && history.length > 0
  const hasFollowing = followingState === "ready" && following.length > 0
  const hasPopular = popularState === "ready" && popular.length > 0
  const isNewUser =
    historyState === "ready" && followingState === "ready" && !hasHistory && !hasFollowing

  return (
    <div className="space-y-10">
      {isNewUser && (
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/10 px-6 py-5">
          <h2 className="text-base font-semibold text-white">Start listening</h2>
          <p className="text-sm text-slate-400 mt-1">
            Play tracks you love, save them to your library, and build playlists — everything below
            updates as you listen.
          </p>
        </div>
      )}

      {/* Continue Listening — hidden when no history */}
      {(historyState === "loading" || hasHistory) && (
        <section aria-labelledby="continue-listening">
          <div id="continue-listening">
            <SectionHeading title="Continue Listening" description="Pick up where you left off" />
          </div>
          <div className="mt-3">
            {historyState === "loading" ? (
              <CardGridSkeleton />
            ) : (
              <CardRail tracks={history} />
            )}
          </div>
        </section>
      )}
      {historyState === "error" && (
        <SectionError
          title="Couldn't load your listening history"
          onRetry={loadHistory}
        />
      )}

      {/* Popular on Tourify */}
      <section aria-labelledby="popular-on-tourify">
        <div id="popular-on-tourify">
          <SectionHeading
            title="Popular on Tourify"
            description="Most-played native tracks right now"
            action={
              <button
                type="button"
                onClick={() => onNavigate("discover")}
                className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-0.5"
              >
                See all <ChevronRight className="h-3 w-3" />
              </button>
            }
          />
        </div>
        <div className="mt-3">
          {popularState === "loading" && <TrackListSkeleton rows={5} />}
          {popularState === "error" && (
            <SectionError title="Couldn't load popular tracks" onRetry={loadPopular} />
          )}
          {popularState === "ready" &&
            (hasPopular ? (
              <div className="space-y-0.5">
                {popular.slice(0, 5).map((t, i) => (
                  <TrackCard key={t.id} track={t} playlists={playlists} compact index={i} />
                ))}
              </div>
            ) : (
              <SectionEmpty
                icon="music"
                title="No native tracks yet"
                description="When artists publish music on Tourify, popular tracks will show up here."
              />
            ))}
        </div>
      </section>

      {/* From Artists You Follow — hidden when none */}
      {(followingState === "loading" || hasFollowing) && (
        <section aria-labelledby="from-followed-artists">
          <div id="from-followed-artists">
            <SectionHeading
              title="From Artists You Follow"
              description="Latest music from artists in your network"
            />
          </div>
          <div className="mt-3">
            {followingState === "loading" ? (
              <CardGridSkeleton />
            ) : (
              <CardRail tracks={following} />
            )}
          </div>
        </section>
      )}

      {/* Audius Highlights — isolated failure */}
      {audiusEnabled && (audiusState !== "ready" || audiusPicks.length > 0) && (
        <section aria-labelledby="audius-highlights">
          <div id="audius-highlights">
            <SectionHeading
              title="Audius Highlights"
              description="Trending on our partner catalog"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate("audius")}
                  className="text-xs text-purple-400 hover:text-purple-300 inline-flex items-center gap-0.5"
                >
                  Explore Audius <ChevronRight className="h-3 w-3" />
                </button>
              }
            />
          </div>
          <div className="mt-3">
            {audiusState === "loading" && <CardGridSkeleton />}
            {audiusState === "error" && (
              <SectionError
                title="Audius is temporarily unavailable"
                message="Partner content couldn't load. Tourify music above is unaffected."
                onRetry={loadAudius}
              />
            )}
            {audiusState === "ready" && audiusPicks.length > 0 && (
              <CardRail tracks={audiusPicks} badgeProvider="audius" />
            )}
          </div>
        </section>
      )}
    </div>
  )
}
