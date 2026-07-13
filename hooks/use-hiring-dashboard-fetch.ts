"use client"

import { useCallback, useEffect, useState } from "react"
import type { HiringDashboardApiResponse } from "@/types/hiring-dashboard"

interface UseHiringDashboardFetchArgs<TData> {
  url: string
  enabled?: boolean
  initialData: TData
}

interface UseHiringDashboardFetchResult<TData> {
  data: TData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function getResponseData<TData>(payload: HiringDashboardApiResponse<TData> | TData, fallback: TData): TData {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as HiringDashboardApiResponse<TData>).data ?? fallback
  }

  return (payload as TData) ?? fallback
}

function getResponseError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const error = (payload as { error?: unknown }).error
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }

  const message = (payload as { message?: unknown }).message
  if (typeof message === "string") return message

  return null
}

export function useHiringDashboardFetch<TData>({
  url,
  enabled = true,
  initialData,
}: UseHiringDashboardFetchArgs<TData>): UseHiringDashboardFetchResult<TData> {
  const [data, setData] = useState<TData>(initialData)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async function refetchHiringDashboardData() {
    if (!enabled || !url) return

    setIsLoading(true)
    setError(null)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message = getResponseError(payload) || "Failed to load hiring data."
      setError(message)
      setIsLoading(false)
      return
    }

    setData(getResponseData<TData>(payload, initialData))
    setIsLoading(false)
  }, [enabled, initialData, url])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
