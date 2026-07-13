import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export interface SearchResult {
  id: string
  username: string
  account_type: 'artist' | 'venue' | 'general'
  profile_data?: any
  avatar_url?: string
  verified?: boolean
  bio?: string
  location?: string
  stats?: {
    followers?: number
    following?: number
  }
}

interface SearchResponse {
  artists: SearchResult[]
  venues: SearchResult[]
  users: SearchResult[]
  total: number
}

interface RecentSearch {
  query: string
  timestamp: number
  type?: string
}

interface UseEnhancedSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  searchInputRef: React.RefObject<HTMLInputElement>
  clearSearch: () => void
  hasResults: boolean
  recentSearches: RecentSearch[]
  addToRecentSearches: (query: string, type?: string) => void
  clearRecentSearches: () => void
}

const RECENT_SEARCHES_KEY = 'tourify-recent-searches'
const MAX_RECENT_SEARCHES = 5

export function useEnhancedSearch(): UseEnhancedSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES))
      }
    } catch (error) {
      console.error('Error loading recent searches:', error)
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearches = useCallback((searches: RecentSearch[]) => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
    } catch (error) {
      console.error('Error saving recent searches:', error)
    }
  }, [])

  const addToRecentSearches = useCallback((searchQuery: string, type?: string) => {
    if (!searchQuery.trim()) return

    setRecentSearches(prev => {
      // Remove existing search if it exists
      const filtered = prev.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase())
      
      // Add new search at the beginning
      const newSearches = [
        { query: searchQuery, timestamp: Date.now(), type },
        ...filtered
      ].slice(0, MAX_RECENT_SEARCHES)

      saveRecentSearches(newSearches)
      return newSearches
    })
  }, [saveRecentSearches])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }, [])

  const searchAccounts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: 'all',
        limit: '6' // Optimal for dropdown display
      })
      
      // Prefer account-aware enhanced search (includes organizations + accountId)
      const response = await fetch(`/api/search/enhanced?${params}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data: any = await response.json()
      
      let allResults: SearchResult[] = []
      
      if (Array.isArray(data.results)) {
        allResults = data.results.map((row: any) => ({
          id: String(row.id),
          username: String(row.urlSlug || row.username || ''),
          account_type: row.type === 'organization' ? 'organization' : row.type === 'venue' ? 'venue' : row.type === 'artist' ? 'artist' : 'general',
          display_name: row.displayName,
          avatar_url: row.avatar,
          verified: row.verified,
          bio: row.bio,
          location: row.location,
          accountId: row.accountId,
          ownerUserId: row.ownerUserId,
        }))
      } else if (data.results) {
        allResults = [
          ...data.results.artists || [],
          ...data.results.venues || [],
          ...data.results.users || [],
          ...data.results.organizations || [],
        ]
      }
      
      setResults(allResults)
    } catch (error) {
      console.error('Account search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    searchAccounts(debouncedQuery)
  }, [debouncedQuery, searchAccounts])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    searchInputRef,
    clearSearch,
    hasResults: results.length > 0,
    recentSearches,
    addToRecentSearches,
    clearRecentSearches
  }
}