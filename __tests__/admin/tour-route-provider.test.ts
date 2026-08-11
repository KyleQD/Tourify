/**
 * ROUTE-302 — Route provider abstraction tests.
 *
 * Acceptance criteria:
 *   - One registered provider used for all calculations; provider-neutral contract.
 *   - Manual fallback used when no provider registered or provider errors.
 *   - Cache: same (provider, origin, destination, mode) key returns cached result
 *     without calling provider again.
 *   - Rate-limit tracker: over-limit call uses manual fallback or throws; token
 *     bucket resets after 60s window.
 *   - Telemetry sink receives an event for every calculation (hit, miss, fallback, error).
 *   - buildRouteCacheKey is deterministic and normalizes whitespace/case.
 */

import { describe, expect, it, vi, afterEach } from "vitest"

import {
  buildRouteCacheKey,
  calculateRouteLeg,
  clearRouteProvider,
  consumeRateLimitToken,
  createRateLimitBucket,
  getActiveRouteProvider,
  registerRouteProvider,
  RouteProviderError,
  type RouteCalculationResult,
  type RouteCalculationTelemetry,
} from "@/lib/admin/tour-route-provider"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_REQUEST = {
  originLabel: "Chicago, IL",
  destinationLabel: "Detroit, MI",
  mode: "drive" as const,
}

const ORG = "org-1"

function makeResult(overrides: Partial<RouteCalculationResult> = {}): RouteCalculationResult {
  return {
    distance_km: 480,
    duration_minutes: 290,
    providerName: "osrm",
    providerVersion: "v5",
    calculatedAt: "2026-07-20T10:00:00Z",
    source: "provider",
    ...overrides,
  }
}

afterEach(() => {
  clearRouteProvider()
})

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

describe("ROUTE-302 buildRouteCacheKey", () => {
  it("produces a stable key for the same inputs", () => {
    const a = buildRouteCacheKey({ providerName: "osrm", origin: "Chicago", destination: "Detroit", mode: "drive" })
    const b = buildRouteCacheKey({ providerName: "osrm", origin: "Chicago", destination: "Detroit", mode: "drive" })
    expect(a).toBe(b)
  })

  it("normalizes whitespace and case", () => {
    const a = buildRouteCacheKey({ providerName: "osrm", origin: "New York", destination: "Boston", mode: "drive" })
    const b = buildRouteCacheKey({ providerName: "osrm", origin: "new york", destination: "boston", mode: "drive" })
    expect(a).toBe(b)
  })

  it("different modes produce different keys", () => {
    const drive = buildRouteCacheKey({ providerName: "osrm", origin: "A", destination: "B", mode: "drive" })
    const fly = buildRouteCacheKey({ providerName: "osrm", origin: "A", destination: "B", mode: "fly" })
    expect(drive).not.toBe(fly)
  })

  it("different providers produce different keys", () => {
    const a = buildRouteCacheKey({ providerName: "osrm", origin: "A", destination: "B", mode: "drive" })
    const b = buildRouteCacheKey({ providerName: "google", origin: "A", destination: "B", mode: "drive" })
    expect(a).not.toBe(b)
  })
})

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

describe("ROUTE-302 provider registry", () => {
  it("returns null active provider when none registered", () => {
    expect(getActiveRouteProvider()).toBeNull()
  })

  it("returns registered provider name and version", () => {
    registerRouteProvider({ name: "osrm", version: "v5", fn: vi.fn() })
    const active = getActiveRouteProvider()
    expect(active?.name).toBe("osrm")
    expect(active?.version).toBe("v5")
  })

  it("clearRouteProvider removes active provider", () => {
    registerRouteProvider({ name: "osrm", version: "v5", fn: vi.fn() })
    clearRouteProvider()
    expect(getActiveRouteProvider()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Provider calculation
// ---------------------------------------------------------------------------

describe("ROUTE-302 calculateRouteLeg — provider call", () => {
  it("calls provider and returns result", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const result = await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG })
    expect(result.source).toBe("provider")
    expect(result.distance_km).toBe(480)
    expect(mockFn).toHaveBeenCalledOnce()
  })

  it("throws when no provider and no manual fallback", async () => {
    await expect(calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG })).rejects.toThrow(
      RouteProviderError,
    )
  })

  it("uses manual fallback when no provider registered", async () => {
    const result = await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      manualFallback: { distance_km: 500, duration_minutes: 310, reason: "No provider" },
    })
    expect(result.source).toBe("manual_fallback")
    expect(result.distance_km).toBe(500)
    expect(result.providerName).toBe("manual")
  })

  it("uses manual fallback when provider throws", async () => {
    const failFn = vi.fn().mockRejectedValue(new RouteProviderError("timeout", "Provider timed out"))
    registerRouteProvider({ name: "osrm", version: "v5", fn: failFn })

    const result = await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      manualFallback: { distance_km: 500, duration_minutes: 310, reason: "Fallback" },
    })
    expect(result.source).toBe("manual_fallback")
    expect(result.distance_km).toBe(500)
  })

  it("throws provider error when provider fails and no manual fallback", async () => {
    const failFn = vi.fn().mockRejectedValue(new Error("Provider unavailable"))
    registerRouteProvider({ name: "osrm", version: "v5", fn: failFn })

    await expect(calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

describe("ROUTE-302 calculateRouteLeg — cache", () => {
  it("cache hit returns cached result without calling provider", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const cache = new Map<string, RouteCalculationResult>()
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache })
    // Second call — same request
    const second = await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache })

    expect(mockFn).toHaveBeenCalledOnce() // not called again
    expect(second.source).toBe("cache")
  })

  it("different destination = cache miss = second provider call", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const cache = new Map<string, RouteCalculationResult>()
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache })
    await calculateRouteLeg({
      request: { ...BASE_REQUEST, destinationLabel: "Cleveland, OH" },
      orgId: ORG,
      cache,
    })
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it("manual fallback result is also cached", async () => {
    const cache = new Map<string, RouteCalculationResult>()
    const first = await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      manualFallback: { distance_km: 500, duration_minutes: 310, reason: "Manual" },
      cache,
    })
    const second = await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      manualFallback: { distance_km: 500, duration_minutes: 310, reason: "Manual" },
      cache,
    })
    expect(first.source).toBe("manual_fallback")
    expect(second.source).toBe("cache")
  })
})

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("ROUTE-302 rate-limit tracker", () => {
  it("allows calls within limit", () => {
    const bucket = createRateLimitBucket({ providerName: "osrm", maxPerMinute: 3 })
    expect(consumeRateLimitToken(bucket).allowed).toBe(true)
    expect(consumeRateLimitToken(bucket).allowed).toBe(true)
    expect(consumeRateLimitToken(bucket).allowed).toBe(true)
  })

  it("blocks when over limit and returns retryAfterMs", () => {
    const bucket = createRateLimitBucket({ providerName: "osrm", maxPerMinute: 1 })
    consumeRateLimitToken(bucket)
    const result = consumeRateLimitToken(bucket)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it("resets bucket after 60s window", () => {
    const t0 = 0
    const bucket = createRateLimitBucket({ providerName: "osrm", maxPerMinute: 1, nowMs: t0 })
    consumeRateLimitToken(bucket, t0)
    // Blocked in same window
    expect(consumeRateLimitToken(bucket, t0 + 30_000).allowed).toBe(false)
    // New window: allowed
    expect(consumeRateLimitToken(bucket, t0 + 60_001).allowed).toBe(true)
  })

  it("rate-limited call uses manual fallback instead of throwing (when fallback provided)", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const bucket = createRateLimitBucket({ providerName: "osrm", maxPerMinute: 1 })
    const cache = new Map<string, RouteCalculationResult>()
    // Use up the token
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache, rateLimitBucket: bucket })

    // Second request — rate limited → fallback
    const result = await calculateRouteLeg({
      request: { ...BASE_REQUEST, destinationLabel: "Cleveland, OH" },
      orgId: ORG,
      cache,
      rateLimitBucket: bucket,
      manualFallback: { distance_km: 400, duration_minutes: 240, reason: "Rate limit fallback" },
    })
    expect(result.source).toBe("manual_fallback")
    expect(mockFn).toHaveBeenCalledOnce() // only called for the first (non-rate-limited) request
  })

  it("rate-limited call throws RouteProviderError when no fallback", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const bucket = createRateLimitBucket({ providerName: "osrm", maxPerMinute: 1 })
    // Consume token
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, rateLimitBucket: bucket })
    // Next call — rate limited, no fallback
    await expect(
      calculateRouteLeg({
        request: { ...BASE_REQUEST, destinationLabel: "Cleveland, OH" },
        orgId: ORG,
        rateLimitBucket: bucket,
      }),
    ).rejects.toThrow(RouteProviderError)
  })
})

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

describe("ROUTE-302 telemetry observability", () => {
  it("telemetry sink receives an event for every calculation", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const events: RouteCalculationTelemetry[] = []
    await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      telemetrySink: (e) => events.push(e),
    })

    expect(events).toHaveLength(1)
    expect(events[0].providerName).toBe("osrm")
    expect(events[0].orgId).toBe(ORG)
    expect(events[0].source).toBe("provider")
    expect(events[0].latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("telemetry event captures error code on provider failure", async () => {
    const failFn = vi.fn().mockRejectedValue(new RouteProviderError("timeout", "Provider timed out"))
    registerRouteProvider({ name: "osrm", version: "v5", fn: failFn })

    const events: RouteCalculationTelemetry[] = []
    await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      manualFallback: { distance_km: 500, duration_minutes: 310, reason: "Fallback" },
      telemetrySink: (e) => events.push(e),
    })

    expect(events[0].errorCode).toBe("timeout")
    expect(events[0].source).toBe("manual_fallback")
  })

  it("telemetry event marks cache hit with source=cache", async () => {
    const mockFn = vi.fn().mockResolvedValue(makeResult())
    registerRouteProvider({ name: "osrm", version: "v5", fn: mockFn })

    const cache = new Map<string, RouteCalculationResult>()
    const events: RouteCalculationTelemetry[] = []
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache, telemetrySink: (e) => events.push(e) })
    await calculateRouteLeg({ request: BASE_REQUEST, orgId: ORG, cache, telemetrySink: (e) => events.push(e) })

    expect(events[1].source).toBe("cache")
  })

  it("telemetry event includes tourVersionId when supplied", async () => {
    clearRouteProvider()
    const events: RouteCalculationTelemetry[] = []
    await calculateRouteLeg({
      request: BASE_REQUEST,
      orgId: ORG,
      tourVersionId: "tv-123",
      manualFallback: { distance_km: 500, duration_minutes: 300, reason: "Manual" },
      telemetrySink: (e) => events.push(e),
    })
    expect(events[0].tourVersionId).toBe("tv-123")
  })
})
