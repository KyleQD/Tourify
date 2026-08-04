/**
 * lib/music/providers/audius/audius-health.ts
 *
 * Lightweight health check for the Audius discovery node.
 * Should NOT be called on every playback request — use for dashboards and
 * periodic operational checks only.
 */

import type { ProviderHealth } from "../contracts"
import { getAudiusConfig } from "./audius-config"
import { audiusNetworkError } from "./audius-errors"

/**
 * Performs a lightweight HEAD/GET against the Audius health endpoint.
 * Returns provider health status and observed latency.
 */
export async function checkAudiusHealth(): Promise<ProviderHealth> {
  const config = getAudiusConfig()
  const start = Date.now()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000) // 5s max for health check

  try {
    const url = `${config.apiBaseUrl}/v1/tracks?app_name=${encodeURIComponent(config.appName)}&limit=1`
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    clearTimeout(timer)

    const latencyMs = Date.now() - start

    if (res.ok) {
      return {
        provider: "audius",
        status: "healthy",
        latencyMs,
        checkedAt: new Date().toISOString(),
      }
    }
    if (res.status >= 500) {
      return {
        provider: "audius",
        status: "degraded",
        latencyMs,
        checkedAt: new Date().toISOString(),
      }
    }
    return {
      provider: "audius",
      status: "degraded",
      latencyMs,
      checkedAt: new Date().toISOString(),
    }
  } catch (err) {
    clearTimeout(timer)
    const normalized = audiusNetworkError(err)
    return {
      provider: "audius",
      status: normalized.code === "PROVIDER_TIMEOUT" ? "degraded" : "unavailable",
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    }
  }
}
