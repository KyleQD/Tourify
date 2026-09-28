"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlayCircle, Shuffle, Search, X, LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJukeboxOptional, type JukeboxTrack } from "@/contexts/jukebox-context"
import { TrackCard } from "@/components/jukebox/track-card"
import type { JukeboxPlaylist } from "@/lib/services/jukebox.service"
import { SectionEmpty, SectionHeading } from "./section-states"
import { MusicArtworkCard } from "./music-home"
import { toast } from "sonner"

type SortKey = "recent" | "title" | "artist" | "duration"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "duration", label: "Duration" },
]

export function MusicLibrarySection({
  library,
  playlists,
  view,
  onViewChange,
  onDiscover,
  onExploreAudius,
  audiusEnabled,
}: {
  library: JukeboxTrack[]
  playlists: JukeboxPlaylist[]
  view: "list" | "grid"
  onViewChange: (view: "list" | "grid") => void
  onDiscover: () => void
  onExploreAudius: () => void
  audiusEnabled: boolean
}) {
  const jukebox = useJukeboxOptional()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("recent")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let items = library
    if (q) {
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist_name.toLowerCase().includes(q) ||
          (t.genre ?? "").toLowerCase().includes(q)
      )
    }
    if (sort === "title") items = [...items].sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === "artist")
      items = [...items].sort((a, b) => a.artist_name.localeCompare(b.artist_name))
    else if (sort === "duration")
      items = [...items].sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
    return items
  }, [library, query, sort])

  function handlePlayAll() {
    if (!jukebox || filtered.length === 0) return
    jukebox.playPlaylist(filtered)
    toast.success(`Playing ${filtered.length} tracks`)
  }

  function handleShuffle() {
    if (!jukebox || filtered.length === 0) return
    jukebox.playPlaylist([...filtered].sort(() => Math.random() - 0.5))
    toast.success("Shuffling library")
  }

  if (library.length === 0) {
    return (
      <SectionEmpty
        icon="library"
        title="Build your music library"
        description="Save tracks you love from Discover or Audius and they'll live here, ready to play anytime."
        actionLabel="Discover music"
        onAction={onDiscover}
        secondaryActionLabel={audiusEnabled ? "Explore Audius" : undefined}
        onSecondaryAction={audiusEnabled ? onExploreAudius : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Your Library"
        description={`${library.length} saved track${library.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayAll}
              className="bg-purple-600 hover:bg-purple-500 text-white h-9 px-4 rounded-full text-sm"
            >
              <PlayCircle className="h-4 w-4 mr-1.5" /> Play all
            </Button>
            <Button
              variant="ghost"
              onClick={handleShuffle}
              className="text-slate-400 hover:text-white h-9 px-3 rounded-full text-sm"
            >
              <Shuffle className="h-4 w-4 mr-1.5" /> Shuffle
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library…"
            aria-label="Search your library"
            className="pl-9 pr-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear library search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5" role="group" aria-label="Sort library">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSort(o.value)}
              aria-pressed={sort === o.value}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                sort === o.value ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewChange("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "list" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "grid" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <SectionEmpty
          icon="search"
          title={`No matches for "${query}"`}
          description="Try a different title, artist, or genre."
          actionLabel="Clear search"
          onAction={() => setQuery("")}
        />
      ) : view === "list" ? (
        <div className="space-y-0.5">
          {filtered.map((t, i) => (
            <TrackCard key={t.id} track={t} playlists={playlists} compact index={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {filtered.map((t) => (
            <MusicArtworkCard key={t.id} track={t} queue={filtered} />
          ))}
        </div>
      )}
    </div>
  )
}
