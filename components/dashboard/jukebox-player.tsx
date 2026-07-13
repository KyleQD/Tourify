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
  ListMusic,
  Compass,
  Library,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { fetchFavoriteTracks } from "@/lib/services/jukebox.service"
import { TrackCoverImage } from "@/components/jukebox/track-cover-image"
import type { JukeboxTrack } from "@/contexts/jukebox-context"

interface JukeboxPlayerProps {
  className?: string
}

export function JukeboxPlayer({ className }: JukeboxPlayerProps) {
  const ctx = useJukeboxOptional()
  const [recentlyLiked, setRecentlyLiked] = useState<JukeboxTrack[]>([])

  useEffect(() => {
    fetchFavoriteTracks({ limit: 5 }).then((result) =>
      setRecentlyLiked(result.data)
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
              <div className="flex items-center gap-3">
                <TrackCoverImage
                  src={track.cover_art_url}
                  trackId={track.id}
                  className="h-14 w-14 rounded-lg"
                  iconClassName="h-6 w-6"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-white">{track.title}</p>
                  <p className="truncate text-sm text-slate-400">
                    {track.artist_name}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                  <span>{formatTime(ctx?.state.currentTime || 0)}</span>
                  <span>{formatTime(ctx?.state.duration || 0)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9"
                  onClick={() => ctx?.prev()}
                >
                  <SkipBack className="h-4 w-4 text-white" />
                </Button>
                <Button
                  onClick={() => ctx?.togglePlayPause()}
                  className="h-11 w-11 rounded-full bg-white text-black hover:bg-white/90"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9"
                  onClick={() => ctx?.next()}
                >
                  <SkipForward className="h-4 w-4 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <Music className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400">Nothing playing</p>
              <p className="text-xs text-slate-500 mt-1">
                Open the player to browse music
              </p>
            </div>
          )}

          {recentlyLiked.length > 0 && !track && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Recently Liked
              </p>
              {recentlyLiked.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                  onClick={() => ctx?.play(t)}
                >
                  <TrackCoverImage
                    src={t.cover_art_url}
                    trackId={t.id}
                    className="h-8 w-8 rounded"
                    iconClassName="h-3.5 w-3.5"
                  />
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

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true, "favorites")}
            >
              <Heart className="h-4 w-4" />
              <span className="text-xs">Liked</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true, "discover")}
            >
              <Compass className="h-4 w-4" />
              <span className="text-xs">Discover</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true, "playlists")}
            >
              <ListMusic className="h-4 w-4" />
              <span className="text-xs">Playlists</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 py-2 text-slate-400 hover:text-white"
              onClick={() => ctx?.setExpanded(true, "library")}
            >
              <Library className="h-4 w-4" />
              <span className="text-xs">Library</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
