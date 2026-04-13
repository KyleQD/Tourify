import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  FriendSuggestion,
  FriendSuggestionParams,
  FriendSuggestionResponse,
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

function buildSuggestionsSearchParams(
  params: FriendSuggestionParams,
  offset: number,
): string {
  const sp = new URLSearchParams()
  sp.set('limit', String(params.limit ?? 10))
  sp.set('offset', String(offset))
  if (params.exclude_user_ids?.length)
    sp.set('exclude_user_ids', params.exclude_user_ids.join(','))
  if (params.include_mutual_friends === false) sp.set('include_mutual_friends', 'false')
  if (params.algorithm) sp.set('algorithm', params.algorithm)
  if (params.location) sp.set('location', params.location)
  if (params.min_followers != null) sp.set('min_followers', String(params.min_followers))
  if (params.max_followers != null) sp.set('max_followers', String(params.max_followers))
  return sp.toString()
}

async function fetchSuggestionsFromApi(
  params: FriendSuggestionParams,
  offset: number,
): Promise<FriendSuggestionResponse> {
  const qs = buildSuggestionsSearchParams(params, offset)
  const res = await fetch(`/api/social/suggestions?${qs}`, { credentials: 'same-origin' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new Error(body?.error || body?.details || `Request failed (${res.status})`)
  return body as FriendSuggestionResponse
}

async function postConnectionRequest(targetUserId: string): Promise<boolean> {
  const res = await fetch('/api/social/simple-connection-request', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_user_id: targetUserId }),
  })
  if (res.status === 409) return false
  return res.ok
}

export function useFriendSuggestions(
  userId: string | null,
  options: UseFriendSuggestionsOptions = {},
): UseFriendSuggestionsReturn {
  const { enabled = true, refetchInterval, ...params } = options
  const paramsKey = useMemo(() => JSON.stringify(params), [params])

  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [algorithmUsed, setAlgorithmUsed] = useState('popular')
  const [currentOffset, setCurrentOffset] = useState(0)

  const fetchSuggestions = useCallback(
    async (offset = 0, append = false) => {
      if (!userId || !enabled) return

      try {
        setLoading(true)
        setError(null)

        const result = await fetchSuggestionsFromApi(params, offset)

        if (append) setSuggestions((prev) => [...prev, ...result.suggestions])
        else setSuggestions(result.suggestions)

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
    },
    // paramsKey keeps fetch stable when primitive option fields do not change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params serialized via paramsKey
    [userId, enabled, paramsKey],
  )

  const refetch = useCallback(async () => {
    setCurrentOffset(0)
    await fetchSuggestions(0, false)
  }, [fetchSuggestions])

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) await fetchSuggestions(currentOffset, true)
  }, [loading, hasMore, currentOffset, fetchSuggestions])

  const sendConnectionRequest = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!userId) return false

      try {
        const success = await postConnectionRequest(targetUserId)

        if (success) {
          setSuggestions((prev) => prev.filter((s) => s.id !== targetUserId))
          setTotalCount((prev) => Math.max(0, prev - 1))
        }

        return success
      } catch (err) {
        console.error('Error sending connection request:', err)
        return false
      }
    },
    [userId],
  )

  const removeSuggestion = useCallback((removeId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== removeId))
    setTotalCount((prev) => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    if (userId && enabled) void fetchSuggestions(0, false)
  }, [userId, enabled, fetchSuggestions])

  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(() => {
      void refetch()
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
    removeSuggestion,
  }
}
