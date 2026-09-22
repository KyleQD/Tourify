"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Headphones, Search, Upload, Settings2, X, Loader2 } from "lucide-react"
import { useMultiAccount } from "@/hooks/use-multi-account"
import {
  fetchLibraryTracks,
  fetchUserPlaylists,
  type JukeboxPlaylist,
} from "@/lib/services/jukebox.service"
import type { JukeboxTrack } from "@/contexts/jukebox-context"
import { useMusicUrlState, type MusicSection } from "./use-music-url-state"
import { MusicPrimaryNav } from "./music-primary-nav"
import { MusicHome } from "./music-home"
import { MusicLibrarySection } from "./music-library-section"
import { MusicDiscoverSection } from "./music-discover-section"
import { MusicPlaylistsSection, PlaylistDetail } from "./music-playlists-section"
import { MusicAudiusSection } from "./music-audius-section"
import { MusicSearchResults } from "./music-search-results"

function useDebouncedValue<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export function MusicPageClient() {
  const url = useMusicUrlState()
  const { activeAccount } = useMultiAccount()

  const [library, setLibrary] = useState<JukeboxTrack[]>([])
  const [playlists, setPlaylists] = useState<JukeboxPlaylist[]>([])
  const [libraryState, setLibraryState] = useState<"loading" | "ready" | "error">("loading")

  const [searchInput, setSearchInput] = useState(url.query)
  const debouncedSearch = useDebouncedValue(searchInput, 350)
  const lastPushedQuery = useRef(url.query)

  const audiusEnabled =
    process.env.NEXT_PUBLIC_AUDIUS_IMPORT_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_AUDIUS_PROFILE_PLAYBACK_ENABLED === "true"

  const isArtistContext =
    activeAccount?.account_type === "artist" ||
    (Array.isArray(activeAccount?.account_type) &&
      activeAccount.account_type.includes("artist"))

  // ── Library + playlists (shared across sections) ──────────────────────────
  const loadCoreData = useCallback(() => {
    setLibraryState("loading")
    Promise.all([fetchLibraryTracks(), fetchUserPlaylists({ includeItems: true })])
      .then(([lib, pls]) => {
        setLibrary(lib)
        setPlaylists(pls)
        setLibraryState("ready")
      })
      .catch(() => setLibraryState("error"))
  }, [])

  useEffect(() => {
    loadCoreData()
  }, [loadCoreData])

  // ── Search: input → debounced → URL (shallow) ─────────────────────────────
  useEffect(() => {
    if (debouncedSearch === lastPushedQuery.current) return
    lastPushedQuery.current = debouncedSearch
    url.setParams({ q: debouncedSearch.trim() || null })
  }, [debouncedSearch])

  // External URL changes (back/forward) → input
  useEffect(() => {
    if (url.query !== lastPushedQuery.current) {
      lastPushedQuery.current = url.query
      setSearchInput(url.query)
    }
  }, [url.query])

  const setSection = useCallback(
    (section: MusicSection) => {
      url.setParams({ section: section === "home" ? null : section, playlist: null })
    },
    [url]
  )

  const activeQuery = url.query.trim()
  const showSearchResults = activeQuery.length >= 2

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pb-40">
      {/* Compact header */}
      <header className="border-b border-white/8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Headphones className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-purple-400">
                  Music
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Your Music</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Listen, save, and build playlists across Tourify
                {audiusEnabled ? " and Audius" : ""}.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Page-level search */}
              <div className="relative flex-1 min-w-52 lg:w-72">
                {showSearchResults ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 animate-spin pointer-events-none hidden" />
                ) : null}
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && searchInput) {
                      setSearchInput("")
                      lastPushedQuery.current = ""
                      url.setParams({ q: null })
                    }
                  }}
                  placeholder="Search music…"
                  aria-label="Search music"
                  className="pl-9 pr-8 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-9"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("")
                      lastPushedQuery.current = ""
                      url.setParams({ q: null })
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Creator actions — artist account context only */}
              {isArtistContext && (
                <>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="text-slate-300 hover:text-white border border-white/10 h-9"
                  >
                    <Link href="/artist/music/upload">
                      <Upload className="h-4 w-4 mr-1.5" /> Upload
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="text-slate-300 hover:text-white border border-white/10 h-9"
                  >
                    <Link href="/artist/music">
                      <Settings2 className="h-4 w-4 mr-1.5" /> Manage music
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <MusicPrimaryNav
              section={url.section}
              audiusEnabled={audiusEnabled}
              counts={{ library: library.length, playlists: playlists.length }}
              onSelect={setSection}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {showSearchResults ? (
          <MusicSearchResults
            query={activeQuery}
            playlists={playlists}
            audiusEnabled={audiusEnabled}
          />
        ) : url.section === "home" ? (
          <MusicHome
            playlists={playlists}
            audiusEnabled={audiusEnabled}
            onNavigate={setSection}
          />
        ) : url.section === "library" ? (
          libraryState === "loading" ? (
            <LibraryLoading />
          ) : libraryState === "error" ? (
            <LibraryError onRetry={loadCoreData} />
          ) : (
            <MusicLibrarySection
              library={library}
              playlists={playlists}
              view={url.view}
              onViewChange={(view) => url.setParams({ view: view === "list" ? null : view })}
              onDiscover={() => setSection("discover")}
              onExploreAudius={() => setSection("audius")}
              audiusEnabled={audiusEnabled}
            />
          )
        ) : url.section === "discover" ? (
          <MusicDiscoverSection
            playlists={playlists}
            genre={url.genre}
            sort={url.sort}
            onGenreChange={(genre) => url.setParams({ genre: genre === "All" ? null : genre })}
            onSortChange={(sort) => url.setParams({ sort: sort === "recent" ? null : sort })}
          />
        ) : url.section === "playlists" ? (
          url.playlistId ? (
            <PlaylistDetail
              playlistId={url.playlistId}
              playlists={playlists}
              onBack={() => url.setParams({ playlist: null })}
              onChanged={loadCoreData}
            />
          ) : (
            <MusicPlaylistsSection
              playlists={playlists}
              loading={libraryState === "loading"}
              error={libraryState === "error"}
              onRefresh={loadCoreData}
              onOpenPlaylist={(id) => url.setParams({ playlist: id })}
            />
          )
        ) : (
          <MusicAudiusSection initialQuery="" />
        )}
      </main>
    </div>
  )
}

function LibraryLoading() {
  return (
    <div className="flex flex-col items-center py-20 gap-3 text-slate-500" aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Loading your library…</p>
    </div>
  )
}

function LibraryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-20 gap-4 text-slate-500" role="alert">
      <p className="text-sm">Couldn't load your library.</p>
      <Button size="sm" variant="ghost" onClick={onRetry} className="text-slate-300 border border-white/10">
        Try again
      </Button>
    </div>
  )
}
