'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAdminActingRequest } from '@/hooks/use-admin-acting-request'
import type { AdminLogisticsOverview, LogisticsOverviewDomain, LogisticsAttentionSeverity } from '@/lib/admin/logistics-overview'

export interface LogisticsOverviewFilters {
  from?: string
  to?: string
  search?: string
  tourId?: string
  eventId?: string
  domain?: LogisticsOverviewDomain[]
  severity?: LogisticsAttentionSeverity[]
  ownerId?: string
  attentionOnly?: boolean
  limit?: number
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function useLogisticsOverview(filters: LogisticsOverviewFilters = {}) {
  const { adminFetch, actingContextKey, isAdminReady } = useAdminActingRequest()
  const contextRef = useRef(actingContextKey)
  contextRef.current = actingContextKey
  const [data, setData] = useState<AdminLogisticsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.search) params.set('search', filters.search)
    if (filters.tourId) params.set('tourId', filters.tourId)
    if (filters.eventId) params.set('eventId', filters.eventId)
    if (filters.domain?.length) params.set('domain', filters.domain.join(','))
    if (filters.severity?.length) params.set('severity', filters.severity.join(','))
    if (filters.ownerId) params.set('ownerId', filters.ownerId)
    if (filters.attentionOnly) params.set('attentionOnly', 'true')
    if (filters.limit) params.set('limit', String(filters.limit))
    return params.toString()
  }, [
    filters.attentionOnly,
    filters.domain,
    filters.eventId,
    filters.from,
    filters.limit,
    filters.ownerId,
    filters.search,
    filters.severity,
    filters.to,
    filters.tourId,
  ])

  const refresh = useCallback(async () => {
    if (!isAdminReady) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    const requestContextKey = actingContextKey
    setData(null)
    setError(null)
    setLoading(true)
    try {
      const response = await adminFetch(`/api/admin/logistics/overview${query ? `?${query}` : ''}`)
      const payload = await response.json()
      if (contextRef.current !== requestContextKey) return
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load logistics overview.')
      setData(payload.data)
    } catch (requestError) {
      if (contextRef.current !== requestContextKey || isAbortError(requestError)) return
      setError(requestError instanceof Error ? requestError.message : 'Unable to load logistics overview.')
    } finally {
      if (contextRef.current === requestContextKey) setLoading(false)
    }
  }, [actingContextKey, adminFetch, isAdminReady, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, isAdminReady, refresh }
}

