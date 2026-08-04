"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Disc3,
  FileText,
  Loader2,
  Map,
  Search,
  UserRound,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackDashboardUxEvent } from "@/lib/analytics/ux-event-client"
import { useGlobalSearch } from "@/hooks/use-global-search"
import type { GlobalSearchResult } from "@/lib/search/global-search-types"
import { resolvePublicProfilePath } from "@/lib/utils/public-profile-routes"
import { cn } from "@/lib/utils"

interface EnhancedAccountSearchProps {
  placeholder?: string
  className?: string
  onResultSelect?: (result: GlobalSearchResult) => void
  onNavigate?: () => void
  showRecentSearches?: boolean
}

const KIND_LABELS: Record<GlobalSearchResult["kind"], string> = {
  profile: "Profile", event: "Event", tour: "Tour", track: "Song",
  album: "Album", ep: "EP", post: "Post", job: "Job",
}

function ResultIcon({ result }: { result: GlobalSearchResult }) {
  const className = "h-4 w-4"
  switch (result.kind) {
    case "profile": return result.profileType === "venue" || result.profileType === "organization" ? <Building2 className={className} /> : <UserRound className={className} />
    case "event": return <CalendarDays className={className} />
    case "tour": return <Map className={className} />
    case "track": case "album": case "ep": return <Disc3 className={className} />
    case "post": return <FileText className={className} />
    case "job": return <BriefcaseBusiness className={className} />
  }
}

export function EnhancedAccountSearch({
  placeholder = "Search people, events, tours, music, posts, and jobs…",
  className,
  onResultSelect,
  onNavigate,
  showRecentSearches = true,
}: EnhancedAccountSearchProps) {
  const router = useRouter()
  const listboxId = useId()
  const searchRootRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const {
    query, setQuery, results, isLoading, isOpen, setIsOpen, searchInputRef,
    clearSearch, recentSearches, addToRecentSearches,
  } = useGlobalSearch()

  const openResultsPage = () => {
    const normalized = query.trim()
    if (!normalized) return
    addToRecentSearches(normalized, "all")
    void trackDashboardUxEvent({
      eventName: "global_search_submit",
      surface: "global_search",
      metadata: { category: "all", queryLength: normalized.length },
    })
    setIsOpen(false)
    onNavigate?.()
    router.push(`/search?q=${encodeURIComponent(normalized)}`)
  }

  const openResult = (result: GlobalSearchResult) => {
    addToRecentSearches(query || result.title, result.kind)
    void trackDashboardUxEvent({
      eventName: "global_search_result_opened",
      surface: "global_search_preview",
      metadata: { resultType: result.kind, category: result.category, relationship: result.relationship },
    })
    const href = result.href || (result.kind === "profile"
      ? resolvePublicProfilePath({ id: result.id, account_type: result.profileType })
      : null) || "/search"
    clearSearch()
    onResultSelect?.(result)
    onNavigate?.()
    router.push(href)
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault()
        searchInputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener("keydown", handleShortcut)
    return () => document.removeEventListener("keydown", handleShortcut)
  }, [searchInputRef, setIsOpen])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || searchRootRef.current?.contains(target)) return

      setIsOpen(false)
      setIsFocused(false)
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [isOpen, setIsOpen])

  const showPanel = isOpen && (isFocused || Boolean(query) || recentSearches.length > 0)

  return (
    <div ref={searchRootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          data-search-input
          role="combobox"
          aria-label="Search Tourify"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showPanel}
          value={query}
          placeholder={placeholder}
          onChange={event => { setQuery(event.target.value); setIsOpen(true) }}
          onFocus={() => { setIsFocused(true); setIsOpen(true) }}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={event => {
            if (event.key === "Enter") { event.preventDefault(); openResultsPage() }
            if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); searchInputRef.current?.blur() }
          }}
          className="w-full rounded-xl border-2 bg-white pl-10 pr-10 text-black placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
        />
        {isLoading ? (
          <Loader2 aria-label="Searching" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-purple-500" />
        ) : query ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Clear search" onClick={clearSearch} className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {showPanel && (
        <div id={listboxId} role="listbox" className="absolute z-[80] mt-2 max-h-[min(70vh,34rem)] w-full min-w-[20rem] overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl">
          {query.trim() && !isLoading && results.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No public results found. Press Enter to search every category.</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map(result => (
                <button
                  key={result.key}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => openResult(result)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                    <AvatarImage src={result.imageUrl || undefined} alt="" />
                    <AvatarFallback className="rounded-lg"><ResultIcon result={result} /></AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{result.title}</span>
                      {result.relationshipLabel && <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">{result.relationshipLabel}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{KIND_LABELS[result.kind]}{result.subtitle ? ` • ${result.subtitle}` : ""}</span>
                  </span>
                </button>
              ))}
              <button type="button" onMouseDown={event => event.preventDefault()} onClick={openResultsPage} className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-t px-3 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50">
                See all results for “{query.trim()}”
              </button>
            </div>
          ) : showRecentSearches && !query.trim() && recentSearches.length > 0 ? (
            <div>
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</p>
              {recentSearches.map(recent => (
                <button key={`${recent.query}-${recent.timestamp}`} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(recent.query); setIsOpen(true); searchInputRef.current?.focus() }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />{recent.query}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Search profiles, events, tours, music, posts, and jobs.</div>
          )}
        </div>
      )}
    </div>
  )
}
