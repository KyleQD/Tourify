"use client"

import { motion } from "framer-motion"
import { Pause, Play } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import type { DiscoverProfile } from "@/lib/discover/types"

export function DiscoverArtistCard({
  artist,
  isPlaying,
  onOpen,
  onPlayTopTrack,
}: {
  artist: DiscoverProfile
  isPlaying: boolean
  onOpen: () => void
  onPlayTopTrack: () => void
}) {
  const genre = artist.genres?.[0]
  const topTrack = artist.top_track

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-[240px] flex-shrink-0"
    >
      <SurfaceCard
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onOpen()
          }
        }}
        className="h-full cursor-pointer overflow-hidden border-white/10 bg-slate-900/50 transition hover:border-white/25"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-white/10">
              <AvatarImage src={artist.avatar_url || ""} alt={artist.display_name} />
              <AvatarFallback>{artist.display_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-100">{artist.display_name}</p>
              <p className="truncate text-xs text-slate-400">@{artist.username}</p>
              {genre ? (
                <Badge
                  variant="outline"
                  className="mt-1 border-white/15 bg-white/5 text-[10px] font-normal text-slate-300"
                >
                  {genre}
                </Badge>
              ) : null}
            </div>
          </div>

          {topTrack ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Top song</p>
                <p className="truncate text-sm text-slate-200">{topTrack.title}</p>
              </div>
              {topTrack.file_url ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 flex-shrink-0 rounded-full"
                  onClick={(event) => {
                    event.stopPropagation()
                    onPlayTopTrack()
                  }}
                  aria-label={isPlaying ? "Pause top song" : "Play top song"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
