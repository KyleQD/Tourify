import { useCallback, useEffect, useRef, useState } from "react"
import type { GlobalSearchResponse, GlobalSearchResult } from "@/lib/search/global-search-types"

interface RecentSearch {
  query: string
  timestamp: number
  type?: string
}

const RECENT_SEARCHES_KEY = "tourify-recent-searches"
const MAX_RECENT_SEARCHES = 5

function previewItems(items: GlobalSearchResult[]): GlobalSearchResult[] {
  const counts = new Map<string, number>()
  return items.filter(item => {
    const cap = item.category === "profiles" ? 5 : 2
    const count = counts.get(item.category) || 0
    if (count >= cap) return false
    counts.set(item.category, count + 1)
    return true
  }).slice(0, 10)
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const requestSequence = useRef(0)

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]")
      setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_SEARCHES) : [])
    } catch {
      setRecentSearches([])
    }
  }, [])

  useEffect(() => {
    const normalized = query.trim()
    if (!normalized) {
      requestSequence.current += 1
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const sequence = ++requestSequence.current
    setResults([])
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ q: normalized, category: "all", limit: "5" })
        const response = await fetch(`/api/search/global?${params}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Search failed")
        const payload = await response.json() as GlobalSearchResponse
        if (sequence === requestSequence.current) setResults(previewItems(payload.items || []))
      } catch (error) {
        if ((error as Error).name !== "AbortError" && sequence === requestSequence.current) setResults([])
      } finally {
        if (sequence === requestSequence.current) setIsLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const addToRecentSearches = useCallback((searchQuery: string, type?: string) => {
    const normalized = searchQuery.trim()
    if (!normalized) return
    setRecentSearches(current => {
      const next = [
        { query: normalized, timestamp: Date.now(), type },
        ...current.filter(item => item.query.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)) } catch { /* optional */ }
      return next
    })
  }, [])

  const clearSearch = useCallback(() => {
    requestSequence.current += 1
    setQuery("")
    setResults([])
    setIsOpen(false)
  }, [])

  return {
    query, setQuery, results, isLoading, isOpen, setIsOpen, searchInputRef,
    clearSearch, hasResults: results.length > 0, recentSearches, addToRecentSearches,
  }
}
