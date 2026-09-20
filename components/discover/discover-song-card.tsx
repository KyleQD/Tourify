"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, Pause, Play, Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import { MusicShareDialog } from "@/components/music/music-share-dialog"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { getMusicTrackPath } from "@/lib/music/routes"
import type { DiscoverMusicTrack } from "@/lib/discover/types"

export function DiscoverSongCard({
  track,
  isPlaying,
  onPlay,
}: {
  track: DiscoverMusicTrack
  isPlaying: boolean
  onPlay: () => void
}) {
  const [showShare, setShowShare] = useState(false)
  const shareToPost = async (selected: { id: string; title: string }, note?: string) => {
    const response = await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicId: selected.id, createPost: true, content: note?.trim() || `Check out “${selected.title}”` }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error?.message || body?.error || "Failed to share track")
    toast.success("Shared to your feed")
  }

  const trackHref = getMusicTrackPath(track.id) || "/music"

  const artistHref = track.artist_username
    ? getArtistPublicProfilePath(track.artist_username)
    : track.artist_id
      ? getArtistPublicProfilePath(track.artist_id)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-[220px] flex-shrink-0"
    >
        <SurfaceCard className="overflow-hidden border-white/10 bg-slate-900/50">
          <div className="relative">
            <Link href={trackHref} className="block" aria-label={`Open ${track.title}`}>
              <div className="aspect-square overflow-hidden bg-slate-800">
                {track.cover_art_url ? (
                  <TrackCoverImage
                    trackId={track.id}
                    src={track.cover_art_url}
                    alt={track.title}
                    className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-950" />
                )}
              </div>
              <p className="truncate p-3 pb-0 font-medium text-slate-100">{track.title}</p>
            </Link>
            <Button
              type="button"
              size="icon"
              className="absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-lg"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onPlay()
              }}
              aria-label={isPlaying ? "Pause song" : "Play song"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        <div className="space-y-1 p-3 pt-1">
          {artistHref ? (
            <Link href={artistHref} className="block truncate text-xs text-slate-400 hover:text-slate-200">
              {track.artist_name}
            </Link>
          ) : (
            <p className="truncate text-xs text-slate-400">{track.artist_name}</p>
          )}
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
            <span>{Number(track.plays || 0).toLocaleString()} plays</span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {Number(track.likes || 0).toLocaleString()}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-slate-400 hover:text-white"
            onClick={(event) => {
              event.stopPropagation()
              setShowShare(true)
            }}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </SurfaceCard>
      <MusicShareDialog open={showShare} onOpenChange={setShowShare} track={{ id: track.id, title: track.title }} onSharePost={shareToPost} />
    </motion.div>
  )
}
