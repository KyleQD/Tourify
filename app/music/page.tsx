"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Play, Pause } from "lucide-react"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { toast } from "sonner"

interface LibraryItem {
  id: string
  music_track_id: string
  listing_id: string | null
  created_at: string
  seller_user_id: string | null
  artist_music: {
    id: string
    title: string
    genre: string | null
    duration: number | null
    cover_art_url: string | null
    file_url: string | null
    user_id?: string
  } | null
}

interface Playlist {
  id: string
  title: string
  description: string | null
  visibility: "private" | "public" | "unlisted"
  music_playlist_items?: Array<{
    id: string
    music_track_id: string
    artist_music?: {
      title: string
    } | null
  }>
}

export default function MusicPage() {
  const jukebox = useJukeboxOptional()
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("")
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  async function loadMusicData() {
    setIsLoading(true)
    try {
      const [libraryRes, playlistsRes] = await Promise.all([
        fetch("/api/music/library", { credentials: "include", cache: "no-store" }),
        fetch("/api/music/playlists?includeItems=true", { credentials: "include", cache: "no-store" }),
      ])

      const libraryJson = await libraryRes.json()
      const playlistsJson = await playlistsRes.json()
      setLibrary(Array.isArray(libraryJson.data) ? libraryJson.data : [])
      setPlaylists(Array.isArray(playlistsJson.data) ? playlistsJson.data : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMusicData()
  }, [])

  async function createPlaylist() {
    if (!newPlaylistTitle.trim()) return
    await fetch("/api/music/playlists", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newPlaylistTitle.trim(),
        description: newPlaylistDescription.trim() || null,
        visibility: "private",
      }),
    })
    setNewPlaylistTitle("")
    setNewPlaylistDescription("")
    await loadMusicData()
  }

  async function addTrackToPlaylist(trackId: string) {
    if (!selectedPlaylistId) return
    await fetch(`/api/music/playlists/${selectedPlaylistId}/items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicTrackId: trackId }),
    })
    await loadMusicData()
  }

  async function shareTrack(trackId: string) {
    await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ musicId: trackId, createPost: true }),
    })
    toast.success("Shared to feed")
  }

  async function sharePlaylist(playlistId: string) {
    await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, createPost: true }),
    })
    toast.success("Playlist shared")
  }

  function playLibraryTrack(item: LibraryItem) {
    if (!jukebox || !item.artist_music?.id) {
      toast.error("Music player is unavailable")
      return
    }

    const trackId = item.artist_music.id
    if (jukebox.state.currentTrack?.id === trackId && jukebox.state.isPlaying) {
      jukebox.pause()
      return
    }

    jukebox.play({
      id: trackId,
      title: item.artist_music.title || "Untitled",
      artist_name: "Artist",
      artist_id: item.artist_music.user_id || item.seller_user_id || undefined,
      duration: item.artist_music.duration ?? undefined,
      file_url: item.artist_music.file_url || `/api/music/stream?trackId=${trackId}`,
      cover_art_url: item.artist_music.cover_art_url ?? undefined,
      genre: item.artist_music.genre ?? undefined,
      in_library: true,
    })
  }

  const totalLibraryMinutes = useMemo(() => {
    const totalSeconds = library.reduce((sum, item) => sum + (item.artist_music?.duration || 0), 0)
    return Math.round(totalSeconds / 60)
  }, [library])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Music Library</h1>
          <p className="text-sm text-muted-foreground">Saved tracks, purchases, playlists, and feed sharing</p>
        </div>
        <Badge variant="secondary">{library.length} tracks • {totalLibraryMinutes} min</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
              <CardTitle>Saved music</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading music library...</div>
            ) : library.length === 0 ? (
              <div className="text-sm text-muted-foreground">No saved tracks yet.</div>
            ) : (
              library.map(item => {
                const trackId = item.artist_music?.id
                const isCurrent =
                  Boolean(trackId) &&
                  jukebox?.state.currentTrack?.id === trackId
                const isPlaying = Boolean(isCurrent && jukebox?.state.isPlaying)

                return (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 w-9 rounded-full shrink-0"
                          onClick={() => playLibraryTrack(item)}
                          disabled={!trackId}
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 ml-0.5" />
                          )}
                        </Button>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.artist_music?.title || "Untitled track"}</div>
                          <div className="text-xs text-muted-foreground">
                            Seller {item.seller_user_id ? item.seller_user_id.slice(0, 8) : "unknown"}
                            {item.artist_music?.genre ? ` • ${item.artist_music.genre}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button size="sm" variant="outline" onClick={() => addTrackToPlaylist(item.music_track_id)}>
                          Add to playlist
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => shareTrack(item.music_track_id)}>
                          Share to feed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            window.open(
                              `/api/music/download?trackId=${encodeURIComponent(item.music_track_id)}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create playlist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={newPlaylistTitle}
                onChange={event => setNewPlaylistTitle(event.target.value)}
                placeholder="Playlist title"
              />
              <Textarea
                value={newPlaylistDescription}
                onChange={event => setNewPlaylistDescription(event.target.value)}
                placeholder="Playlist description"
                rows={3}
              />
              <Button className="w-full" onClick={createPlaylist}>
                Create playlist
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your playlists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={selectedPlaylistId}
                onChange={event => setSelectedPlaylistId(event.target.value)}
              >
                <option value="">Select playlist for quick add</option>
                {playlists.map(playlist => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.title}
                  </option>
                ))}
              </select>
              {playlists.length === 0 ? (
                <div className="text-sm text-muted-foreground">No playlists yet.</div>
              ) : (
                playlists.map(playlist => (
                  <div key={playlist.id} className="rounded-md border p-3">
                    <div className="font-medium">{playlist.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {playlist.music_playlist_items?.length || 0} tracks • {playlist.visibility}
                    </div>
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      onClick={() => sharePlaylist(playlist.id)}
                    >
                      Share playlist
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
