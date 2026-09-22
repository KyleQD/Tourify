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
