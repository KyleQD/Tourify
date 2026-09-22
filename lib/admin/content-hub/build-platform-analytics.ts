import type { OrganizationSocialIntegration } from "@/types/organization-social-integrations.type"

export type PlatformMetricStatus = "synced" | "needs_oauth" | "unsupported" | "unavailable" | "error"

export interface OrgPlatformMetricSlice {
  followers: number
  impressions: number
  reach: number
  engagement: number
  growth: number
  status: PlatformMetricStatus
  statusLabel: string
  syncedAt: string | null
}

const UNSUPPORTED_ANALYTICS = new Set(["youtube", "tiktok", "twitter"])

function metricNumber(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 0
}

function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const ms = new Date(expiresAt).getTime()
  return Number.isFinite(ms) && ms < Date.now()
}

export function resolveOrgIntegrationStatus(
  integration: OrganizationSocialIntegration | undefined,
): { status: PlatformMetricStatus; statusLabel: string } {
  if (!integration?.is_connected) {
    return { status: "unavailable", statusLabel: "Not connected" }
  }

  if (!integration.has_token || isTokenExpired(integration.token_expires_at)) {
    return { status: "needs_oauth", statusLabel: "Reconnect OAuth" }
  }

  const analytics = (integration.analytics || {}) as Record<string, unknown>
  const providerStatus = String(analytics.status || "")

  if (providerStatus === "needs_oauth") {
    return { status: "needs_oauth", statusLabel: "Reconnect OAuth" }
  }
  if (providerStatus === "error") {
    return {
      status: "error",
      statusLabel: String(analytics.error || "Sync error"),
    }
  }
  if (providerStatus === "unsupported" || UNSUPPORTED_ANALYTICS.has(integration.platform)) {
    if (providerStatus === "synced") {
      // ignore — never treat unsupported platforms as synced with fake zeros
    }
    return {
      status: "unsupported",
      statusLabel: "Analytics not available yet",
    }
  }
  if (providerStatus === "synced") {
    return { status: "synced", statusLabel: "Synced" }
  }

  if (UNSUPPORTED_ANALYTICS.has(integration.platform)) {
    return { status: "unsupported", statusLabel: "Analytics not available yet" }
  }

  return { status: "unavailable", statusLabel: "Awaiting first sync" }
}

export function buildOrgPlatformMetricSlice(
  integration: OrganizationSocialIntegration | undefined,
): OrgPlatformMetricSlice {
  const { status, statusLabel } = resolveOrgIntegrationStatus(integration)
  const analytics = (integration?.analytics || {}) as Record<string, unknown>

  if (status !== "synced") {
    return {
      followers: 0,
      impressions: 0,
      reach: 0,
      engagement: 0,
      growth: 0,
      status,
      statusLabel,
      syncedAt: typeof analytics.synced_at === "string" ? analytics.synced_at : integration?.last_sync || null,
    }
  }

  return {
    followers: metricNumber(analytics.followers, analytics.subscribers),
    impressions: metricNumber(analytics.impressions, analytics.views),
    reach: metricNumber(analytics.reach),
    engagement: metricNumber(analytics.engagement),
    growth: metricNumber(analytics.growth),
    status,
    statusLabel,
    syncedAt: typeof analytics.synced_at === "string" ? analytics.synced_at : integration?.last_sync || null,
  }
}

export function buildOrgPlatformAnalyticsMap(
  integrations: OrganizationSocialIntegration[],
): Record<string, OrgPlatformMetricSlice> {
  const byPlatform = new Map(integrations.map((row) => [row.platform, row]))
  const platforms = ["instagram", "facebook", "youtube", "tiktok", "twitter"] as const
  const result: Record<string, OrgPlatformMetricSlice> = {}
  for (const platform of platforms) {
    result[platform] = buildOrgPlatformMetricSlice(byPlatform.get(platform))
  }
  return result
}
