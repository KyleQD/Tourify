'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, Users } from 'lucide-react'
import { SuggestedProfileCard } from '@/components/social/suggested-profile-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { resolvePublicProfilePath } from '@/lib/utils/public-profile-routes'
import type { FriendSuggestion } from '@/lib/types/social'

interface SuggestedForYouSectionProps {
  limit?: number
  className?: string
}

interface AllUsersResponse {
  users?: FriendSuggestion[]
  has_more?: boolean
  total_available?: number
  error?: string
}

const FETCH_TIMEOUT_MS = 15000

function mapToSuggestion(user: FriendSuggestion): FriendSuggestion {
  return {
    ...user,
    can_send_request: true,
  }
}

export function SuggestedForYouSection({
  limit = 12,
  className,
}: SuggestedForYouSectionProps) {
  const router = useRouter()
  const [users, setUsers] = useState<FriendSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [connectingUsers, setConnectingUsers] = useState<Set<string>>(new Set())
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchUsers = useCallback(async ({
    nextOffset = 0,
    append = false,
  }: {
    nextOffset?: number
    append?: boolean
  } = {}) => {
    const requestId = ++requestIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, FETCH_TIMEOUT_MS)

    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setIsUnauthorized(false)
    }

    setError(null)

    try {
      const response = await fetch(
        `/api/social/all-users?limit=${limit}&offset=${nextOffset}`,
        {
          credentials: 'same-origin',
          signal: controller.signal,
        }
      )

      if (requestId !== requestIdRef.current) return

      if (response.status === 401) {
        setIsUnauthorized(true)
        setUsers([])
        setHasMore(false)
        setOffset(0)
        setError(null)
        return
      }

      const data = (await response.json().catch(() => ({}))) as AllUsersResponse

      if (!response.ok)
        throw new Error(data.error || `Request failed (${response.status})`)

      const nextUsers = (data.users || []).map(mapToSuggestion)

      setIsUnauthorized(false)
      setUsers((prev) => (append ? [...prev, ...nextUsers] : nextUsers))
      setHasMore(Boolean(data.has_more))
      setOffset(nextOffset + nextUsers.length)
    } catch (err) {
      if (requestId !== requestIdRef.current) return

      if (err instanceof Error && err.name === 'AbortError') {
        // Cleanup/remount aborts are ignored; only real timeouts surface an error.
        if (timedOut) {
          setError('Request timed out. Please try again.')
          if (!append) setUsers([])
        }
        return
      }

      const message = err instanceof Error ? err.message : 'Failed to load users'
      setError(message)
      console.error('Error fetching browse users:', err)
      if (!append) setUsers([])
    } finally {
      clearTimeout(timeoutId)
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [limit])

  useEffect(() => {
    void fetchUsers({ nextOffset: 0, append: false })

    return () => {
      requestIdRef.current += 1
      abortRef.current?.abort()
    }
  }, [fetchUsers])

  async function handleConnect(suggestion: FriendSuggestion) {
    if (connectingUsers.has(suggestion.id)) return
    if (suggestion.outgoing_request?.status === 'pending') return

    setConnectingUsers((prev) => new Set(prev).add(suggestion.id))

    try {
      const response = await fetch('/api/social/follow-request', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          targetUserId: suggestion.id,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setIsUnauthorized(true)
        toast({
          title: 'Sign in required',
          description: 'Please sign in to connect with people.',
          variant: 'destructive',
        })
        return
      }

      if (response.ok) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === suggestion.id
              ? {
                  ...item,
                  can_send_request: false,
                  outgoing_request: { id: 'pending', status: 'pending' as const },
                }
              : item
          )
        )
        toast({
          title: 'Friend Request Sent',
          description: `${suggestion.full_name || suggestion.username} can accept your request.`,
        })
        return
      }

      // Already pending / already following — treat as success for UX
      if (
        response.status === 400 &&
        typeof body.error === 'string' &&
        (body.error.includes('already') || body.error.includes('Already'))
      ) {
        setUsers((prev) =>
          prev.map((item) =>
            item.id === suggestion.id
              ? {
                  ...item,
                  can_send_request: false,
                  outgoing_request: { id: 'pending', status: 'pending' as const },
                }
              : item
          )
        )
        toast({
          title: 'Request already sent',
          description: body.error,
        })
        return
      }

      throw new Error(body.error || 'Failed to send friend request')
    } catch (err) {
      toast({
        title: 'Request Failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setConnectingUsers((prev) => {
        const next = new Set(prev)
        next.delete(suggestion.id)
        return next
      })
    }
  }

  function handleViewProfile(suggestion: FriendSuggestion) {
    const path = resolvePublicProfilePath({
      id: suggestion.id,
      username: suggestion.username,
      account_type: suggestion.account_type,
    })

    if (!path) {
      toast({
        title: 'Profile Unavailable',
        description: 'This profile does not have a public URL yet.',
        variant: 'destructive',
      })
      return
    }

    router.push(path)
  }

  async function handleRefresh() {
    await fetchUsers({ nextOffset: 0, append: false })
    toast({
      title: 'Suggestions Refreshed',
      description: 'People list has been updated.',
    })
  }

  async function handleSeeMore() {
    if (loading || loadingMore || !hasMore) return
    await fetchUsers({ nextOffset: offset, append: true })
  }

  const showLoadingGrid = loading && users.length === 0 && !error && !isUnauthorized
  const showSignedOut = isUnauthorized && !loading
  const showError = Boolean(error) && users.length === 0 && !isUnauthorized
  const showEmpty = !loading && !error && !isUnauthorized && users.length === 0
  const showGrid = users.length > 0 && !isUnauthorized

  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
            <Users className="h-5 w-5 text-purple-400" />
            Suggested for You
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse people you have not connected with yet
          </p>
        </div>

        {!isUnauthorized && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading || loadingMore}
            className="h-8 w-8 text-slate-300 hover:bg-slate-700 hover:text-white"
            aria-label="Refresh suggestions"
          >
            <RefreshCw className={cn('h-4 w-4', (loading || loadingMore) && 'animate-spin')} />
          </Button>
        )}
      </div>

      {showLoadingGrid && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: Math.min(limit, 12) }).map((_, index) => (
            <div
              key={index}
              className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-slate-700" />
                  <Skeleton className="h-3 w-20 bg-slate-700" />
                </div>
              </div>
              <Skeleton className="h-10 w-full bg-slate-700" />
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1 bg-slate-700" />
                <Skeleton className="h-8 flex-1 bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showSignedOut && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-500" />
          <p className="text-slate-300">Sign in to browse people to connect with.</p>
        </div>
      )}

      {showError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4 border-slate-600 text-white hover:bg-slate-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {showEmpty && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-10 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-500 opacity-60" />
          <p className="text-slate-200">No more people to suggest right now.</p>
          <p className="mt-1 text-sm text-slate-400">
            Try searching above or check back later.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-4 border-slate-600 text-white hover:bg-slate-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      )}

      {showGrid && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((suggestion) => (
              <SuggestedProfileCard
                key={suggestion.id}
                suggestion={suggestion}
                isConnecting={connectingUsers.has(suggestion.id)}
                onConnect={handleConnect}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={handleSeeMore}
                disabled={loadingMore}
                className="rounded-xl border-slate-600 text-white hover:bg-slate-700"
              >
                {loadingMore ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-2 h-4 w-4" />
                )}
                See more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
