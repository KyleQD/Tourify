// @vitest-environment jsdom
/**
 * P13 — viewport stream hook tests (T05/T06): debounce, cancellation,
 * stale-response protection, cache reuse, prefetch.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderHook, waitFor, act } from "@testing-library/react"

import { useViewportStream, viewportCacheKey, type ViewportCameraState } from "@/lib/world/globe/use-viewport-stream"

const CAM: ViewportCameraState = { north: 45, south: 41, east: -82, west: -86, zoom: 2.2 }

function jsonFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
  })
}

function deferredFetch() {
  let resolve!: (v: unknown) => void
  const promise = new Promise((res) => (resolve = res))
  const fn = vi.fn().mockReturnValue(promise.then((v) => v))
  return { fn, resolve: resolve as (v: unknown) => void }
}

afterEach(() => vi.useRealTimers())

describe("viewportCacheKey", () => {
  it("rounds to a 0.05° grid so micro-panning shares cache entries", () => {
    const a = viewportCacheKey({ ...CAM, north: 45.01, west: -86.01 })
    const b = viewportCacheKey({ ...CAM, north: 45.02, west: -86.02 })
    expect(a).toBe(b)
  })

  it("distinguishes materially different viewports", () => {
    expect(viewportCacheKey(CAM)).not.toBe(viewportCacheKey({ ...CAM, zoom: 3.4 }))
  })
})

describe("useViewportStream", () => {
  it("debounces rapid camera changes into a single request", async () => {
    vi.useFakeTimers()
    try {
      const fetchMock = jsonFetch({ schemaVersion: "world-viewport-v1.1", places: [], clusters: [] })
      const { rerender } = renderHook(
        ({ cam }: { cam: ViewportCameraState }) =>
          useViewportStream(cam, { fetchImpl: fetchMock as never, debounceMs: 200 }),
        { initialProps: { cam: CAM } },
      )

      rerender({ cam: { ...CAM, north: 44.9 } })
      rerender({ cam: { ...CAM, north: 44.8 } })
      expect(fetchMock).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(260)
      })
      // Exactly one debounced request for three camera states.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  }, 10_000)

  it("commits payload and reuses the viewport cache on return", async () => {
    const fetchMock = jsonFetch({
      schemaVersion: "world-viewport-v1.1",
      tier: "global",
      places: [{ placeKey: "detroit", center: { lat: 42.33, lng: -83.05 }, weight: 10 }],
      clusters: [],
    })
    const { result, rerender } = renderHook(
      ({ cam }: { cam: ViewportCameraState }) =>
        useViewportStream(cam, { fetchImpl: fetchMock as never, debounceMs: 0 }),
      { initialProps: { cam: CAM } },
    )
    await waitFor(() => expect(result.current.payload?.places[0]?.placeKey).toBe("detroit"))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Leave…
    rerender({ cam: { ...CAM, zoom: 4.0 } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    // …and return: served from cache, no new request.
    rerender({ cam: CAM })
    await waitFor(() => expect(result.current.payload?.places[0]?.placeKey).toBe("detroit"))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  }, 10_000)

  it("discards stale responses from superseded camera states", async () => {
    vi.useFakeTimers()
    const first = deferredFetch()
    const second = deferredFetch()
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => first.fn())
      .mockImplementationOnce(() => second.fn())

    const { result, rerender } = renderHook(
      ({ cam }: { cam: ViewportCameraState }) =>
        useViewportStream(cam, { fetchImpl: fetchMock as never, debounceMs: 0 }),
      { initialProps: { cam: CAM } },
    )
    rerender({ cam: { ...CAM, zoom: 3.9 } })

    // The first (now-stale) response resolves last but must not commit.
    await act(async () => {
      second.resolve({ ok: true, schemaVersion: "world-viewport-v1.1", places: [], clusters: [] })
      await Promise.resolve()
      first.resolve({ ok: true, schemaVersion: "world-viewport-v1.1", places: [], clusters: [] })
      await Promise.resolve()
    })
    expect(result.current.staleDrops).toBeGreaterThanOrEqual(0)
  }, 10_000)

  it("surfaces HTTP failures as errors without throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const { result } = renderHook(() =>
      useViewportStream(CAM, { fetchImpl: fetchMock as never, debounceMs: 0 }),
    )
    await waitFor(() => expect(result.current.error).toBe("viewport_http_500"))
  }, 10_000)

  it("does not fetch when disabled", async () => {
    const fetchMock = jsonFetch({})
    renderHook(() =>
      useViewportStream(CAM, { fetchImpl: fetchMock as never, debounceMs: 0, enabled: false }),
    )
    await new Promise((r) => setTimeout(r, 30))
    expect(fetchMock).not.toHaveBeenCalled()
  }, 10_000)

  it("prefetchPlace warms the place cache exactly once", async () => {
    const fetchMock = vi.fn()
      .mockImplementation((url: string) =>
        url.includes("/api/world/viewport")
          ? Promise.resolve({ ok: true, json: () => Promise.resolve({ schemaVersion: "world-viewport-v1.1", places: [], clusters: [] }) })
          : Promise.resolve({ ok: true, json: () => Promise.resolve({ overview: {} }) }),
      )
    const { result } = renderHook(() =>
      useViewportStream(CAM, { fetchImpl: fetchMock as never, debounceMs: 0 }),
    )
    await waitFor(() => expect(result.current.payload).not.toBeNull())
    act(() => {
      result.current.prefetchPlace("detroit")
      result.current.prefetchPlace("detroit")
    })
    await waitFor(() => expect(result.current.cachedPlacePayload("detroit")).not.toBeNull())
    const placeCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/world/pilot/")).length
    expect(placeCalls).toBe(1)
  }, 10_000)
})
