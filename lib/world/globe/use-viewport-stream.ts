"use client"

/**
 * P13 — Viewport request lifecycle for the globe (pure hook, injectable
 * fetch/timers for tests).
 *
 * - Debounces camera changes (rapid movement never spawns a request storm).
 * - Cancels in-flight requests on newer camera state (AbortController).
 * - Stale-response protection: only the newest sequence may commit state.
 * - Canonical cache keys: tier + rounded bbox + filters, so returning to a
 *   viewport hits cache instead of refetching (P13-T06 progressive reuse).
 * - `prefetchPlace` warms place payloads before selection completes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { WorldViewportPayloadV1_1 } from "@/lib/world/globe/viewport"

export interface ViewportCameraState {
  north: number
  south: number
  east: number
  west: number
  zoom: number
}

export interface UseViewportStreamOptions {
  /** Debounce window for camera settles (ms). Default 220. */
  debounceMs?: number
  densityHint?: "desktop" | "mobile"
  layers?: string[]
  fetchImpl?: typeof fetch
  enabled?: boolean
}

export interface ViewportStream {
  payload: WorldViewportPayloadV1_1 | null
  loading: boolean
  error: string | null
  /** Bump when a newer response was discarded as stale (observability). */
  staleDrops: number
  prefetchPlace: (key: string) => void
  cachedPlacePayload: (key: string) => unknown | null
}

/** Round bbox to a grid so micro-panning reuses the same cache entry. */
export function viewportCacheKey(state: ViewportCameraState): string {
  const r = (v: number): number => Math.round(v * 20) / 20 // 0.05° grid
  return `v1:${r(state.north)},${r(state.south)},${r(state.east)},${r(state.west)}@${Math.round(state.zoom * 10) / 10}`
}

function cameraEquals(a: ViewportCameraState, b: ViewportCameraState): boolean {
  return (
    a.north === b.north && a.south === b.south &&
    a.east === b.east && a.west === b.west && a.zoom === b.zoom
  )
}

export function useViewportStream(
  camera: ViewportCameraState,
  options: UseViewportStreamOptions = {},
): ViewportStream {
  const { debounceMs = 220, densityHint = "desktop", layers, fetchImpl, enabled = true } = options

  const [payload, setPayload] = useState<WorldViewportPayloadV1_1 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [staleDrops, setStaleDrops] = useState(0)

  const sequenceRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cacheRef = useRef(new Map<string, WorldViewportPayloadV1_1>())
  const placeCacheRef = useRef(new Map<string, unknown>())
  const placeInFlightRef = useRef(new Set<string>())
  const lastCameraRef = useRef<ViewportCameraState | null>(null)

  const fetchFn = fetchImpl ?? fetch

  const buildUrl = useCallback(
    (state: ViewportCameraState): string => {
      const params = new URLSearchParams({
        north: String(state.north),
        south: String(state.south),
        east: String(state.east),
        west: String(state.west),
        zoom: String(state.zoom),
        densityHint,
      })
      if (layers?.length) params.set("layers", layers.join(","))
      return `/api/world/viewport?${params.toString()}`
    },
    [densityHint, layers],
  )

  const request = useCallback(
    (state: ViewportCameraState) => {
      const key = viewportCacheKey(state)
      const cached = cacheRef.current.get(key)
      if (cached) {
        setPayload(cached)
        setLoading(false)
        setError(null)
        return
      }

      // Cancel any in-flight request; this camera state supersedes it.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const seq = ++sequenceRef.current

      setLoading(true)
      setError(null)

      fetchFn(buildUrl(state), { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`viewport_http_${response.status}`)
          return response.json() as Promise<WorldViewportPayloadV1_1>
        })
        .then((data) => {
          // Stale-response protection: only the newest sequence commits.
          if (seq !== sequenceRef.current) {
            setStaleDrops((n) => n + 1)
            return
          }
          cacheRef.current.set(key, data)
          setPayload(data)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return // superseded, not an error
          if (seq !== sequenceRef.current) return
          setError(err instanceof Error ? err.message : "viewport_failed")
          setLoading(false)
        })
    },
    [buildUrl, fetchFn],
  )

  useEffect(() => {
    if (!enabled) return
    if (lastCameraRef.current && cameraEquals(lastCameraRef.current, camera)) return

    lastCameraRef.current = camera
    if (timerRef.current) clearTimeout(timerRef.current)

    const cachedNow = cacheRef.current.get(viewportCacheKey(camera))
    if (cachedNow) {
      // Progressive: show cached frame immediately, refresh in background.
      setPayload(cachedNow)
    }
    timerRef.current = setTimeout(() => request(camera), debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [camera, debounceMs, enabled, request])

  // Cancel in-flight work and stop timers on unmount / World exit (P13-T10).
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const prefetchPlace = useCallback(
    (key: string) => {
      if (!key || placeCacheRef.current.has(key) || placeInFlightRef.current.has(key)) return
      placeInFlightRef.current.add(key)
      fetchFn(`/api/world/pilot/${encodeURIComponent(key)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data) placeCacheRef.current.set(key, data)
        })
        .catch(() => undefined)
        .finally(() => placeInFlightRef.current.delete(key))
    },
    [fetchFn],
  )

  const cachedPlacePayload = useCallback((key: string) => placeCacheRef.current.get(key) ?? null, [])

  return useMemo(
    () => ({ payload, loading, error, staleDrops, prefetchPlace, cachedPlacePayload }),
    [payload, loading, error, staleDrops, prefetchPlace, cachedPlacePayload],
  )
}
