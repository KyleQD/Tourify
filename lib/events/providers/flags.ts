/**
 * lib/events/providers/flags.ts
 *
 * Environment-driven feature flags for the event-discovery ecosystem.
 * Pattern mirrors lib/config/audit-feature-gates.ts. Server-side reads
 * only; any browser twin must be a separate NEXT_PUBLIC_ variable
 * registered in lib/config/environment-contract.ts.
 *
 * All flags default OFF — no live provider is enabled by default.
 */

export type EventFeatureFlag =
  | "EVENT_DISCOVERY_V2"
  | "EVENT_PROVIDER_TICKETMASTER"
  | "EVENT_PROVIDER_BANDSINTOWN"
  | "EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE"
  | "EVENT_EXTERNAL_CLAIMS"
  | "EVENT_MAP_VIEW"
  | "EVENT_RECOMMENDED_SORT"
  | "EVENT_PROVIDER_ADMIN_TOOLS"

function readFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  return raw === "1" || raw === "true" || raw === "on"
}

export function isEventFeatureEnabled(flag: EventFeatureFlag): boolean {
  return readFlag(flag)
}

export type BandsintownMode = "disabled" | "artist_owned_key" | "partner"

/**
 * Resolve the Bandsintown operating mode. Production default is
 * `disabled` unless explicit authorization configuration exists.
 * `partner` requires EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE in addition
 * to the base provider flag.
 */
export function getBandsintownMode(): BandsintownMode {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_BANDSINTOWN")) return "disabled"
  if (isEventFeatureEnabled("EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE")) return "partner"
  return "artist_owned_key"
}

/** Server-only configuration validation result. */
export interface ProviderConfigIssue {
  provider: string
  variable: string
  message: string
}

/**
 * Validate server-only provider configuration. Called from server entry
 * points (cron, sync routes) — never at module load in shared code, so a
 * missing key can never break unrelated routes or the browser bundle.
 */
export function validateProviderConfig(): ProviderConfigIssue[] {
  const issues: ProviderConfigIssue[] = []

  if (isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")) {
    if (!process.env.TICKETMASTER_API_KEY?.trim()) {
      issues.push({
        provider: "ticketmaster",
        variable: "TICKETMASTER_API_KEY",
        message: "Ticketmaster provider is enabled but TICKETMASTER_API_KEY is not set.",
      })
    }
  }

  const mode = getBandsintownMode()
  if (mode !== "disabled") {
    if (!process.env.BANDSINTOWN_APP_ID?.trim()) {
      issues.push({
        provider: "bandsintown",
        variable: "BANDSINTOWN_APP_ID",
        message: "Bandsintown is enabled but BANDSINTOWN_APP_ID is not set.",
      })
    }
  }

  return issues
}
