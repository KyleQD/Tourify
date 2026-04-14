"use client"

import { useMemo, useState } from "react"
import type { PublicArtistTrackDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Pin, ListPlus, Shuffle, Music } from "lucide-react"
import Link from "next/link"
import { paBtnRound, paCard, paInset, paRow } from "@/components/public-artist/public-artist-ui"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { toast } from "sonner"

function dtoToJukeboxTrack(
  track: PublicArtistTrackDTO,
  artistName?: string
): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: artistName || "Artist",
    duration: track.durationSeconds ?? undefined,
    file_url: track.audioUrl || "",
    cover_art_url: track.artworkUrl ?? undefined,
    genre: track.genre ?? undefined,
    is_public: true,
  }
}

export function PublicArtistMusicSection({
  viewer,
  creatorType,
  featuredTrack,
  tracks,
  defaultTrackId,
  artistName,
}: {
  viewer: PublicArtistViewerDTO
  creatorType: string | null
  featuredTrack: PublicArtistTrackDTO | null
  tracks: PublicArtistTrackDTO[]
  defaultTrackId: string | null
  artistName?: string
}) {
  const playableTracks = useMemo(() => tracks.filter(t => Boolean(t.audioUrl)), [tracks])
  const jukebox = useJukeboxOptional()
  const [optimisticPinnedById, setOptimisticPinnedById] = useState<Record<string, boolean>>({})

  const showUploadEmptyState = viewer.isOwner && tracks.length === 0

  const isTrackPlaying = (trackId: string) =>
    jukebox?.state.currentTrack?.id === trackId && jukebox?.state.isPlaying

  const handlePlay = (track: PublicArtistTrackDTO) => {
    if (!jukebox || !track.audioUrl) return
    const jTrack = dtoToJukeboxTrack(track, artistName)
    if (isTrackPlaying(track.id)) {
      jukebox.pause()
    } else {
      jukebox.play(jTrack)
    }
  }

  const handlePlayAll = () => {
    if (!jukebox || playableTracks.length === 0) return
    const jTracks = playableTracks.map(t => dtoToJukeboxTrack(t, artistName))
    jukebox.playPlaylist(jTracks)
    toast.success(`Playing ${jTracks.length} tracks`)
  }

  const handleShuffleAll = () => {
    if (!jukebox || playableTracks.length === 0) return
    const jTracks = playableTracks.map(t => dtoToJukeboxTrack(t, artistName))
    const shuffled = [...jTracks].sort(() => Math.random() - 0.5)
    jukebox.playPlaylist(shuffled)
    toast.success(`Shuffling ${shuffled.length} tracks`)
  }

  const handleAddAllToQueue = () => {
    if (!jukebox || playableTracks.length === 0) return
    playableTracks.forEach(t => {
      jukebox.addToQueue(dtoToJukeboxTrack(t, artistName))
    })
    toast.success(`Added ${playableTracks.length} tracks to queue`)
  }

  const togglePin = async (track: PublicArtistTrackDTO) => {
    if (!viewer.isOwner) return

    const nextPinned = !(optimisticPinnedById[track.id] ?? track.isPinned)
    setOptimisticPinnedById(prev => ({ ...prev, [track.id]: nextPinned }))

    try {
      const res = await fetch("/api/artist/music/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId: track.id, isPinned: nextPinned })
      })

      if (!res.ok) setOptimisticPinnedById(prev => ({ ...prev, [track.id]: track.isPinned }))
    } catch {
      setOptimisticPinnedById(prev => ({ ...prev, [track.id]: track.isPinned }))
    }
  }

  return (
    <Card className={paCard}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <Music className="h-4 w-4 opacity-80" />
            Featured Work
          </CardTitle>
          {playableTracks.length > 0 && jukebox && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className={`${paBtnRound} bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-4 hover:from-purple-700 hover:to-pink-700`}
                onClick={handlePlayAll}
              >
                <Play className="mr-1 h-3 w-3" />
                Play All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`${paBtnRound} text-white/60 hover:text-white text-xs`}
                onClick={handleShuffleAll}
              >
                <Shuffle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`${paBtnRound} text-white/60 hover:text-white text-xs`}
                onClick={handleAddAllToQueue}
              >
                <ListPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tracks.length === 0 ? (
          <div className={`${paInset} flex flex-col gap-3 p-5`}>
            <div className="text-sm text-white/70">
              {showUploadEmptyState
                ? `Upload your first ${creatorType?.toLowerCase() === "musician" ? "track" : "audio sample"} to start building your public showcase.`
                : "No featured work yet."}
            </div>
            {showUploadEmptyState ? (
              <Button asChild className={`${paBtnRound} w-fit px-5`}>
                <Link href="/artist/music">Upload first sample</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {featuredTrack ? (
              <div className={`${paInset} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="flex items-center gap-3 min-w-0">
                  {featuredTrack.artworkUrl ? (
                    <img
                      src={featuredTrack.artworkUrl}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
                      <Music className="h-6 w-6 text-white/60" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-semibold text-white">{featuredTrack.title}</div>
                      {featuredTrack.isPinned ? (
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide">
                          Pinned
                        </Badge>
                      ) : null}
                      {featuredTrack.isFeatured ? (
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide bg-purple-500/20 text-purple-300">
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {featuredTrack.genre || "Track"} · {featuredTrack.playCount.toLocaleString()} plays
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={!featuredTrack.audioUrl}
                    onClick={() => handlePlay(featuredTrack)}
                    className={`${paBtnRound} px-5`}
                  >
                    {isTrackPlaying(featuredTrack.id) ? (
                      <><Pause className="mr-2 h-4 w-4" /> Pause</>
                    ) : (
                      <><Play className="mr-2 h-4 w-4" /> Play</>
                    )}
                  </Button>
                  {jukebox && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-white/60 hover:text-white"
                      onClick={() => {
                        if (!featuredTrack.audioUrl) return
                        jukebox.addToQueue(dtoToJukeboxTrack(featuredTrack, artistName))
                        toast.success("Added to queue")
                      }}
                    >
                      <ListPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2.5">
              {tracks.map(t => {
                const playing = isTrackPlaying(t.id)
                const isPinned = optimisticPinnedById[t.id] ?? t.isPinned
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={[
                      paRow,
                      "w-full px-3.5 py-3.5 text-left flex items-center",
                      playing ? "ring-2 ring-purple-500/50 border-purple-500/35" : ""
                    ].join(" ")}
                    onClick={() => handlePlay(t)}
                  >
                    {t.artworkUrl ? (
                      <img
                        src={t.artworkUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover flex-shrink-0 mr-3"
                      />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 mr-3">
                        <Music className="h-4 w-4 text-white/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm truncate flex items-center gap-2">
                        {t.title}
                        {isPinned ? <Pin className="h-3.5 w-3.5 text-purple-300" /> : null}
                      </div>
                      <div className="text-white/55 text-xs mt-1">
                        {t.genre || "Track"} · {t.playCount.toLocaleString()} plays
                        {t.durationSeconds ? ` · ${Math.floor(t.durationSeconds / 60)}:${String(t.durationSeconds % 60).padStart(2, '0')}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewer.isOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            togglePin(t)
                          }}
                        >
                          <Pin className={["h-4 w-4", isPinned ? "text-purple-300" : "text-white/60"].join(" ")} />
                        </Button>
                      ) : null}
                      {jukebox && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-white/50 hover:text-white"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!t.audioUrl) return
                            jukebox.addToQueue(dtoToJukeboxTrack(t, artistName))
                            toast.success("Added to queue")
                          }}
                        >
                          <ListPlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled={!t.audioUrl} className="rounded-full">
                        {playing ? (
                          <Pause className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
