"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"

interface DataState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface UseOptimizedDataOptions {
  endpoint: string
  ttl?: number // Time to live in milliseconds
  refetchInterval?: number // Auto-refetch interval
  enabled?: boolean // Whether to fetch automatically
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  transform?: (data: any) => any
}

// In-memory cache for data
const dataCache = new Map<string, CacheEntry<any>>()

// Cache management
const getCacheKey = (endpoint: string, params?: Record<string, any>) => {
  const paramString = params ? JSON.stringify(params) : ""
  return `${endpoint}${paramString}`
}

const isCacheValid = (entry: CacheEntry<any>) => {
  return Date.now() - entry.timestamp < entry.ttl
}

const getCachedData = <T>(key: string): T | null => {
  const entry = dataCache.get(key)
  if (entry && isCacheValid(entry)) {
    return entry.data
  }
  if (entry) {
    dataCache.delete(key) // Remove expired cache
  }
  return null
}

const setCachedData = <T>(key: string, data: T, ttl: number) => {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

// Clean up expired cache entries periodically
const cleanupCache = () => {
  const now = Date.now()
  for (const [key, entry] of dataCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      dataCache.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000)

export function useOptimizedData<T = any>({
  endpoint,
  ttl = 5 * 60 * 1000, // 5 minutes default
  refetchInterval,
  enabled = true,
  onSuccess,
  onError,
  transform
}: UseOptimizedDataOptions) {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  })

  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize callbacks to prevent infinite loops
  const memoizedOnSuccess = useCallback(onSuccess || (() => {}), [onSuccess])
  const memoizedOnError = useCallback(onError || (() => {}), [onError])
  const memoizedTransform = useCallback(transform || ((data: any) => data), [transform])

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    endpoint,
    ttl,
    enabled
  }), [endpoint, ttl, enabled])

  const fetchData = useCallback(async (params?: Record<string, any>) => {
    if (!memoizedOptions.enabled) return

    const cacheKey = getCacheKey(memoizedOptions.endpoint, params)
    const cachedData = getCachedData<T>(cacheKey)

    if (cachedData) {
      setState(prev => ({
        ...prev,
        data: cachedData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      }))
      memoizedOnSuccess(cachedData)
      return
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const url = new URL(memoizedOptions.endpoint, window.location.origin)
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }

      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        credentials: 'include', // Include auth cookies
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.json()
      const transformedData = memoizedTransform(rawData)

      // Cache the data
      setCachedData(cacheKey, transformedData, memoizedOptions.ttl)

      setState({
        data: transformedData,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

      memoizedOnSuccess(transformedData)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))

      memoizedOnError(errorMessage)
    }
  }, [memoizedOptions, memoizedOnSuccess, memoizedOnError, memoizedTransform])

  const refetch = useCallback((params?: Record<string, any>) => {
    const cacheKey = getCacheKey(memoizedOptions.endpoint, params)
    dataCache.delete(cacheKey)
    return fetchData(params)
  }, [memoizedOptions.endpoint, fetchData])

  const invalidateCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Invalidate cache entries matching pattern
      for (const key of dataCache.keys()) {
        if (key.includes(pattern)) {
          dataCache.delete(key)
        }
      }
    } else {
      // Clear all cache
      dataCache.clear()
    }
  }, [])

  // Set up auto-refetch interval - FIXED: removed problematic dependencies
  useEffect(() => {
    if (refetchInterval && memoizedOptions.enabled) {
      intervalRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [refetchInterval, memoizedOptions.enabled]) // Removed fetchData from dependencies

  // Initial fetch - FIXED: removed problematic dependencies
  useEffect(() => {
    if (memoizedOptions.enabled) {
      fetchData()
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [memoizedOptions.enabled]) // Removed fetchData from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    ...state,
    refetch,
    invalidateCache,
    isStale: state.lastUpdated ? Date.now() - state.lastUpdated.getTime() > memoizedOptions.ttl : true
  }
}

// Specialized hooks for common data types
export function useDashboardStats() {
  return useOptimizedData({
    endpoint: '/api/admin/dashboard/stats',
    ttl: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // 30 seconds
    transform: (data) => data.stats
  })
}

export function useToursData() {
  return useOptimizedData({
    endpoint: '/api/admin/tours',
    ttl: 5 * 60 * 1000, // 5 minutes
    transform: (data) => data.tours
  })
}

export function useEventsData() {
  return useOptimizedData({
    endpoint: '/api/admin/events',
    ttl: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 60 * 1000, // 1 minute
    transform: (data) => data.events
  })
}

export function useArtistsData() {
  return useOptimizedData({
    endpoint: '/api/admin/artists',
    ttl: 10 * 60 * 1000, // 10 minutes
    transform: (data) => data.artists
  })
}

export function useVenuesData() {
  return useOptimizedData({
    endpoint: '/api/admin/venues',
    ttl: 10 * 60 * 1000, // 10 minutes
    transform: (data) => data.venues
  })
}

export function useNotificationsData() {
  return useOptimizedData({
    endpoint: '/api/admin/notifications',
    ttl: 1 * 60 * 1000, // 1 minute
    refetchInterval: 15 * 1000, // 15 seconds
    transform: (data) => data.notifications
  })
} 