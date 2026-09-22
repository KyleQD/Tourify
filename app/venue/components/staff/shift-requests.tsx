'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, User, Calendar, Clock } from 'lucide-react'

interface ShiftRequestsProps {
  venueId: string
}

interface SwapRow {
  id: string
  requested_at: string | null
  swap_reason: string | null
  status?: string | null
}

interface RequestRow {
  id: string
  request_type?: string | null
  request_status: string
  requested_at?: string | null
  reason?: string | null
  staff_member_id?: string | null
}

/**
 * VEN-115 — swap/drop/pickup requests wired to the canonical worker-request
 * APIs (/api/venue/shifts/swaps + /requests). Read-only triage view; approve/
 * deny transitions land with the scoped authorization RPCs (VEN-115 phase 2).
 */
export function ShiftRequests({ venueId }: ShiftRequestsProps) {
  const [swaps, setSwaps] = useState<SwapRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!venueId) return
    setIsRefreshing(true)
    setError(null)
    try {
      const [swapsRes, requestsRes] = await Promise.all([
        fetch(`/api/venue/shifts/swaps?venue_id=${encodeURIComponent(venueId)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`/api/venue/shifts/requests?venue_id=${encodeURIComponent(venueId)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      const swapsJson = await swapsRes.json().catch(() => null)
      const requestsJson = await requestsRes.json().catch(() => null)

      if (!swapsRes.ok) throw new Error(swapsJson?.error || 'Failed to load shift swaps')
      if (!requestsRes.ok) throw new Error(requestsJson?.error || 'Failed to load shift requests')

      setSwaps(Array.isArray(swapsJson?.data) ? swapsJson.data : [])
      setRequests(Array.isArray(requestsJson?.data) ? requestsJson.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  const total = swaps.length + requests.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shift Requests</h3>
          <p className="text-sm text-muted-foreground">
            Swap, drop, and pickup requests from your roster
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && total === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No pending swap or pickup requests.
          </CardContent>
        </Card>
      )}

      {swaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Swaps ({swaps.length})
          </p>
          {swaps.map((swap) => (
            <Card key={swap.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Swap request</CardTitle>
                  <Badge variant="secondary">{swap.status ?? 'pending'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {swap.swap_reason && (
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-3.5 w-3.5" />
                    <span>{swap.swap_reason}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Requested {swap.requested_at ? new Date(swap.requested_at).toLocaleDateString() : '—'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pickup / drop ({requests.length})
          </p>
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm capitalize">
                    {request.request_type || 'shift'} request
                  </CardTitle>
                  <Badge
                    variant={
                      request.request_status === 'approved'
                        ? 'default'
                        : request.request_status === 'denied'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {request.request_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                {request.reason && <p>{request.reason}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
