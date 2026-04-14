"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Disc3,
  ChevronRight,
  ListMusic,
  Compass,
  Library,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { fetchDiscoverTracks } from "@/lib/services/jukebox.service"
import type { JukeboxTrack } from "@/contexts/jukebox-context"

interface JukeboxPlayerProps {
  className?: string
}

export function JukeboxPlayer({ className }: JukeboxPlayerProps) {
  const ctx = useJukeboxOptional()
  const [suggestedTracks, setSuggestedTracks] = useState<JukeboxTrack[]>([])

  useEffect(() => {
    fetchDiscoverTracks({ sortBy: "trending", limit: 5 }).then(
      setSuggestedTracks
    )
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const track = ctx?.state.currentTrack
  const isPlaying = ctx?.state.isPlaying ?? false
  const progress =
    ctx?.state.duration && ctx.state.duration > 0
      ? (ctx.state.currentTime / ctx.state.duration) * 100
      : 0

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Disc3
              className={cn(
                "h-5 w-5 text-purple-400",
                isPlaying && "animate-spin"
              )}
            />
            Jukebox
            {isPlaying && (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">
                PLAYING
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {track ? (
            <>
              {/* Currently playing */}
              <div className="flex items-center gap-3">
                {track.cover_art_url ? (
                  <img
                    src={track.cover_art_url}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                    <Music className="h-6 w-6 text-white/60" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {track.artist_name}
                  </p>
                  {track.genre && (
                    <Badge className="mt-1 bg-purple-500/15 text-purple-300 border-purple-500/20 text-[10px] px-1.5 py-0">
                      {track.genre}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="relative h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {formatTime(ctx?.state.currentTime ?? 0)} /{" "}
                  {formatTime(ctx?.state.duration ?? 0)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => ctx?.prev()}
                  >
                    <SkipBack className="h-3.5 w-3.5 text-white" />
                  </Button>
                  <Button
                    onClick={() => ctx?.togglePlayPause()}
                    className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90"
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5 ml-0.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => ctx?.next()}
                  >
                    <SkipForward className="h-3.5 w-3.5 text-white" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-white/5 mb-3">
                <Music className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400">Nothing playing</p>
              <p className="text-xs text-slate-500 mt-1">
                Open the player to browse music
              </p>
            </div>
          )}

          {/* Quick suggested tracks */}
          {suggestedTracks.length > 0 && !track && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Trending
              </p>
              {suggestedTracks.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                  onClick={() => ctx?.play(t)}
                >
                  {t.cover_art_url ? (
                    <img
                      src={t.cover_art_url}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600/30">
                      <Music className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-white">
                      {t.title}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {t.artist_name}
                    </p>
                  </div>
                  <Play className="h-3 w-3 text-slate-500" />
                </button>
              ))}
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true)}
            >
              <Compass className="h-4 w-4" />
              <span className="text-[10px]">Discover</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true)}
            >
              <ListMusic className="h-4 w-4" />
              <span className="text-[10px]">Playlists</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true)}
            >
              <Library className="h-4 w-4" />
              <span className="text-[10px]">Library</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
