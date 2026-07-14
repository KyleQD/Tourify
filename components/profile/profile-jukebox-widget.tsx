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
  Heart,
  ListMusic,
  Disc3,
  Loader2,
  Headphones,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import {
  fetchUserFavoritesForProfile,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import { toast } from "sonner"

interface ProfileJukeboxWidgetProps {
  userId: string
  displayName: string
  className?: string
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

export function ProfileJukeboxWidget({
  userId,
  displayName,
  className,
}: ProfileJukeboxWidgetProps) {
  const jukebox = useJukeboxOptional()
  const [featuredTrack, setFeaturedTrack] = useState<JukeboxTrack | null>(null)
  const [favorites, setFavorites] = useState<JukeboxTrack[]>([])
  const [playlists, setPlaylists] = useState<ProfilePlaylist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<"favorites" | "playlists">(
    "favorites"
  )

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [featuredRes, favsRes, playlistsRes] = await Promise.all([
          fetch(`/api/music/profile-featured-track?userId=${userId}`, {
            cache: "no-store",
          }).then(async (r) => {
            if (!r.ok) return null
            const json = await r.json()
            const track = json.data?.artist_music
            if (!track?.id) return null
            return {
              id: track.id,
              title: track.title,
              artist_name: displayName,
              artist_id: track.user_id,
              duration: track.duration ?? undefined,
              file_url: `/api/music/stream?trackId=${track.id}`,
              cover_art_url: track.cover_art_url ?? undefined,
              genre: track.genre ?? undefined,
            } satisfies JukeboxTrack
          }),
          fetchUserFavoritesForProfile(userId, 8),
          fetch(
            `/api/music/playlists?ownerUserId=${userId}&includeItems=true`,
            { cache: "no-store" }
          ).then(async (r) => {
            if (!r.ok) return []
            const json = await r.json()
            const all: ProfilePlaylist[] = Array.isArray(json.data)
              ? json.data
              : []
            return all.filter((p) => p.visibility === "public")
          }),
        ])
        setFeaturedTrack(featuredRes)
        setFavorites(favsRes)
        setPlaylists(playlistsRes)
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [userId, displayName])

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ""
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const isTrackPlaying = (trackId: string) =>
    jukebox?.state.currentTrack?.id === trackId && jukebox?.state.isPlaying

  const handlePlay = useCallback(
    (track: JukeboxTrack) => {
      if (!jukebox) return
      if (isTrackPlaying(track.id)) jukebox.pause()
      else jukebox.play(track)
    },
    [jukebox]
  )

  const handlePlayFavorites = useCallback(() => {
    if (!jukebox || favorites.length === 0) return
    jukebox.playPlaylist(favorites)
    toast.success(`Playing ${displayName}'s favorites`)
  }, [jukebox, favorites, displayName])

  const handlePlayPlaylist = useCallback(
    (playlist: ProfilePlaylist) => {
      if (!jukebox || !playlist.music_playlist_items?.length) return
      const tracks = playlist.music_playlist_items
        .filter((item) => item.artist_music?.id || item.music_track_id)
        .map((item) => {
          const trackId = item.artist_music?.id || item.music_track_id
          return {
            id: trackId,
            title: item.artist_music?.title || "Untitled",
            artist_name: displayName,
            artist_id: item.artist_music?.user_id,
            duration: item.artist_music?.duration ?? undefined,
            file_url: item.artist_music?.file_url || `/api/music/stream?trackId=${trackId}`,
            cover_art_url: item.artist_music?.cover_art_url ?? undefined,
            genre: item.artist_music?.genre ?? undefined,
          }
        })
      if (tracks.length === 0) return
      jukebox.playPlaylist(tracks)
      toast.success(`Playing: ${playlist.title}`)
    },
    [jukebox, displayName]
  )

  const hasContent = Boolean(featuredTrack) || favorites.length > 0 || playlists.length > 0
  if (!isLoading && !hasContent) return null

  const nowPlaying = jukebox?.state.currentTrack
  const isPlaying = jukebox?.state.isPlaying

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-slate-900/80 via-purple-950/30 to-slate-900/80 backdrop-blur border border-white/10 rounded-3xl overflow-hidden",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Headphones className="h-4 w-4 text-purple-400" />
          {displayName}&apos;s Jukebox
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {/* Now Playing indicator (shows what YOU are playing, not the profile owner) */}
            {nowPlaying && isPlaying && (
              <div className="flex items-center gap-3 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
                {nowPlaying.cover_art_url ? (
                  <img
                    src={nowPlaying.cover_art_url}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/30">
                    <Music className="h-4 w-4 text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-300 font-medium">
                    Now Playing
                  </p>
                  <p className="truncate text-sm text-white">
                    {nowPlaying.title}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {nowPlaying.artist_name}
                  </p>
                </div>
                <Disc3 className="h-5 w-5 text-purple-400 animate-spin" />
              </div>
            )}

            {featuredTrack && (
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-500/10 p-3 text-left transition-colors hover:bg-purple-500/15",
                  isTrackPlaying(featuredTrack.id) && "ring-2 ring-purple-400/40"
                )}
                onClick={() => handlePlay(featuredTrack)}
              >
                {featuredTrack.cover_art_url ? (
                  <img
                    src={featuredTrack.cover_art_url}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600/30">
                    <Music className="h-5 w-5 text-purple-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-purple-300">Featured Song</p>
                  <p className="truncate text-sm font-semibold text-white">{featuredTrack.title}</p>
                  <p className="truncate text-xs text-slate-400">{featuredTrack.artist_name}</p>
                </div>
                {isTrackPlaying(featuredTrack.id) ? (
                  <Pause className="h-4 w-4 text-purple-300" />
                ) : (
                  <Play className="h-4 w-4 text-white/60" />
                )}
              </button>
            )}

            {/* Section toggle */}
            <div className="flex items-center gap-1">
              {favorites.length > 0 && (
                <Button
                  variant={activeSection === "favorites" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs rounded-full",
                    activeSection === "favorites"
                      ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      : "text-white/50"
                  )}
                  onClick={() => setActiveSection("favorites")}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Favorites ({favorites.length})
                </Button>
              )}
              {playlists.length > 0 && (
                <Button
                  variant={activeSection === "playlists" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs rounded-full",
                    activeSection === "playlists"
                      ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                      : "text-white/50"
                  )}
                  onClick={() => setActiveSection("playlists")}
                >
                  <ListMusic className="h-3 w-3 mr-1" />
                  Playlists ({playlists.length})
                </Button>
              )}
            </div>

            {/* Favorites section */}
            {activeSection === "favorites" && favorites.length > 0 && (
              <div className="space-y-2">
                {jukebox && (
                  <Button
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-4"
                    onClick={handlePlayFavorites}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Play Favorites
                  </Button>
                )}
                <ScrollArea className="max-h-[280px]">
                  <div className="space-y-0.5">
                    {favorites.map((track) => {
                      const playing = isTrackPlaying(track.id)
                      return (
                        <button
                          key={track.id}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5",
                            playing && "bg-purple-500/10"
                          )}
                          onClick={() => handlePlay(track)}
                        >
                          {track.cover_art_url ? (
                            <img
                              src={track.cover_art_url}
                              alt=""
                              className="h-9 w-9 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded bg-purple-600/30">
                              <Music className="h-3.5 w-3.5 text-purple-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "truncate text-sm",
                                playing
                                  ? "text-purple-300 font-medium"
                                  : "text-white"
                              )}
                            >
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {track.artist_name}
                              {track.duration
                                ? ` · ${formatDuration(track.duration)}`
                                : ""}
                            </p>
                          </div>
                          {playing ? (
                            <Pause className="h-3.5 w-3.5 text-purple-400" />
                          ) : (
                            <Play className="h-3.5 w-3.5 text-white/30 group-hover:text-white" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Playlists section */}
            {activeSection === "playlists" && playlists.length > 0 && (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                      <ListMusic className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {playlist.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {playlist.music_playlist_items?.length || 0} tracks
                      </p>
                    </div>
                    {jukebox &&
                      playlist.music_playlist_items &&
                      playlist.music_playlist_items.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full h-8 w-8"
                          onClick={() => handlePlayPlaylist(playlist)}
                        >
                          <Play className="h-4 w-4 text-purple-400" />
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
