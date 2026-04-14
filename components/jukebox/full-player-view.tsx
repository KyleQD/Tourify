"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ChevronDown,
  Music,
  ListMusic,
  Compass,
  Users,
  Library,
  Disc3,
  Search,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { getTheme } from "@/lib/jukebox/visual-themes"
import { VisualizerBackground } from "./visualizers"
import { AlbumArtVisual } from "./album-art-visual"
import { ThemeSelector } from "./theme-selector"
import {
  fetchDiscoverTracks,
  fetchFollowingTracks,
  fetchUserPlaylists,
  fetchLibraryTracks,
  fetchFavoriteTracks,
  createPlaylist,
  deletePlaylist,
  playlistItemsToTracks,
  toggleLike,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import { TrackCard } from "./track-card"
import { toast } from "sonner"

export function FullPlayerView() {
  const ctx = useJukeboxOptional()
  if (!ctx) return null

  const { state, setExpanded } = ctx

  return (
    <Sheet
      open={state.isPlayerExpanded}
      onOpenChange={(open) => setExpanded(open)}
    >
      <SheetContent
        side="bottom"
        className="h-[100dvh] sm:h-[85vh] rounded-t-2xl border-t border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden.Root>
          <SheetTitle>Jukebox Player</SheetTitle>
        </VisuallyHidden.Root>
        <FullPlayerContent />
      </SheetContent>
    </Sheet>
  )
}

function FullPlayerContent() {
  const ctx = useJukeboxOptional()
  const [activeTab, setActiveTab] = useState("now-playing")
  const [playlists, setPlaylists] = useState<JukeboxPlaylist[]>([])

  const loadPlaylists = useCallback(async () => {
    const data = await fetchUserPlaylists()
    setPlaylists(data)
  }, [])

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  if (!ctx) return null

  return (
    <div className="flex h-full flex-col">
      {/* Drag handle + close */}
      <div className="flex items-center justify-center pt-2 pb-1">
        <button
          className="h-1 w-10 rounded-full bg-white/20"
          onClick={() => ctx.setExpanded(false)}
        />
      </div>
      <div className="flex items-center justify-between px-4 pb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => ctx.setExpanded(false)}
        >
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </Button>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Jukebox
        </span>
        <div className="w-9" />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-4 grid w-auto grid-cols-7 bg-white/5 border border-white/10">
          <TabsTrigger value="now-playing" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Disc3 className="h-3 w-3" />
            <span className="hidden sm:inline">Playing</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <ListMusic className="h-3 w-3" />
            <span className="hidden sm:inline">Queue</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs gap-1 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300">
            <Heart className="h-3 w-3" />
            <span className="hidden sm:inline">Favorites</span>
          </TabsTrigger>
          <TabsTrigger value="discover" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Compass className="h-3 w-3" />
            <span className="hidden sm:inline">Discover</span>
          </TabsTrigger>
          <TabsTrigger value="following" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">Following</span>
          </TabsTrigger>
          <TabsTrigger value="playlists" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <ListMusic className="h-3 w-3" />
            <span className="hidden sm:inline">Playlists</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="text-xs gap-1 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
            <Library className="h-3 w-3" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="now-playing" className="flex-1 overflow-hidden mt-0">
          <NowPlayingTab />
        </TabsContent>

        <TabsContent value="queue" className="flex-1 overflow-hidden mt-0">
          <QueueTab />
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
          <FavoritesTab playlists={playlists} onPlaylistUpdated={loadPlaylists} />
        </TabsContent>

        <TabsContent value="discover" className="flex-1 overflow-hidden mt-0">
          <DiscoverTab playlists={playlists} onPlaylistUpdated={loadPlaylists} />
        </TabsContent>

        <TabsContent value="following" className="flex-1 overflow-hidden mt-0">
          <FollowingTab playlists={playlists} onPlaylistUpdated={loadPlaylists} />
        </TabsContent>

        <TabsContent value="playlists" className="flex-1 overflow-hidden mt-0">
          <PlaylistsTab playlists={playlists} onPlaylistUpdated={loadPlaylists} />
        </TabsContent>

        <TabsContent value="library" className="flex-1 overflow-hidden mt-0">
          <LibraryTab playlists={playlists} onPlaylistUpdated={loadPlaylists} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ================================================================
   NOW PLAYING TAB
   ================================================================ */

function NowPlayingTab() {
  const ctx = useJukeboxOptional()
  const [isLiked, setIsLiked] = useState(false)

  if (!ctx) return null
  const {
    state,
    togglePlayPause,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    getAudioElement,
  } = ctx

  const track = state.currentTrack

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  async function handleLike() {
    if (!track) return
    const result = await toggleLike(track.id)
    if (result) {
      setIsLiked(result.liked)
      toast.success(result.liked ? "Added to likes" : "Removed from likes")
    }
  }

  if (!track) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5">
          <Music className="h-10 w-10 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white">Nothing playing</h3>
          <p className="mt-1 text-sm text-slate-400">
            Browse Discover or your Library to start listening
          </p>
        </div>
      </div>
    )
  }

  const theme = getTheme(state.visualTheme)

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-4 sm:py-8 overflow-hidden">
      {/* Visualizer background */}
      <div className="absolute inset-0 -z-10">
        <VisualizerBackground themeId={state.visualTheme} isPlaying={state.isPlaying} getAudioElement={getAudioElement} />
      </div>

      {/* Album art with visual effect */}
      <div className="relative mb-6 sm:mb-8 z-10">
        <AlbumArtVisual
          coverUrl={track.cover_art_url}
          variant={theme.artVariant}
          isPlaying={state.isPlaying}
        />
      </div>

      {/* Track info */}
      <div className="w-full max-w-sm text-center z-10">
        <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
          {track.title}
        </h2>
        <p className="mt-1 truncate text-sm text-slate-400">
          {track.artist_name}
        </p>
        {track.genre && (
          <Badge className="mt-2 bg-purple-500/15 text-purple-300 border-purple-500/20 text-xs">
            {track.genre}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6 w-full max-w-sm space-y-2 z-10">
        <Slider
          value={[state.currentTime]}
          onValueChange={([v]) => seekTo(v)}
          max={state.duration || 1}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500 tabular-nums">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10"
          onClick={toggleShuffle}
        >
          <Shuffle
            className={cn(
              "h-4 w-4",
              state.isShuffled ? "text-purple-400" : "text-slate-400"
            )}
          />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-12 w-12"
          onClick={prev}
        >
          <SkipBack className="h-5 w-5 text-white" />
        </Button>

        <Button
          onClick={togglePlayPause}
          className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
        >
          {state.isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-12 w-12"
          onClick={next}
        >
          <SkipForward className="h-5 w-5 text-white" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10"
          onClick={cycleRepeatMode}
        >
          {state.repeatMode === "one" ? (
            <Repeat1 className="h-4 w-4 text-purple-400" />
          ) : (
            <Repeat
              className={cn(
                "h-4 w-4",
                state.repeatMode === "all"
                  ? "text-purple-400"
                  : "text-slate-400"
              )}
            />
          )}
        </Button>
      </div>

      {/* Volume + Like */}
      <div className="mt-4 flex w-full max-w-sm items-center justify-between gap-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8"
          onClick={handleLike}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isLiked ? "fill-red-500 text-red-500" : "text-slate-400"
            )}
          />
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {state.isMuted || state.volume === 0 ? (
              <VolumeX className="h-4 w-4 text-slate-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-slate-400" />
            )}
          </Button>
          <Slider
            value={[state.isMuted ? 0 : state.volume]}
            onValueChange={([v]) => setVolume(v)}
            max={1}
            step={0.01}
            className="w-24"
          />
        </div>
      </div>

      {/* Theme selector */}
      <div className="mt-6 z-10">
        <ThemeSelector />
      </div>
    </div>
  )
}

/* ================================================================
   QUEUE TAB
   ================================================================ */

function QueueTab() {
  const ctx = useJukeboxOptional()
  if (!ctx) return null
  const { state, removeFromQueue, clearQueue } = ctx

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-white">
          Queue{" "}
          <span className="text-slate-500">({state.queue.length} tracks)</span>
        </h3>
        {state.queue.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQueue}
            className="text-xs text-slate-400"
          >
            Clear all
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        {state.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListMusic className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">Queue is empty</p>
            <p className="mt-1 text-xs text-slate-500">
              Add tracks from Discover or your Library
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {state.queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className="group flex items-center gap-1"
              >
                <div className="flex-1 min-w-0">
                  <TrackCard track={track} compact index={idx} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  onClick={() => removeFromQueue(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {state.history.length > 0 && (
        <>
          <div className="border-t border-white/5 px-4 py-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Recently played
            </h4>
          </div>
          <ScrollArea className="max-h-48 px-2">
            <div className="space-y-0.5 pb-4">
              {state.history.slice(0, 10).map((track, idx) => (
                <TrackCard
                  key={`history-${track.id}-${idx}`}
                  track={track}
                  compact
                />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}

/* ================================================================
   DISCOVER TAB
   ================================================================ */

function DiscoverTab({
  playlists,
  onPlaylistUpdated,
}: {
  playlists: JukeboxPlaylist[]
  onPlaylistUpdated: () => void
}) {
  const ctx = useJukeboxOptional()
  const [tracks, setTracks] = useState<JukeboxTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "trending">(
    "trending"
  )
  const [genre, setGenre] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const loadTracks = useCallback(async () => {
    setIsLoading(true)
    const data = await fetchDiscoverTracks({
      sortBy,
      genre: genre === "all" ? undefined : genre,
      limit: 50,
    })
    setTracks(data)
    setIsLoading(false)
  }, [sortBy, genre])

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  const genres = ["all", "Rock", "Pop", "Electronic", "Hip-Hop", "Jazz", "R&B", "Country", "Folk", "Blues", "Classical", "Metal"]

  const filteredTracks = searchQuery
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tracks

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search + filters */}
      <div className="space-y-2 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search tracks or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["trending", "popular", "recent"] as const).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs capitalize",
                  sortBy === s
                    ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    : "text-slate-400"
                )}
                onClick={() => setSortBy(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-1 pb-1">
              {genres.map((g) => (
                <Button
                  key={g}
                  variant={genre === g ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs whitespace-nowrap flex-shrink-0",
                    genre === g
                      ? "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"
                      : "text-slate-400"
                  )}
                  onClick={() => setGenre(g)}
                >
                  {g === "all" ? "All Genres" : g}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Play all */}
      {filteredTracks.length > 0 && ctx && (
        <div className="px-4 pb-2">
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={() => ctx.playPlaylist(filteredTracks)}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Play all ({filteredTracks.length})
          </Button>
        </div>
      )}

      {/* Track list */}
      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Compass className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">No tracks found</p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlists={playlists}
                onPlaylistUpdated={onPlaylistUpdated}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

/* ================================================================
   FOLLOWING TAB
   ================================================================ */

function FollowingTab({
  playlists,
  onPlaylistUpdated,
}: {
  playlists: JukeboxPlaylist[]
  onPlaylistUpdated: () => void
}) {
  const ctx = useJukeboxOptional()
  const [tracks, setTracks] = useState<JukeboxTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")

  const loadTracks = useCallback(async () => {
    setIsLoading(true)
    const result = await fetchFollowingTracks({ sortBy, limit: 50 })
    setTracks(result.data)
    setIsLoading(false)
  }, [sortBy])

  useEffect(() => {
    loadTracks()
  }, [loadTracks])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-white">
          From artists you follow
        </h3>
        <div className="flex gap-1">
          {(["recent", "popular"] as const).map((s) => (
            <Button
              key={s}
              variant={sortBy === s ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 text-xs capitalize",
                sortBy === s
                  ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                  : "text-slate-400"
              )}
              onClick={() => setSortBy(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {tracks.length > 0 && ctx && (
        <div className="px-4 pb-2">
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={() => ctx.playPlaylist(tracks)}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Play all ({tracks.length})
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">
              No tracks from followed artists yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Follow artists to see their music here
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlists={playlists}
                onPlaylistUpdated={onPlaylistUpdated}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

/* ================================================================
   PLAYLISTS TAB
   ================================================================ */

function PlaylistsTab({
  playlists,
  onPlaylistUpdated,
}: {
  playlists: JukeboxPlaylist[]
  onPlaylistUpdated: () => void
}) {
  const ctx = useJukeboxOptional()
  const [newTitle, setNewTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newTitle.trim()) return
    setIsCreating(true)
    const result = await createPlaylist(newTitle.trim())
    if (result) {
      toast.success("Playlist created")
      setNewTitle("")
      onPlaylistUpdated()
    } else {
      toast.error("Failed to create playlist")
    }
    setIsCreating(false)
  }

  async function handleDelete(playlistId: string) {
    const ok = await deletePlaylist(playlistId)
    if (ok) {
      toast.success("Playlist deleted")
      onPlaylistUpdated()
    } else {
      toast.error("Failed to delete playlist")
    }
  }

  function handlePlayPlaylist(playlist: JukeboxPlaylist) {
    if (!ctx || !playlist.items || playlist.items.length === 0) return
    const tracks = playlistItemsToTracks(playlist.items)
    if (tracks.length === 0) {
      toast.error("No playable tracks in this playlist")
      return
    }
    ctx.playPlaylist(tracks)
    ctx.setActivePlaylistId(playlist.id)
    toast.success(`Now playing: ${playlist.title}`)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Create playlist */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Input
          placeholder="New playlist name..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
        <Button
          size="sm"
          disabled={!newTitle.trim() || isCreating}
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListMusic className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">No playlists yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Create one above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {playlists.map((playlist) => {
              const isExpanded = expandedId === playlist.id
              const tracks = playlist.items
                ? playlistItemsToTracks(playlist.items)
                : []

              return (
                <div
                  key={playlist.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30">
                      <ListMusic className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-white">
                        {playlist.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {playlist.items?.length || 0} tracks
                        {" · "}
                        {playlist.visibility}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {tracks.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={() => handlePlayPlaylist(playlist)}
                        >
                          <Play className="h-4 w-4 text-purple-400" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : playlist.id)
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-slate-400 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8"
                        onClick={() => handleDelete(playlist.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/5 px-1 py-1">
                      {tracks.length === 0 ? (
                        <p className="px-4 py-4 text-center text-xs text-slate-500">
                          No tracks in this playlist
                        </p>
                      ) : (
                        tracks.map((track, idx) => (
                          <TrackCard
                            key={track.id}
                            track={track}
                            compact
                            index={idx}
                            playlists={playlists}
                            onPlaylistUpdated={onPlaylistUpdated}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

/* ================================================================
   LIBRARY TAB
   ================================================================ */

function LibraryTab({
  playlists,
  onPlaylistUpdated,
}: {
  playlists: JukeboxPlaylist[]
  onPlaylistUpdated: () => void
}) {
  const ctx = useJukeboxOptional()
  const [tracks, setTracks] = useState<JukeboxTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const data = await fetchLibraryTracks()
      setTracks(data)
      setIsLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-white">
          Purchased tracks{" "}
          <span className="text-slate-500">({tracks.length})</span>
        </h3>
        {tracks.length > 0 && ctx && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
            onClick={() => ctx.playPlaylist(tracks)}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Play all
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Library className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">
              No purchased tracks yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Browse Discover to find music to buy
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlists={playlists}
                onPlaylistUpdated={onPlaylistUpdated}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

/* ================================================================
   FAVORITES TAB
   ================================================================ */

function FavoritesTab({
  playlists,
  onPlaylistUpdated,
}: {
  playlists: JukeboxPlaylist[]
  onPlaylistUpdated: () => void
}) {
  const ctx = useJukeboxOptional()
  const [tracks, setTracks] = useState<JukeboxTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const result = await fetchFavoriteTracks({ limit: 100 })
      setTracks(result.data)
      setIsLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-white">
          Liked Songs{" "}
          <span className="text-slate-500">({tracks.length})</span>
        </h3>
        {tracks.length > 0 && ctx && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700"
              onClick={() => ctx.playPlaylist(tracks)}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Play all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400"
              onClick={() => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5)
                ctx.playPlaylist(shuffled)
                toast.success("Shuffling favorites")
              }}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-red-400" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-400">No liked songs yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Tap the heart on any track to add it to your favorites
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                playlists={playlists}
                onPlaylistUpdated={onPlaylistUpdated}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
