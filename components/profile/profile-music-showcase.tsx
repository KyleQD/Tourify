"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  Music,
  ListPlus,
  Shuffle,
  ListMusic,
  Heart,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { toast } from "sonner"

interface ProfileTrack {
  id: string
  title: string
  genre: string | null
  duration: number | null
  file_url: string | null
  cover_art_url: string | null
  user_id: string
}

interface ProfilePlaylist {
  id: string
  title: string
  visibility: string
  music_playlist_items?: Array<{
    id: string
    music_track_id: string
    artist_music?: {
      id: string
      title: string
      genre?: string | null
      duration?: number | null
      cover_art_url?: string | null
      file_url?: string | null
      user_id?: string
    } | null
  }>
}

interface ProfileMusicShowcaseProps {
  userId: string
  displayName: string
  accountType?: string
  className?: string
}

function toJukeboxTrack(track: ProfileTrack, artistName: string): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: artistName,
    artist_id: track.user_id,
    duration: track.duration ?? undefined,
    file_url: track.file_url || "",
    cover_art_url: track.cover_art_url ?? undefined,
    genre: track.genre ?? undefined,
  }
}

export function ProfileMusicShowcase({
  userId,
  displayName,
  accountType,
  className,
}: ProfileMusicShowcaseProps) {
  const jukebox = useJukeboxOptional()
  const [tracks, setTracks] = useState<ProfileTrack[]>([])
  const [playlists, setPlaylists] = useState<ProfilePlaylist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<"tracks" | "playlists">("tracks")

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [tracksRes, playlistsRes] = await Promise.all([
          fetch(`/api/feed/music?userId=${userId}&limit=12`, { cache: "no-store" }),
          fetch(`/api/music/playlists?ownerUserId=${userId}&includeItems=true`, {
            cache: "no-store",
          }),
        ])

        if (tracksRes.ok) {
          const json = await tracksRes.json()
          const feedContent = json.content || []
          setTracks(
            feedContent
              .filter((item: any) => item.metadata?.url)
              .map((item: any) => ({
                id: item.id,
                title: item.title,
                genre: item.metadata?.genre || null,
                duration: item.metadata?.duration || null,
                file_url: item.metadata?.url || null,
                cover_art_url: item.cover_image || null,
                user_id: item.author?.id || userId,
              }))
          )
        }
        if (playlistsRes.ok) {
          const json = await playlistsRes.json()
          const allPlaylists: ProfilePlaylist[] = Array.isArray(json.data)
            ? json.data
            : []
          setPlaylists(allPlaylists.filter((p) => p.visibility === "public"))
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId])

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return ""
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const isTrackPlaying = (trackId: string) =>
    jukebox?.state.currentTrack?.id === trackId && jukebox?.state.isPlaying

  const handlePlay = useCallback(
    (track: ProfileTrack) => {
      if (!jukebox || !track.file_url) return
      if (isTrackPlaying(track.id)) {
        jukebox.pause()
      } else {
        jukebox.play(toJukeboxTrack(track, displayName))
      }
    },
    [jukebox, displayName]
  )

  const handlePlayAll = useCallback(() => {
    if (!jukebox) return
    const playable = tracks.filter((t) => t.file_url)
    if (playable.length === 0) return
    jukebox.playPlaylist(playable.map((t) => toJukeboxTrack(t, displayName)))
    toast.success(`Playing ${playable.length} tracks`)
  }, [jukebox, tracks, displayName])

  const handlePlayPlaylist = useCallback(
    (playlist: ProfilePlaylist) => {
      if (!jukebox || !playlist.music_playlist_items?.length) return
      const playable = playlist.music_playlist_items
        .filter((item) => item.artist_music?.file_url)
        .map((item) => ({
          id: item.artist_music!.id,
          title: item.artist_music!.title,
          artist_name: displayName,
          artist_id: item.artist_music!.user_id,
          duration: item.artist_music!.duration ?? undefined,
          file_url: item.artist_music!.file_url!,
          cover_art_url: item.artist_music!.cover_art_url ?? undefined,
          genre: item.artist_music!.genre ?? undefined,
        }))
      if (playable.length === 0) {
        toast.error("No playable tracks in this playlist")
        return
      }
      jukebox.playPlaylist(playable)
      toast.success(`Playing: ${playlist.title}`)
    },
    [jukebox, displayName]
  )

  const hasContent = tracks.length > 0 || playlists.length > 0
  if (!isLoading && !hasContent) return null

  return (
    <Card
      className={cn(
        "bg-white/10 backdrop-blur border-0 rounded-3xl",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-400" />
            Music
          </CardTitle>
          <div className="flex items-center gap-1">
            {tracks.length > 0 && (
              <Button
                variant={activeView === "tracks" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs rounded-full",
                  activeView === "tracks"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/50"
                )}
                onClick={() => setActiveView("tracks")}
              >
                Tracks
              </Button>
            )}
            {playlists.length > 0 && (
              <Button
                variant={activeView === "playlists" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs rounded-full",
                  activeView === "playlists"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-white/50"
                )}
                onClick={() => setActiveView("playlists")}
              >
                Playlists
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : activeView === "tracks" ? (
          <div className="space-y-3">
            {/* Play all bar */}
            {tracks.filter((t) => t.file_url).length > 0 && jukebox && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-4 hover:from-purple-700 hover:to-pink-700"
                  onClick={handlePlayAll}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Play All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-white/50 hover:text-white text-xs"
                  onClick={() => {
                    const playable = tracks.filter((t) => t.file_url)
                    playable.forEach((t) =>
                      jukebox.addToQueue(toJukeboxTrack(t, displayName))
                    )
                    toast.success(`Added ${playable.length} to queue`)
                  }}
                >
                  <ListPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Track list */}
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1">
                {tracks.map((track, idx) => {
                  const playing = isTrackPlaying(track.id)
                  return (
                    <button
                      key={track.id}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/5",
                        playing && "bg-purple-500/10 ring-1 ring-purple-500/20"
                      )}
                      onClick={() => handlePlay(track)}
                    >
                      {track.cover_art_url ? (
                        <img
                          src={track.cover_art_url}
                          alt=""
                          className="h-11 w-11 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30">
                          <Music className="h-4 w-4 text-white/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            playing ? "text-purple-300" : "text-white"
                          )}
                        >
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-white/50">
                          {track.genre || "Track"}
                          {track.duration
                            ? ` · ${formatDuration(track.duration)}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex items-center">
                        {playing ? (
                          <Pause className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Play className="h-4 w-4 text-white/40 group-hover:text-white" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30">
                    <ListMusic className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-white text-sm">
                      {playlist.title}
                    </p>
                    <p className="text-xs text-white/50">
                      {playlist.music_playlist_items?.length || 0} tracks
                    </p>
                  </div>
                  {jukebox &&
                    playlist.music_playlist_items &&
                    playlist.music_playlist_items.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handlePlayPlaylist(playlist)}
                      >
                        <Play className="h-4 w-4 text-purple-400" />
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
