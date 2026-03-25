import { useState, useEffect, useCallback } from 'react'
import { friendSuggestionService } from '@/lib/services/friend-suggestions'
import type { 
  FriendSuggestion, 
  FriendSuggestionParams, 
  FriendSuggestionResponse 
} from '@/lib/types/social'

interface UseFriendSuggestionsOptions extends FriendSuggestionParams {
  enabled?: boolean
  refetchInterval?: number
}

interface UseFriendSuggestionsReturn {
  suggestions: FriendSuggestion[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalCount: number
  algorithmUsed: string
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  sendConnectionRequest: (userId: string) => Promise<boolean>
  removeSuggestion: (userId: string) => void
}

export function useFriendSuggestions(
  userId: string | null,
  options: UseFriendSuggestionsOptions = {}
): UseFriendSuggestionsReturn {
  const {
    enabled = true,
    refetchInterval,
    ...params
  } = options

  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [algorithmUsed, setAlgorithmUsed] = useState('popular')
  const [currentOffset, setCurrentOffset] = useState(0)

  const fetchSuggestions = useCallback(async (offset = 0, append = false) => {
    if (!userId || !enabled) return

    try {
      setLoading(true)
      setError(null)

      const result = await friendSuggestionService.getSuggestions(userId, {
        ...params,
        offset
      })

      if (append) {
        setSuggestions(prev => [...prev, ...result.suggestions])
      } else {
        setSuggestions(result.suggestions)
      }

      setHasMore(result.has_more)
      setTotalCount(result.total_count)
      setAlgorithmUsed(result.algorithm_used)
      setCurrentOffset(offset + result.suggestions.length)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suggestions'
      setError(errorMessage)
      console.error('Error fetching friend suggestions:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, enabled, params])

  const refetch = useCallback(async () => {
    setCurrentOffset(0)
    await fetchSuggestions(0, false)
  }, [fetchSuggestions])

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchSuggestions(currentOffset, true)
    }
  }, [loading, hasMore, currentOffset, fetchSuggestions])

  const sendConnectionRequest = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false

    try {
      const success = await friendSuggestionService.sendConnectionRequest(userId, targetUserId)
      
      if (success) {
        // Remove the suggestion from the list
        setSuggestions(prev => prev.filter(s => s.id !== targetUserId))
        setTotalCount(prev => Math.max(0, prev - 1))
      }
      
      return success
    } catch (err) {
      console.error('Error sending connection request:', err)
      return false
    }
  }, [userId])

  const removeSuggestion = useCallback((userId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== userId))
    setTotalCount(prev => Math.max(0, prev - 1))
  }, [])

  // Initial fetch
  useEffect(() => {
    if (userId && enabled) {
      fetchSuggestions(0, false)
    }
  }, [userId, enabled, fetchSuggestions])

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(() => {
      refetch()
    }, refetchInterval)

    return () => clearInterval(interval)
  }, [refetchInterval, enabled, refetch])

  return {
    suggestions,
    loading,
    error,
    hasMore,
    totalCount,
    algorithmUsed,
    refetch,
    loadMore,
    sendConnectionRequest,
    removeSuggestion
  }
}

