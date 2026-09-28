"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { buildNoStoreHiringRequestInit, readHiringJson } from "@/lib/api/hiring-client"

interface UseHiringDashboardFetchArgs<TData> {
  url: string
  enabled?: boolean
  initialData: TData
  refreshIntervalMs?: number
  refreshOnFocus?: boolean
}

interface UseHiringDashboardFetchResult<TData> {
  data: TData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useHiringDashboardFetch<TData>({
  url,
  enabled = true,
  initialData,
  refreshIntervalMs,
  refreshOnFocus = false,
}: UseHiringDashboardFetchArgs<TData>): UseHiringDashboardFetchResult<TData> {
  const isMountedRef = useRef(false)
  const [data, setData] = useState<TData>(initialData)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async function refetchHiringDashboardData(signal?: AbortSignal) {
    if (!enabled || !url) {
      if (isMountedRef.current) setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await readHiringJson<TData>(
      url,
      buildNoStoreHiringRequestInit({
        method: "GET",
        signal,
      }),
      {
        fallbackData: initialData,
        fallbackErrorMessage: "Failed to load hiring data.",
      }
    )

    if (!isMountedRef.current || (!result.ok && result.error.code === "aborted")) return

    if (!result.ok) {
      setError(result.error.message)
      setIsLoading(false)
      return
    }

    setData(result.data)
    setIsLoading(false)
  }, [enabled, initialData, url])

  useEffect(() => {
    const controller = new AbortController()

    void refetch(controller.signal)

    return () => {
      controller.abort()
    }
  }, [refetch])

  useEffect(() => {
    if (!enabled || !refreshIntervalMs || refreshIntervalMs < 1) return

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetch()
    }, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [enabled, refreshIntervalMs, refetch])

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return

    const handleFocus = () => void refetch()
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refetch()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [enabled, refreshOnFocus, refetch])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
