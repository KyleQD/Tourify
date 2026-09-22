/**
 * VEN-264/272/273 — provider capability catalog (server truth).
 *
 * Readiness derives from server env presence; the browser never learns
 * secrets — only whether a provider is configured. Stripe is deliberately
 * excluded: payout connectivity lives in the Finance surface (VEN-273).
 */

export type IntegrationCapability = "publish" | "read_analytics" | "sync_events" | "read_profile"

export interface ProviderDefinition {
  provider: string
  label: string
  capabilities: Record<IntegrationCapability, boolean>
  /** Env vars that must be present for connect to be offered. */
  requiredEnv: readonly string[]
  docsHint: string
}

const PROVIDERS: readonly ProviderDefinition[] = [
  {
    provider: "instagram",
    label: "Instagram",
    capabilities: { publish: true, read_analytics: false, sync_events: false, read_profile: true },
    requiredEnv: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    docsHint: "Facebook Login for Business — content publishing via Graph API.",
  },
  {
    provider: "facebook",
    label: "Facebook Pages",
    capabilities: { publish: true, read_analytics: true, sync_events: true, read_profile: true },
    requiredEnv: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    docsHint: "Page publishing + page insights.",
  },
  {
    provider: "youtube",
    label: "YouTube",
    capabilities: { publish: true, read_analytics: false, sync_events: false, read_profile: true },
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    docsHint: "Uploads via Data API; analytics not wired yet.",
  },
  {
    provider: "tiktok",
    label: "TikTok",
    capabilities: { publish: true, read_analytics: false, sync_events: false, read_profile: true },
    requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    docsHint: "Content Posting API.",
  },
  {
    provider: "twitter",
    label: "X / Twitter",
    capabilities: { publish: true, read_analytics: false, sync_events: false, read_profile: true },
    requiredEnv: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    docsHint: "OAuth 2.0 PKCE (S256).",
  },
] as const

export function getProviderCatalog(): Array<
  ProviderDefinition & { configured: boolean; missing_env: string[] }
> {
  return PROVIDERS.map((provider) => {
    const missing = provider.requiredEnv.filter((key) => !process.env[key])
    return { ...provider, configured: missing.length === 0, missing_env: missing }
  })
}

export function isKnownProvider(provider: string): boolean {
  return PROVIDERS.some((p) => p.provider === provider)
}

/** VEN-273 — explicit separation contract. */
export const STRIPE_SEPARATION_NOTE =
  "Stripe/payout connectivity is managed in Finance → Payout settings, never through the integrations framework."
