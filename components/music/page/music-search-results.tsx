"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { TrackCard } from "@/components/jukebox/track-card"
import { ProviderBadge } from "@/components/music/provider-badge"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { searchNativeTracks, type JukeboxPlaylist } from "@/lib/services/jukebox.service"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import type { NormalizedTrack } from "@/lib/music/providers/contracts"
import { SectionEmpty, SectionError, SectionHeading, TrackListSkeleton } from "./section-states"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

type GroupState = "loading" | "ready" | "error"

/**
 * Page-level grouped search: native Tourify tracks + Audius tracks.
 * Groups fail independently; stale requests are aborted.
 */
export function MusicSearchResults({
  query,
  playlists,
  audiusEnabled,
}: {
  query: string
  playlists: JukeboxPlaylist[]
  audiusEnabled: boolean
}) {
  const jukebox = useJukeboxOptional()
  const [native, setNative] = useState<JukeboxTrack[]>([])
  const [nativeState, setNativeState] = useState<GroupState>("loading")
  const [audius, setAudius] = useState<NormalizedTrack[]>([])
  const [audiusState, setAudiusState] = useState<GroupState>("loading")
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setNativeState("loading")
    searchNativeTracks({ query })
      .then((tracks) => {
        if (ctrl.signal.aborted) return
        setNative(tracks)
        setNativeState("ready")
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setNativeState("error")
      })

    if (audiusEnabled) {
      setAudiusState("loading")
      fetch(`/api/music/providers/audius/search?q=${encodeURIComponent(query)}&limit=8`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then(async (r) => {
          const j = await r.json()
          if (ctrl.signal.aborted) return
          if (r.ok) {
            setAudius(j.data ?? [])
            setAudiusState("ready")
          } else setAudiusState("error")
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setAudiusState("error")
        })
    } else {
      setAudius([])
      setAudiusState("ready")
    }

    return () => ctrl.abort()
  }, [query, audiusEnabled])

  const noResults =
    nativeState === "ready" &&
    audiusState === "ready" &&
    native.length === 0 &&
    audius.length === 0

  function playAudiusTrack(track: NormalizedTrack) {
    if (!jukebox || !track.providerTrackId) return
    const isCurrent =
      jukebox.state.currentTrack?.provider_track_id === track.providerTrackId
    if (isCurrent && jukebox.state.isPlaying) jukebox.pause()
    else
      jukebox.play({
        id: track.id || track.providerTrackId,
        title: track.title,
        artist_name: track.artistName,
        cover_art_url: track.artworkUrl ?? undefined,
        file_url: "",
        provider: "audius",
        provider_track_id: track.providerTrackId,
        duration: track.durationMs ? track.durationMs / 1000 : undefined,
      })
  }

  return (
    <div className="space-y-8" aria-live="polite">
      {noResults ? (
        <SectionEmpty
          icon="search"
          title={`No results for "${query}"`}
          description="Try different keywords, or browse Discover and Audius."
        />
      ) : (
        <>
          {/* Native tracks */}
          <section aria-labelledby="search-native">
            <div id="search-native">
              <SectionHeading title="On Tourify" />
            </div>
            <div className="mt-3">
              {nativeState === "loading" && <TrackListSkeleton rows={4} />}
              {nativeState === "error" && (
                <SectionError title="Couldn't search Tourify music" />
              )}
              {nativeState === "ready" && native.length === 0 && (
                <p className="text-sm text-slate-500 px-1 py-3">
                  No Tourify tracks match &ldquo;{query}&rdquo;.
                </p>
              )}
              {nativeState === "ready" && native.length > 0 && (
                <div className="space-y-0.5">
                  {native.map((t, i) => (
                    <TrackCard key={t.id} track={t} playlists={playlists} compact index={i} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Audius tracks */}
          {audiusEnabled && (
            <section aria-labelledby="search-audius">
              <div id="search-audius" className="flex items-center gap-2">
                <SectionHeading title="On Audius" />
                <ProviderBadge provider="audius" />
              </div>
              <div className="mt-3">
                {audiusState === "loading" && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching Audius…
                  </div>
                )}
                {audiusState === "error" && (
                  <SectionError
                    title="Audius search is unavailable"
                    message="Tourify results above are unaffected."
                  />
                )}
                {audiusState === "ready" && audius.length === 0 && (
                  <p className="text-sm text-slate-500 px-1 py-3">
                    No Audius tracks match &ldquo;{query}&rdquo;.
                  </p>
                )}
                {audiusState === "ready" && audius.length > 0 && (
                  <div className="space-y-1">
                    {audius.map((track) => {
                      const pid = track.providerTrackId ?? track.id
                      const isCurrent =
                        jukebox?.state.currentTrack?.provider_track_id === pid
                      const isPlaying = isCurrent && jukebox?.state.isPlaying
                      return (
                        <div
                          key={pid}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                            isCurrent
                              ? "bg-purple-500/10 border border-purple-500/25"
                              : "hover:bg-white/5 border border-transparent"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => playAudiusTrack(track)}
                            className="relative shrink-0"
                            aria-label={
                              isPlaying ? `Pause ${track.title}` : `Play ${track.title}`
                            }
                          >
                            <TrackCoverImage
                              src={track.artworkUrl}
                              className="h-10 w-10 rounded-lg"
                              iconClassName="h-4 w-4"
                            />
                            <div
                              className={cn(
                                "absolute inset-0 flex items-center justify-center rounded-lg bg-black/55 transition-opacity",
                                isPlaying
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                              )}
                            >
                              {isPlaying ? (
                                <Pause className="h-4 w-4 text-white" />
                              ) : (
                                <Play className="h-4 w-4 text-white ml-0.5" />
                              )}
                            </div>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "truncate text-sm font-medium",
                                isCurrent ? "text-purple-300" : "text-white"
                              )}
                            >
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {track.artistName}
                            </p>
                          </div>
                          <Search className="h-3.5 w-3.5 text-slate-600 shrink-0 hidden sm:block" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
