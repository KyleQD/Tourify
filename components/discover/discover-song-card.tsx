"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Heart, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
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
        <div className="relative aspect-square overflow-hidden bg-slate-800">
          {track.cover_art_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.cover_art_url}
              alt={track.title}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-950" />
          )}
          <Button
            type="button"
            size="icon"
            className="absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-lg"
            onClick={onPlay}
            aria-label={isPlaying ? "Pause song" : "Play song"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate font-medium text-slate-100">{track.title}</p>
          {artistHref ? (
            <Link
              href={artistHref}
              className="block truncate text-xs text-slate-400 hover:text-slate-200"
              onClick={(event) => event.stopPropagation()}
            >
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
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
