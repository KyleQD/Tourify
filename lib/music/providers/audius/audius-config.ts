/**
 * lib/music/providers/audius/audius-config.ts
 *
 * Server-only Audius configuration. This module must never be imported in
 * browser bundles — all imports should be in server routes or server-only modules.
 *
 * All Audius-related code is gated on AUDIUS_ENABLED=true.
 */

export interface AudiusConfig {
  /**
   * Base URL for the Audius discovery provider.
   * Defaults to the stable Audius entry point that load-balances across nodes.
   * Override via AUDIUS_API_BASE_URL for specific node targeting.
   */
  apiBaseUrl: string
  /** app_name param required by Audius API for attribution and rate-limit grouping */
  appName: string
  /** Request timeout in milliseconds for all Audius API calls */
  requestTimeoutMs: number
  /** TTL in seconds for cached metadata responses */
  metadataCacheTtlSeconds: number
  /** Timeout in milliseconds specifically for playback resolution */
  playbackResolveTimeoutMs: number
}

const DEFAULT_AUDIUS_BASE_URL = "https://discoveryprovider.audius.co"

/**
 * Returns the current Audius configuration from environment variables.
 *
 * Throws if AUDIUS_ENABLED is not "true" — callers must always check
 * isAudiusEnabled() before calling this in user-facing paths.
 */
export function getAudiusConfig(): AudiusConfig {
  return {
    apiBaseUrl: process.env.AUDIUS_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_AUDIUS_BASE_URL,
    appName: process.env.AUDIUS_APP_NAME || "Tourify",
    requestTimeoutMs: Number(process.env.AUDIUS_REQUEST_TIMEOUT_MS) || 8000,
    metadataCacheTtlSeconds: Number(process.env.AUDIUS_METADATA_CACHE_TTL_SECONDS) || 300,
    playbackResolveTimeoutMs: Number(process.env.AUDIUS_PLAYBACK_RESOLVE_TIMEOUT_MS) || 8000,
  }
}

/**
 * Returns true if the Audius provider is enabled.
 * Always check this before any Audius API call.
 */
export function isAudiusEnabled(): boolean {
  return process.env.AUDIUS_ENABLED === "true"
}
