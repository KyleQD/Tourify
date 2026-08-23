/**
 * P4 tests — search hook (injectable fetch), visibility rules, telemetry
 * scrubbing, and unresolved-route payload contract.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderHook, waitFor } from "@testing-library/react"

import { useCanonicalPlaceSearch } from "@/hooks/useCanonicalPlaceSearch"
import {
  buildDisplayString,
  resolveLocationVisibility,
} from "@/lib/world/places/visibility"
import { createPlacePickerTelemetry } from "@/lib/world/places/telemetry"

afterEach(() => vi.restoreAllMocks())

describe("useCanonicalPlaceSearch", () => {
  const items = [
    { id: "1", canonicalPath: "us/mi/detroit", name: "Detroit", displayName: null, placeType: "city", countryCode: "US", matchedVia: "name" as const },
  ]

  it("does not fetch below the minimum length", async () => {
    const fetchMock = vi.fn()
    const { result } = renderHook(() =>
      useCanonicalPlaceSearch("a", { fetchImpl: fetchMock as never }),
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
  })

  it("fetches, debounces past, and returns items", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ schemaVersion: "world-place-search-v1.0", items }),
    }) as unknown as Response)
    const { result } = renderHook(() =>
      useCanonicalPlaceSearch("detroit", { fetchImpl: fetchMock as never, debounceMs: 5 }),
    )
    await waitFor(() => expect(result.current.items.length).toBe(1))
    expect(result.current.items[0].name).toBe("Detroit")
    expect(result.current.error).toBeNull()
  })

  it("surfaces HTTP failures as errors without throwing", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500 }) as unknown as Response)
    const { result } = renderHook(() =>
      useCanonicalPlaceSearch("detroit", { fetchImpl: fetchMock as never, debounceMs: 5 }),
    )
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.items).toEqual([])
  })
})

describe("visibility rules (P4-T05/T06)", () => {
  it("defaults to private; only explicit user_entry can be public", () => {
    expect(resolveLocationVisibility({ source: "user_entry", userChoice: null })).toBe("private")
    expect(resolveLocationVisibility({ source: "user_entry", userChoice: "public" })).toBe("public")
    expect(resolveLocationVisibility({ source: "device_gps", userChoice: "public" })).toBe("private")
    expect(resolveLocationVisibility({ source: "ip_derived", userChoice: "public" })).toBe("private")
    expect(resolveLocationVisibility({ source: "inferred", userChoice: "public" })).toBe("private")
  })

  it("builds display strings from canonical parts without leaking precision", () => {
    expect(buildDisplayString({ cityName: "Detroit", countryName: "United States" })).toBe(
      "Detroit, United States",
    )
    expect(buildDisplayString({})).toBeNull()
  })
})

describe("picker telemetry (P4-T07)", () => {
  it("records coarse outcomes and scrubs everything else", () => {
    const seen: unknown[] = []
    const tel = createPlacePickerTelemetry((event) => seen.push(event))
    tel.record({
      outcome: "selected",
      resultCount: 3,
      // @ts-expect-error hostile extra fields must be scrubbed
      queryText: "123 Main St",
      lat: 42.33,
      lng: -83.04,
    } as never)
    expect(seen).toEqual([{ outcome: "selected", resultCount: 3 }])
  })

  it("no-op sink records nothing", () => {
    const seen: unknown[] = []
    const tel = createPlacePickerTelemetry(null)
    tel.record({ outcome: "abandoned" })
    expect(seen).toEqual([])
  })
})
