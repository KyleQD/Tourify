"use client"

import { motion } from "framer-motion"
import { Disc3, Pause, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SurfaceCard } from "@/components/surface/surface-primitives"
import type { DiscoverAlbum } from "@/lib/discover/types"

export function DiscoverAlbumCard({
  album,
  isPlaying,
  onOpen,
  onPlay,
}: {
  album: DiscoverAlbum
  isPlaying: boolean
  onOpen: () => void
  onPlay: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
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
        <div className="relative aspect-square overflow-hidden bg-slate-800">
          {album.cover_art_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.cover_art_url}
              alt={album.title}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-950">
              <Disc3 className="h-10 w-10 text-slate-400" />
            </div>
          )}
          {album.file_url ? (
            <Button
              type="button"
              size="icon"
              className="absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-lg"
              onClick={(event) => {
                event.stopPropagation()
                onPlay()
              }}
              aria-label={isPlaying ? "Pause album" : "Play album"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
        <div className="space-y-2 p-3">
          <Badge
            variant="outline"
            className="border-white/15 bg-white/5 text-[10px] font-normal text-slate-300"
          >
            {album.genre}
          </Badge>
          <p className="line-clamp-2 font-medium text-slate-100">{album.title}</p>
          <p className="truncate text-xs text-slate-400">{album.artist_name}</p>
        </div>
      </SurfaceCard>
    </motion.div>
  )
}
