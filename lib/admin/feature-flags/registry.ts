export const ADMIN_FEATURE_FLAG_REGISTRY = [
  {
    key: "admin_ticketing_canonical_v1",
    displayName: "Canonical ticketing",
    purpose: "Switch an organization to the reconciled canonical ticketing read/write path.",
    owner: "Ticketing Platform",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["canonical_request_rate", "canonical_error_rate", "inventory_variance"],
    rollback: "Disable the organization assignment and preserve reconciliation evidence.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "TIX-204",
  },
  {
    key: "admin_publication_outbox_v1",
    displayName: "Publication outbox",
    purpose: "Enable durable publication delivery for a reconciled organization.",
    owner: "Admin Publishing",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["outbox_delivery_rate", "dead_letter_rate", "delivery_latency_ms"],
    rollback: "Disable the organization assignment without deleting snapshots, deliveries, or audit history.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "PUB-601",
  },
  {
    key: "admin_logistics_plan_workspace_v1",
    displayName: "Logistics plan workspace",
    purpose: "Enable the tour-backed logistics plan workspace for a selected organization.",
    owner: "Operations Platform",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["workspace_request_rate", "workspace_error_rate", "readiness_blocker_count"],
    rollback: "Disable the organization assignment and keep tour and logistics records unchanged.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "LOG-PLAN-001",
  },
  {
    key: "admin_event_promoter_program_v1",
    displayName: "Event Promoter program controls",
    purpose: "Enable organizer Promoter Network program configuration for a selected organization.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["program_count", "program_api_error_rate"],
    rollback: "Disable the organization assignment and preserve program and version history.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-001",
  },
  {
    key: "admin_event_promoter_applications_v1",
    displayName: "Event Promoter applications",
    purpose: "Enable promoter applications and invitations for eligible event programs.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["application_count", "application_api_error_rate"],
    rollback: "Disable the organization assignment while preserving existing applications and memberships.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-002",
  },
  {
    key: "admin_event_promoter_attribution_v1",
    displayName: "Event Promoter attribution",
    purpose: "Enable tracking-link, code, and native-share attribution capture.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["attribution_resolver_latency_ms", "tracking_redirect_error_rate"],
    rollback: "Disable the organization assignment and retain recorded touchpoints for audit.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-003",
  },
  {
    key: "admin_event_promoter_shadow_commissions_v1",
    displayName: "Event Promoter shadow commissions",
    purpose: "Calculate non-payable promoter commission outcomes for reconciliation.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["shadow_attribution_mismatch_rate", "sale_to_shadow_lag_ms"],
    rollback: "Disable the organization assignment; no payable obligations are created by this flag.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-004",
  },
  {
    key: "admin_event_promoter_payable_commissions_v1",
    displayName: "Event Promoter payable commissions",
    purpose: "Permit verified payment events to append promoter commission entitlement entries.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["commission_finalization_error_rate", "commission_idempotency_conflicts"],
    rollback: "Disable the organization assignment and stop new earned entries while preserving ledger history.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-005",
  },
  {
    key: "admin_event_promoter_payouts_v1",
    displayName: "Event Promoter payouts",
    purpose: "Permit approved promoter commission allocations to enter the payout adapter.",
    owner: "Event Commerce",
    environments: ["staging", "pilot", "production"],
    safeDefault: false,
    metrics: ["promoter_payout_allocation_failure_rate", "promoter_payout_lag_ms"],
    rollback: "Disable the organization assignment and stop payout allocation while preserving ledger history.",
    expiresAt: "2027-12-31T23:59:59.000Z",
    removalIssue: "EVENT-PROMOTER-ROLLBACK-006",
  },
] as const

export type AdminFeatureFlagKey = (typeof ADMIN_FEATURE_FLAG_REGISTRY)[number]["key"]

export function getAdminFeatureFlagDefinition(key: string) {
  return ADMIN_FEATURE_FLAG_REGISTRY.find((definition) => definition.key === key)
}

export function validateAdminFeatureFlagRegistry(now = new Date()): string[] {
  const issues: string[] = []
  const keys = new Set<string>()
  for (const definition of ADMIN_FEATURE_FLAG_REGISTRY) {
    if (keys.has(definition.key)) issues.push(`${definition.key}: duplicate key`)
    keys.add(definition.key)
    if (!/^admin_[a-z0-9]+(?:_[a-z0-9]+)*_v[1-9][0-9]*$/.test(definition.key)) {
      issues.push(`${definition.key}: invalid versioned Admin flag key`)
    }
    for (const field of ["displayName", "purpose", "owner", "rollback", "removalIssue"] as const) {
      if (!definition[field].trim()) issues.push(`${definition.key}: ${field} is required`)
    }
    if (!definition.environments.length) issues.push(`${definition.key}: environments are required`)
    if (!definition.metrics.length) issues.push(`${definition.key}: metrics are required`)
    if (!Number.isFinite(new Date(definition.expiresAt).getTime())) {
      issues.push(`${definition.key}: expiresAt is invalid`)
    } else if (new Date(definition.expiresAt) <= now) {
      issues.push(`${definition.key}: expired on ${definition.expiresAt}`)
    }
  }
  return issues
}
