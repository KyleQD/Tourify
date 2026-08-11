'use client'

import { useCallback, useEffect, useState } from 'react'
import { useActingContext } from '@/hooks/use-acting-context'
import type {
  AdminCalendarContext,
  AdminCalendarFilters,
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarResponse,
  AdminCalendarScopeMode,
  AdminCalendarSourceHealth,
  AdminCalendarSummary,
} from '@/lib/admin/calendar/types'

interface UseAdminCalendarArgs {
  startDate: string
  endDate: string
  types?: AdminCalendarKind[]
  status?: string
  scope?: AdminCalendarScopeMode | null
  tourId?: string | null
  eventId?: string | null
  enabled?: boolean
}

interface UseAdminCalendarResult {
  items: AdminCalendarItem[]
  summary: AdminCalendarSummary | null
  context: AdminCalendarContext | null
  orgId: string | null
  sources: AdminCalendarSourceHealth[]
  isDegraded: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  filters: AdminCalendarFilters | null
  isActingReady: boolean
}

const EMPTY_SUMMARY: AdminCalendarSummary = {
  event: 0,
  tour: 0,
  task: 0,
  shift: 0,
  production: 0,
  hiring: 0,
  travel: 0,
}

export function useAdminCalendar(args: UseAdminCalendarArgs): UseAdminCalendarResult {
  const {
    startDate,
    endDate,
    types,
    status,
    scope,
    tourId,
    eventId,
    enabled = true,
  } = args
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const [items, setItems] = useState<AdminCalendarItem[]>([])
  const [summary, setSummary] = useState<AdminCalendarSummary | null>(null)
  const [context, setContext] = useState<AdminCalendarContext | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [sources, setSources] = useState<AdminCalendarSourceHealth[]>([])
  const [isDegraded, setIsDegraded] = useState(false)
  const [filters, setFilters] = useState<AdminCalendarFilters | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!isActingReady || !enabled) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })
      if (types && types.length > 0) params.set('types', types.join(','))
      if (status) params.set('status', status)
      if (scope) params.set('scope', scope)
      if (tourId) params.set('tourId', tourId)
      if (eventId) params.set('eventId', eventId)

      const response = await fetch(`/api/admin/calendar?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', ...actingHeaders },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to load calendar (${response.status})`)
      }

      const data = await response.json() as AdminCalendarResponse
      setItems(data.items || [])
      setSummary(data.summary || EMPTY_SUMMARY)
      setContext(data.context || null)
      setOrgId(data.orgId ?? null)
      setSources(data.sources || [])
      setIsDegraded(Boolean(data.isDegraded))
      setFilters(data.filters || null)
      // CAL-101: partial success with degraded sources is not a total empty failure
      if (data.isDegraded) {
        const degradedNames = (data.sources || [])
          .filter((s) => s.status === 'degraded')
          .map((s) => s.id)
          .join(', ')
        setError(degradedNames
          ? `Some calendar sources are unavailable: ${degradedNames}`
          : 'Some calendar sources are unavailable')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      // Keep prior items on hard failure? Spec: don't collapse successful partial as empty.
      // Only clear when the request itself fails.
      setItems([])
      setSummary(EMPTY_SUMMARY)
      setContext(null)
      setSources([])
      setIsDegraded(false)
    } finally {
      setIsLoading(false)
    }
  }, [isActingReady, actingHeaders, actingContextKey, enabled, endDate, eventId, scope, startDate, status, tourId, types])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    items,
    summary,
    context,
    orgId,
    sources,
    isDegraded,
    isLoading,
    error,
    refetch,
    filters,
    isActingReady,
  }
}
