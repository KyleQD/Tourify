"use client"

import { useMemo, useState } from "react"
import type { PublicArtistTrackDTO, PublicArtistViewerDTO } from "@/lib/public-artist/public-artist-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pin } from "lucide-react"
import { PublicArtistPersistentPlayer } from "./public-artist-persistent-player"
import Link from "next/link"
import { paBtnRound, paCard, paInset, paRow } from "@/components/public-artist/public-artist-ui"

export function PublicArtistMusicSection({
  viewer,
  featuredTrack,
  tracks,
  defaultTrackId
}: {
  viewer: PublicArtistViewerDTO
  featuredTrack: PublicArtistTrackDTO | null
  tracks: PublicArtistTrackDTO[]
  defaultTrackId: string | null
}) {
  const playableTracks = useMemo(() => tracks.filter(t => Boolean(t.audioUrl)), [tracks])
  const initialTrack =
    playableTracks.find(t => t.id === defaultTrackId) ??
    playableTracks[0] ??
    null

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(initialTrack?.id ?? null)
  const selectedTrack = playableTracks.find(t => t.id === selectedTrackId) ?? null
  const [optimisticPinnedById, setOptimisticPinnedById] = useState<Record<string, boolean>>({})

  const showUploadEmptyState = viewer.isOwner && tracks.length === 0

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
    <>
      <Card className={paCard}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-white">Featured Music</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {tracks.length === 0 ? (
            <div className={`${paInset} flex flex-col gap-3 p-5`}>
              <div className="text-sm text-white/70">
                {showUploadEmptyState
                  ? "Upload your first track to start building your public music profile."
                  : "No tracks yet."}
              </div>
              {showUploadEmptyState ? (
                <Button asChild className={`${paBtnRound} w-fit px-5`}>
                  <Link href="/artist/music">Upload your first track</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {featuredTrack ? (
                <div className={`${paInset} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-semibold text-white">{featuredTrack.title}</div>
                      {featuredTrack.isPinned ? (
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide">
                          Pinned
                        </Badge>
                      ) : null}
                      {featuredTrack.isFeatured ? (
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide">
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {featuredTrack.genre || "Track"} • {featuredTrack.playCount.toLocaleString()} plays
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={!featuredTrack.audioUrl}
                      onClick={() => setSelectedTrackId(featuredTrack.id)}
                      className={`${paBtnRound} px-5`}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2.5">
                {tracks.map(t => {
                  const isSelected = selectedTrackId === t.id
                  const isPinned = optimisticPinnedById[t.id] ?? t.isPinned
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={[
                        paRow,
                        "w-full px-3.5 py-3.5 text-left",
                        isSelected ? "ring-2 ring-purple-500/50 border-purple-500/35" : ""
                      ].join(" ")}
                      onClick={() => setSelectedTrackId(t.id)}
                    >
                      <div className="min-w-0">
                        <div className="text-white text-sm truncate flex items-center gap-2">
                          {t.title}
                          {isPinned ? <Pin className="h-3.5 w-3.5 text-purple-300" /> : null}
                        </div>
                        <div className="text-white/55 text-xs mt-1">
                          {t.genre || "Track"} • {t.playCount.toLocaleString()} plays
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
                        <Button variant="ghost" size="sm" disabled={!t.audioUrl} className="rounded-full">
                          <Play className="h-4 w-4" />
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

      <PublicArtistPersistentPlayer track={selectedTrack} />
    </>
  )
}

