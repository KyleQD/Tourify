/**
 * lib/geo/telemetry.ts
 *
 * Resolver quality telemetry helpers (GEO_RESOLVER_CONTRACT_V0_1 section 12).
 * Emits coarse counters only: source context, match method, confidence band,
 * resolved/unresolved, ambiguity count. Never logs raw precise coordinates.
 */
import type { ResolvePlaceResult } from "./types"

export interface GeoTelemetryEvent {
  matchMethod: ResolvePlaceResult["matchMethod"]
  confidenceBand: "accept" | "review" | "unresolved"
  resolved: boolean
  ambiguityCount: number
}

export function summarizeForTelemetry(
  result: ResolvePlaceResult
): GeoTelemetryEvent {
  const band =
    result.matchMethod === "unresolved"
      ? "unresolved"
      : result.needsReview
        ? "review"
        : "accept"
  return {
    matchMethod: result.matchMethod,
    confidenceBand: band,
    resolved: result.placeId !== null,
    ambiguityCount: result.candidates.length,
  }
}

export type GeoTelemetrySink = (event: GeoTelemetryEvent) => void

/**
 * No-op unless explicitly enabled. Call sites pass the sink only when the
 * `world_music_enabled` feature flag is on, so ordinary Discover traffic
 * stays telemetry-free until rollout.
 */
export function createGeoTelemetry(sink: GeoTelemetrySink | null) {
  return {
    record(result: ResolvePlaceResult): void {
      if (!sink) return
      sink(summarizeForTelemetry(result))
    },
  }
}
