/**
 * ROUTE-302 — Route provider abstraction.
 *
 * Distance/duration calculation is provider-neutral: a single registered
 * provider is used for all calculations, with a manual fallback when no
 * provider is configured or the provider returns an error.
 *
 * Features:
 *  - Provider registry (one active provider at a time)
 *  - Manual fallback (operator-supplied values)
 *  - Request cache: keyed on (provider, origin, destination, mode)
 *  - Rate-limit tracker (token bucket per provider)
 *  - Observable: every calculation records request/result/provider/latency
 *
 * Pure: no I/O, no `server-only`. Callers inject the cache and telemetry sinks.
 */

// ---------------------------------------------------------------------------
// Provider contract
// ---------------------------------------------------------------------------

export type RouteCalculationMode = "drive" | "fly" | "rail" | "ferry" | "bus" | "walk" | "other"

export interface RouteCalculationRequest {
  originLabel: string
  originLat?: number | null
  originLng?: number | null
  destinationLabel: string
  destinationLat?: number | null
  destinationLng?: number | null
  mode: RouteCalculationMode
}

export interface RouteCalculationResult {
  distance_km: number
  duration_minutes: number
  providerName: string
  providerVersion: string
  calculatedAt: string
  source: "provider" | "manual_fallback" | "cache"
  rawResponse?: Record<string, unknown>
}

export type RouteProviderFn = (
  req: RouteCalculationRequest,
) => Promise<RouteCalculationResult>

export class RouteProviderError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "RouteProviderError"
    this.code = code
  }
}

// ---------------------------------------------------------------------------
// Provider registry (one active provider)
// ---------------------------------------------------------------------------

let _activeProvider: { name: string; version: string; fn: RouteProviderFn } | null = null

export function registerRouteProvider(args: {
  name: string
  version: string
  fn: RouteProviderFn
}): void {
  _activeProvider = args
}

export function clearRouteProvider(): void {
  _activeProvider = null
}

export function getActiveRouteProvider(): { name: string; version: string } | null {
  if (!_activeProvider) return null
  return { name: _activeProvider.name, version: _activeProvider.version }
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

export function buildRouteCacheKey(args: {
  providerName: string
  origin: string
  destination: string
  mode: RouteCalculationMode
}): string {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_")
  return [
    "route",
    args.providerName,
    normalize(args.origin),
    normalize(args.destination),
    args.mode,
  ].join(":")
}

// ---------------------------------------------------------------------------
// Rate-limit tracker (token bucket, provider-keyed)
// ---------------------------------------------------------------------------

export interface RateLimitBucket {
  providerName: string
  maxPerMinute: number
  windowStartMs: number
  used: number
}

export function createRateLimitBucket(args: {
  providerName: string
  maxPerMinute: number
  nowMs?: number
}): RateLimitBucket {
  return {
    providerName: args.providerName,
    maxPerMinute: args.maxPerMinute,
    windowStartMs: args.nowMs ?? Date.now(),
    used: 0,
  }
}

/**
 * Check and consume one token.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
 */
export function consumeRateLimitToken(
  bucket: RateLimitBucket,
  nowMs = Date.now(),
): { allowed: boolean; retryAfterMs?: number } {
  const elapsed = nowMs - bucket.windowStartMs
  if (elapsed >= 60_000) {
    // New window
    bucket.windowStartMs = nowMs
    bucket.used = 0
  }
  if (bucket.used >= bucket.maxPerMinute) {
    const retryAfterMs = 60_000 - elapsed
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) }
  }
  bucket.used += 1
  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Observability telemetry event
// ---------------------------------------------------------------------------

export interface RouteCalculationTelemetry {
  requestId: string
  orgId: string
  tourVersionId: string | null
  fromLabel: string
  toLabel: string
  mode: RouteCalculationMode
  providerName: string
  source: RouteCalculationResult["source"]
  distance_km: number | null
  duration_minutes: number | null
  latencyMs: number
  errorCode: string | null
  cacheKey: string
  calculatedAt: string
}

export type RouteTelemetrySink = (event: RouteCalculationTelemetry) => void

// ---------------------------------------------------------------------------
// Manual fallback
// ---------------------------------------------------------------------------

export interface ManualRouteFallback {
  distance_km: number
  duration_minutes: number
  reason: string
}

// ---------------------------------------------------------------------------
// Main calculate function (provider-neutral)
// ---------------------------------------------------------------------------

export async function calculateRouteLeg(args: {
  request: RouteCalculationRequest
  orgId: string
  tourVersionId?: string | null
  requestId?: string
  cache?: Map<string, RouteCalculationResult>
  rateLimitBucket?: RateLimitBucket
  telemetrySink?: RouteTelemetrySink
  manualFallback?: ManualRouteFallback | null
}): Promise<RouteCalculationResult> {
  const requestId = args.requestId ?? `route-${Date.now()}`
  const startMs = Date.now()
  const calculatedAt = new Date().toISOString()

  const providerName = _activeProvider?.name ?? "manual"
  const cacheKey = buildRouteCacheKey({
    providerName,
    origin: args.request.originLabel,
    destination: args.request.destinationLabel,
    mode: args.request.mode,
  })

  function emit(
    result: RouteCalculationResult,
    errorCode: string | null = null,
  ) {
    args.telemetrySink?.({
      requestId,
      orgId: args.orgId,
      tourVersionId: args.tourVersionId ?? null,
      fromLabel: args.request.originLabel,
      toLabel: args.request.destinationLabel,
      mode: args.request.mode,
      providerName: result.providerName,
      source: result.source,
      distance_km: result.distance_km,
      duration_minutes: result.duration_minutes,
      latencyMs: Date.now() - startMs,
      errorCode,
      cacheKey,
      calculatedAt,
    })
  }

  // Cache hit
  if (args.cache) {
    const cached = args.cache.get(cacheKey)
    if (cached) {
      const hit = { ...cached, source: "cache" as const }
      emit(hit)
      return hit
    }
  }

  // Rate limit check
  if (args.rateLimitBucket && _activeProvider) {
    const check = consumeRateLimitToken(args.rateLimitBucket)
    if (!check.allowed) {
      if (args.manualFallback) {
        const fb = buildManualFallbackResult(args.manualFallback, calculatedAt)
        emit(fb, "rate_limited")
        return fb
      }
      throw new RouteProviderError(
        "rate_limited",
        `Provider ${providerName} rate limit exceeded. Retry after ${check.retryAfterMs}ms.`,
      )
    }
  }

  // No provider → manual fallback or error
  if (!_activeProvider) {
    if (args.manualFallback) {
      const fb = buildManualFallbackResult(args.manualFallback, calculatedAt)
      emit(fb)
      args.cache?.set(cacheKey, fb)
      return fb
    }
    throw new RouteProviderError(
      "no_provider",
      "No route provider is configured. Supply a manual fallback or register a provider.",
    )
  }

  // Provider call
  try {
    const result = await _activeProvider.fn(args.request)
    const final = { ...result, source: "provider" as const }
    args.cache?.set(cacheKey, final)
    emit(final)
    return final
  } catch (err) {
    const errorCode = (err instanceof RouteProviderError ? err.code : null) ?? "provider_error"
    if (args.manualFallback) {
      const fb = buildManualFallbackResult(args.manualFallback, calculatedAt)
      emit(fb, errorCode)
      return fb
    }
    emit(
      {
        distance_km: 0,
        duration_minutes: 0,
        providerName,
        providerVersion: _activeProvider?.version ?? "unknown",
        calculatedAt,
        source: "provider",
      },
      errorCode,
    )
    throw err
  }
}

function buildManualFallbackResult(
  fallback: ManualRouteFallback,
  calculatedAt: string,
): RouteCalculationResult {
  return {
    distance_km: fallback.distance_km,
    duration_minutes: fallback.duration_minutes,
    providerName: "manual",
    providerVersion: "1",
    calculatedAt,
    source: "manual_fallback",
  }
}
