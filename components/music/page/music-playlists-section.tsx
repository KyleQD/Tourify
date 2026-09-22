"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  ListMusic,
  Globe,
  Lock,
  Users,
  Share2,
  Play,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional } from "@/contexts/jukebox-context"
import { TrackCard } from "@/components/jukebox/track-card"
import {
  createPlaylist,
  deletePlaylist,
  fetchUserPlaylists,
  playlistItemsToTracks,
  removeTrackFromPlaylist,
  reorderPlaylistItem,
  updatePlaylist,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import { SectionEmpty, SectionError, SectionHeading, TrackListSkeleton } from "./section-states"
import { toast } from "sonner"

const VIS_ICONS = { public: Globe, unlisted: Users, private: Lock } as const
const VIS_LABELS = { public: "Public", unlisted: "Unlisted", private: "Private" } as const

// ─── Create / edit dialog ────────────────────────────────────────────────────

function PlaylistFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: JukeboxPlaylist | null
  onSaved: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [visibility, setVisibility] = useState<"private" | "public" | "unlisted">(
    initial?.visibility ?? "private"
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "")
      setDescription(initial?.description ?? "")
      setVisibility(initial?.visibility ?? "private")
    }
  }, [open, initial])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      if (initial) {
        const ok = await updatePlaylist(initial.id, {
          title: title.trim(),
          description: description.trim() || null,
          visibility,
        })
        if (!ok) throw new Error()
        toast.success("Playlist updated")
      } else {
        const created = await createPlaylist(title.trim(), description.trim() || undefined, visibility)
        if (!created) throw new Error()
        toast.success("Playlist created")
      }
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error(initial ? "Failed to update playlist" : "Failed to create playlist")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit playlist" : "Create playlist"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label htmlFor="playlist-name" className="text-xs text-slate-400 mb-1 block">
              Name <span aria-hidden="true">*</span>
            </label>
            <Input
              id="playlist-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Playlist name…"
              maxLength={160}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="playlist-desc" className="text-xs text-slate-400 mb-1 block">
              Description
            </label>
            <Textarea
              id="playlist-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              maxLength={1000}
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 mb-1 block" id="playlist-vis-label">
              Visibility
            </span>
            <div className="flex gap-1" role="group" aria-labelledby="playlist-vis-label">
              {(Object.keys(VIS_LABELS) as Array<keyof typeof VIS_LABELS>).map((v) => {
                const Icon = VIS_ICONS[v]
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    aria-pressed={visibility === v}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      visibility === v
                        ? "bg-purple-600 text-white border-purple-600"
                        : "text-slate-400 hover:text-white border-white/10"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {VIS_LABELS[v]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Playlist detail ─────────────────────────────────────────────────────────

export function PlaylistDetail({
  playlistId,
  playlists,
  onBack,
  onChanged,
}: {
  playlistId: string
  playlists: JukeboxPlaylist[]
  onBack: () => void
  onChanged: () => void
}) {
  const jukebox = useJukeboxOptional()
  const playlist = playlists.find((p) => p.id === playlistId)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  const items = useMemo(() => playlist?.items ?? [], [playlist])
  const tracks = useMemo(() => playlistItemsToTracks(items), [items])

  if (!playlist) {
    return (
      <SectionError
        title="Playlist not found"
        message="It may have been deleted, or you don't have access."
        onRetry={onBack}
      />
    )
  }

  const VisIcon = VIS_ICONS[playlist.visibility] ?? Lock

  async function handleShare() {
    const res = await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId, createPost: true }),
    })
    res.ok ? toast.success("Playlist shared to feed") : toast.error("Failed to share")
  }

  async function handleDelete() {
    setDeleting(true)
    const ok = await deletePlaylist(playlistId)
    setDeleting(false)
    if (ok) {
      toast.success("Playlist deleted")
      onChanged()
      onBack()
    } else toast.error("Failed to delete playlist")
  }

  async function handleRemove(itemId: string) {
    const ok = await removeTrackFromPlaylist(playlistId, itemId)
    if (ok) {
      toast.success("Removed from playlist")
      onChanged()
    } else toast.error("Failed to remove track")
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const item = items[index]
    const swap = items[target]
    if (!item || !swap) return
    setMovingId(item.id)
    // Persist both positions; rollback signal = refetch via onChanged on failure
    const posA = swap.position ?? target
    const posB = item.position ?? index
    const ok1 = await reorderPlaylistItem(playlistId, item.id, posA)
    const ok2 = ok1 ? await reorderPlaylistItem(playlistId, swap.id, posB) : false
    setMovingId(null)
    if (ok1 && ok2) onChanged()
    else toast.error("Couldn't reorder — refresh and try again")
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All playlists
      </button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
          <ListMusic className="h-9 w-9 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{playlist.title}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <VisIcon className="h-3.5 w-3.5" />
            <span>{VIS_LABELS[playlist.visibility]}</span>
            <span aria-hidden="true">·</span>
            <span>
              {items.length} track{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          {playlist.description && (
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{playlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tracks.length > 0 && (
            <Button
              onClick={() => jukebox?.playPlaylist(tracks)}
              className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-4 rounded-full text-sm"
            >
              <Play className="h-4 w-4 mr-1.5" /> Play all
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9" aria-label="Playlist options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-white">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share to feed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDelete(true)}
                className="text-red-400 focus:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {items.length === 0 ? (
        <SectionEmpty
          icon="playlist"
          title="This playlist is empty"
          description="Use the menu on any track to add it to this playlist."
        />
      ) : (
        <div className="space-y-0.5">
          {tracks.map((track, i) => {
            const item = items[i]
            return (
              <div key={item?.id ?? track.id} className="group relative">
                <TrackCard track={track} playlists={playlists} compact index={i} />
                {item && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0 || movingId === item.id}
                      aria-label={`Move ${track.title} up`}
                      className="p-1.5 rounded text-slate-500 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(i, 1)}
                      disabled={i === items.length - 1 || movingId === item.id}
                      aria-label={`Move ${track.title} down`}
                      className="p-1.5 rounded text-slate-500 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${track.title} from playlist`}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <PlaylistFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={playlist}
        onSaved={onChanged}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete playlist?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            &ldquo;{playlist.title}&rdquo; will be permanently deleted. This can&rsquo;t be undone.
            The tracks stay in your library.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Playlist index ──────────────────────────────────────────────────────────

export function MusicPlaylistsSection({
  playlists,
  loading,
  error,
  onRefresh,
  onOpenPlaylist,
}: {
  playlists: JukeboxPlaylist[]
  loading: boolean
  error: boolean
  onRefresh: () => void
  onOpenPlaylist: (id: string) => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return playlists
    return playlists.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
    )
  }, [playlists, query])

  async function handleShare(id: string) {
    const res = await fetch("/api/music/share", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId: id, createPost: true }),
    })
    res.ok ? toast.success("Playlist shared to feed") : toast.error("Failed to share")
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Your Playlists"
        action={
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-4 rounded-full text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New playlist
          </Button>
        }
      />

      {playlists.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search playlists…"
            aria-label="Search playlists"
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9"
          />
        </div>
      )}

      {loading && <TrackListSkeleton rows={4} />}
      {error && <SectionError title="Couldn't load playlists" onRetry={onRefresh} />}

      {!loading && !error && playlists.length === 0 && (
        <SectionEmpty
          icon="playlist"
          title="No playlists yet"
          description="Create your first playlist to organize tracks for any mood, trip, or event."
          actionLabel="Create playlist"
          onAction={() => setCreateOpen(true)}
        />
      )}

      {!loading && !error && playlists.length > 0 && filtered.length === 0 && (
        <SectionEmpty
          icon="search"
          title={`No playlists match "${query}"`}
          actionLabel="Clear search"
          onAction={() => setQuery("")}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((pl) => {
            const VisIcon = VIS_ICONS[pl.visibility] ?? Lock
            return (
              <div
                key={pl.id}
                className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 hover:bg-white/8 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenPlaylist(pl.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
                    <ListMusic className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pl.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <VisIcon className="h-3 w-3" />
                      <span>
                        {pl.items?.length ?? 0} track{(pl.items?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(pl.id)}
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-slate-400 hover:text-white p-2 rounded"
                  aria-label={`Share ${pl.title} to feed`}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <PlaylistFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={onRefresh} />
    </div>
  )
}
