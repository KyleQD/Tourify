'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  AdminCalendarFilters,
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarResponse,
  AdminCalendarSummary,
} from '@/lib/admin/calendar/types'

interface UseAdminCalendarArgs {
  startDate: string
  endDate: string
  types?: AdminCalendarKind[]
  status?: string
  enabled?: boolean
}

interface UseAdminCalendarResult {
  items: AdminCalendarItem[]
  summary: AdminCalendarSummary | null
  orgId: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  filters: AdminCalendarFilters | null
}

const EMPTY_SUMMARY: AdminCalendarSummary = {
  event: 0,
  tour: 0,
  task: 0,
  shift: 0,
  production: 0,
  hiring: 0,
}

export function useAdminCalendar(args: UseAdminCalendarArgs): UseAdminCalendarResult {
  const { startDate, endDate, types, status, enabled = true } = args
  const [items, setItems] = useState<AdminCalendarItem[]>([])
  const [summary, setSummary] = useState<AdminCalendarSummary | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [filters, setFilters] = useState<AdminCalendarFilters | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })
      if (types && types.length > 0) params.set('types', types.join(','))
      if (status) params.set('status', status)

      const response = await fetch(`/api/admin/calendar?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to load calendar (${response.status})`)
      }

      const data = await response.json() as AdminCalendarResponse
      setItems(data.items || [])
      setSummary(data.summary || EMPTY_SUMMARY)
      setOrgId(data.orgId ?? null)
      setFilters(data.filters || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      setItems([])
      setSummary(EMPTY_SUMMARY)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, endDate, startDate, status, types])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    items,
    summary,
    orgId,
    isLoading,
    error,
    refetch,
    filters,
  }
}
