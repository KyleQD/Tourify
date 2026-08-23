"use client"

/**
 * useCanonicalPlaceSearch — P4-T01 search behavior, isolated from the
 * component for testability. Debounced, abortable, injectable fetch.
 */
import { useEffect, useRef, useState } from "react"

export interface PlaceSearchItem {
  id: string
  canonicalPath: string
  name: string
  displayName: string | null
  placeType: string
  countryCode: string | null
  matchedVia: "name" | "alias"
}

export interface PlaceSearchState {
  items: PlaceSearchItem[]
  loading: boolean
  error: string | null
}

export function useCanonicalPlaceSearch(
  query: string,
  opts?: { debounceMs?: number; fetchImpl?: typeof fetch; minLength?: number },
): PlaceSearchState {
  const debounceMs = opts?.debounceMs ?? 300
  const minLength = opts?.minLength ?? 2
  const fetchImpl = opts?.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...(a as [RequestInfo, RequestInit?])))
  const [state, setState] = useState<PlaceSearchState>({ items: [], loading: false, error: null })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < minLength) {
      abortRef.current?.abort()
      setState({ items: [], loading: false, error: null })
      return
    }
    let cancelled = false
    const controller = new AbortController()
    abortRef.current = controller
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const timer = setTimeout(async () => {
      try {
        const res = await fetchImpl(
          `/api/world/places/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        )
        if (cancelled) return
        if (!res.ok) {
          setState({ items: [], loading: false, error: `search failed (${res.status})` })
          return
        }
        const data = (await res.json()) as { items?: PlaceSearchItem[] }
        if (cancelled) return
        setState({ items: data.items ?? [], loading: false, error: null })
      } catch (error) {
        if (cancelled || (error as Error)?.name === "AbortError") return
        setState({ items: [], loading: false, error: "search failed" })
      }
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, debounceMs, minLength, fetchImpl])

  return state
}
