export type LaunchCapabilityStatus = 'enabled' | 'pilot' | 'disabled'

export interface LaunchCapability {
  status: LaunchCapabilityStatus
  summary: string
  exposure: 'general' | 'restricted' | 'none'
}

/**
 * Canonical production launch exposure. `pilot` never means general
 * availability: pilot surfaces still require their existing authorization and
 * provider/configuration gates. Deferred provider-specific capabilities remain
 * disabled until their owner task supplies release evidence.
 */
export const LAUNCH_CAPABILITIES = {
  accounts_and_profiles: {
    status: 'enabled',
    exposure: 'general',
    summary: 'Authentication, profiles, and account workspaces.',
  },
  events_and_community: {
    status: 'enabled',
    exposure: 'general',
    summary: 'First-party events, news, community, and collaboration.',
  },
  venue_and_artist_operations: {
    status: 'enabled',
    exposure: 'general',
    summary: 'Authenticated venue and artist operational workspaces.',
  },
  ticketing: {
    status: 'pilot',
    exposure: 'restricted',
    summary: 'Ticketing is limited to configured, authorized pilot accounts.',
  },
  marketplace: {
    status: 'pilot',
    exposure: 'restricted',
    summary: 'Marketplace commerce is limited to configured, authorized pilot accounts.',
  },
  marketplace_provider_integrations: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Shopify, Printful, and other provider integrations are deferred pending owner evidence.',
  },
  external_event_providers: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Third-party event ingestion is deferred pending provider approval evidence.',
  },
  music_finance_offerings: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Music finance offerings are not part of the initial production launch.',
  },
  advanced_music_webhooks: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Deferred institutional, licensing, and rights webhooks are not launch-certified.',
  },
  music_rights_intelligence: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Rights intelligence, benchmarking, and collective-analysis workflows are deferred.',
  },
  music_preview_processing: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Automatic music preview processing is deferred pending worker runtime and health evidence.',
  },
  music_origin_processing: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Music origin processing is deferred pending schema, worker-runtime, and rollout evidence.',
  },
  music_protected_derivatives: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Protected music derivatives remain a staged stub pending production tooling and runtime evidence.',
  },
  music_testnet_anchoring: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Music-rights testnet anchoring remains a staged stub; mainnet anchoring is not approved.',
  },
  music_royalty_ingestion: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Royalty statement ingestion is deferred pending schema, runtime, and end-to-end payout evidence.',
  },
  creator_cooperative: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator cooperative membership, research, and collective workflows are readiness-only.',
  },
  creator_digital_commons: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Digital-commons stewardship, participation, and transfer workflows are sandbox-only.',
  },
  creator_federation: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator federation membership, sovereignty, representation, and collective workflows are readiness-only.',
  },
  creator_interoperability_convention: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator interoperability convention, recognition, and approval workflows are readiness-only.',
  },
  creator_interoperability_institution: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator interoperability institution and public-law workflows are readiness-only.',
  },
  creator_interoperability_organization: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator interoperability organization and public-law workflows are readiness-only.',
  },
  creator_protocol_constitution: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator protocol constitution and compact-stewardship workflows are readiness-only.',
  },
  creator_public_infrastructure: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator public infrastructure and public-interest commons workflows are readiness-only.',
  },
  creator_multilateral_treaty_operations: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator multilateral treaty operations and public-authority workflows are readiness-only.',
  },
  creator_treaty_system_legacy: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator treaty-system legacy and century-scale stewardship workflows are readiness-only.',
  },
  creator_treaty_system_renewal: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Creator treaty-system renewal and long-horizon stewardship workflows are readiness-only.',
  },
  polls: {
    status: 'disabled',
    exposure: 'none',
    summary: 'Poll creation and voting remain audit-gated.',
  },
} as const satisfies Record<string, LaunchCapability>

/**
 * These routes may exist for local recovery or diagnostics, but must resolve as
 * not found at the production request boundary. Match exact paths or children;
 * never use an unrestricted string prefix match.
 */
export const PRODUCTION_DENIED_ROUTE_PREFIXES = [
  '/auth-test',
  '/auth-demo',
  '/debug',
  '/artist/debug',
  '/migrations',
  '/setup',
  '/test-friend-suggestions',
  '/admin/debug',
  '/admin/setup',
  '/admin/dashboard/test-api',
  '/admin/create-tables',
  '/admin/reset-onboarding',
  '/api/debug',
  '/api/debug-auth',
  '/api/auth-debug',
  '/api/migrations',
  '/api/setup-storage',
  '/api/marketplace/migrations',
  '/api/admin/test',
  '/api/notifications/test',
  '/api/test-db',
  '/api/test-header-url',
  '/api/test-rss',
  '/api/test-venues',
] as const

export function routeMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isProductionDeniedRoute(pathname: string): boolean {
  return PRODUCTION_DENIED_ROUTE_PREFIXES.some((prefix) => routeMatchesPrefix(pathname, prefix))
}

export type LaunchCapabilityName = keyof typeof LAUNCH_CAPABILITIES

export function isLaunchCapabilityAvailable(
  capability: LaunchCapabilityName,
  explicitlyApproved = false,
): boolean {
  const status = LAUNCH_CAPABILITIES[capability].status
  if (status === 'enabled') return true
  if (status === 'pilot') return explicitlyApproved
  return false
}
