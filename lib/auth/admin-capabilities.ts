export const ADMIN_CAPABILITIES = [
  'org.roles.manage',
  'org.settings.manage',
  'audit.view',
  'tour.view',
  'tour.manage',
  'tour.publish',
  'tour.archive',
  'tour.delete',
  'event.view',
  'event.manage',
  'event.publish',
  'event.live_ops',
  'routing.manage',
  'advance.manage',
  'logistics.view',
  'logistics.manage',
  'logistics.sensitive',
  'workforce.view',
  'workforce.manage',
  'workforce.publish',
  'hiring.manage',
  'vendor.view',
  'vendor.manage',
  'vendor.sensitive',
  'contract.view',
  'contract.manage',
  'contract.sign',
  'finance.view',
  'finance.manage',
  'finance.approve',
  'finance.pay',
  'ticketing.view',
  'ticketing.manage',
  'ticketing.scan',
  'ticketing.refund',
  'site_map.view',
  'site_map.edit',
  'site_map.share',
  'communications.send',
  'communications.broadcast',
  'content.view',
  'content.manage',
  'commerce.view',
  'commerce.view_customers',
  'commerce.view_seller_pii',
  'commerce.manage_orders',
  'commerce.manage_fulfillment',
  'commerce.manage_listings',
  'commerce.manage_sellers',
  'commerce.manage_cases',
  'commerce.manage_disputes',
  'commerce.issue_refunds',
  'commerce.view_financials',
  'commerce.retry_payouts',
  'commerce.manage_payouts',
  'commerce.manage_settlements',
  'commerce.manage_fees',
  'commerce.manage_subscriptions',
  'commerce.export',
  'commerce.view_audit',
] as const

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number]

const ALL_CAPABILITIES = [...ADMIN_CAPABILITIES]

const OPERATIONS_VIEW: AdminCapability[] = [
  'tour.view',
  'event.view',
  'logistics.view',
  'workforce.view',
  'vendor.view',
  'contract.view',
  'finance.view',
  'ticketing.view',
  'site_map.view',
  'content.view',
  'commerce.view',
]

const TOUR_MANAGER_CAPABILITIES: AdminCapability[] = [
  ...OPERATIONS_VIEW,
  'tour.manage',
  'tour.publish',
  'tour.archive',
  'event.manage',
  'event.publish',
  'event.live_ops',
  'routing.manage',
  'advance.manage',
  'logistics.manage',
  'logistics.sensitive',
  'workforce.manage',
  'workforce.publish',
  'hiring.manage',
  'vendor.manage',
  'site_map.edit',
  'site_map.share',
  'communications.send',
  'communications.broadcast',
  'content.view',
  'content.manage',
  'commerce.manage_orders',
  'commerce.manage_fulfillment',
  'commerce.manage_cases',
  'audit.view',
  'commerce.view_audit',
]

const PRODUCTION_CAPABILITIES = TOUR_MANAGER_CAPABILITIES.filter(
  capability => !['tour.archive', 'tour.publish', 'hiring.manage'].includes(capability)
)

const FINANCE_CAPABILITIES: AdminCapability[] = [
  ...OPERATIONS_VIEW,
  'finance.manage',
  'finance.approve',
  'finance.pay',
  'contract.view',
  'vendor.view',
  'vendor.sensitive',
  'commerce.view_financials',
  'commerce.issue_refunds',
  'commerce.retry_payouts',
  'commerce.manage_payouts',
  'commerce.manage_settlements',
  'commerce.manage_fees',
  'commerce.export',
  'audit.view',
  'commerce.view_audit',
]

const TICKETING_CAPABILITIES: AdminCapability[] = [
  'tour.view',
  'event.view',
  'ticketing.view',
  'ticketing.manage',
  'ticketing.scan',
  'ticketing.refund',
  'commerce.view',
  'commerce.view_customers',
  'commerce.manage_orders',
  'commerce.manage_fulfillment',
  'commerce.issue_refunds',
  'communications.send',
]

const DEPARTMENT_MANAGER_CAPABILITIES: AdminCapability[] = [
  ...OPERATIONS_VIEW,
  'workforce.manage',
  'workforce.publish',
  'communications.send',
  'audit.view',
]

export const ROLE_DEFAULT_CAPABILITIES: Readonly<Record<string, readonly AdminCapability[]>> = {
  owner: ALL_CAPABILITIES,
  admin: ALL_CAPABILITIES.filter(
    capability => ![
      'finance.pay',
      'contract.sign',
      'commerce.retry_payouts',
      'commerce.manage_payouts',
    ].includes(capability)
  ),
  tour_manager: TOUR_MANAGER_CAPABILITIES,
  production: PRODUCTION_CAPABILITIES,
  production_manager: PRODUCTION_CAPABILITIES,
  department_manager: DEPARTMENT_MANAGER_CAPABILITIES,
  finance: FINANCE_CAPABILITIES,
  finance_manager: FINANCE_CAPABILITIES,
  ticketing: TICKETING_CAPABILITIES,
  ticketing_manager: TICKETING_CAPABILITIES,
  viewer: OPERATIONS_VIEW,
  worker: [],
}

export function defaultAdminRolesForCapabilities(
  capabilities: readonly AdminCapability[],
  mode: 'anyOf' | 'allOf' = 'anyOf',
): string[] {
  if (capabilities.length === 0) return []
  return Object.entries(ROLE_DEFAULT_CAPABILITIES)
    .filter(([, defaults]) =>
      mode === 'allOf'
        ? capabilities.every((capability) => defaults.includes(capability))
        : capabilities.some((capability) => defaults.includes(capability)),
    )
    .map(([role]) => role)
}

const KNOWN_CAPABILITIES = new Set<string>(ADMIN_CAPABILITIES)

export function isAdminCapability(value: unknown): value is AdminCapability {
  return typeof value === 'string' && KNOWN_CAPABILITIES.has(value)
}

/**
 * Resolve effective capabilities for an organization role.
 *
 * Known default roles retain their product-contract capabilities and may gain
 * additive configured capabilities. Unknown/custom roles receive only catalog
 * capabilities explicitly configured for that role. Organization owners retain
 * the invariant full capability set.
 */
export function resolveAdminCapabilities(
  role: string | null | undefined,
  configuredPermissions?: unknown,
): AdminCapability[] {
  const normalizedRole = String(role || '').trim().toLowerCase()
  if (normalizedRole === 'owner') return [...ALL_CAPABILITIES]

  const configured = Array.isArray(configuredPermissions)
    ? configuredPermissions.filter(isAdminCapability)
    : []

  const defaults = ROLE_DEFAULT_CAPABILITIES[normalizedRole] || []
  return Array.from(new Set([...defaults, ...configured]))
}

export function hasAdminCapability(
  capabilities: readonly AdminCapability[],
  required: AdminCapability,
): boolean {
  return capabilities.includes(required)
}

export interface EntityCapabilityGrant {
  capability: AdminCapability
  /** ISO timestamp; null/undefined means no expiry */
  expiresAt?: string | null
  revokedAt?: string | null
  scopeType?: 'organization' | 'tour' | 'event' | 'site_map' | 'document'
  scopeId?: string | null
}

export interface AdminCapabilityTarget {
  type: 'organization' | 'tour' | 'event' | 'site_map' | 'document'
  id: string
}

export interface ResolveEffectiveAdminCapabilitiesInput {
  role: string | null | undefined
  /** Canonical custom-role capabilities; unknown strings are rejected. */
  customRoleCapabilities?: unknown
  /** Legacy role permission rows retained during schema convergence. */
  configuredPermissions?: unknown
  /** Creator/master is an invariant only while membership is active. */
  isOrganizationCreator?: boolean
  isMasterAccount?: boolean
  /** Membership must be explicitly active; every other/unknown state fails closed. */
  membershipStatus?: 'active' | 'revoked' | 'pending' | 'invited' | string | null
  membershipExpiresAt?: string | null
  orgId?: string | null
  target?: AdminCapabilityTarget | null
  /** Optional entity-scoped grants (SEC-204); expired grants are ignored. */
  grants?: EntityCapabilityGrant[]
  now?: Date
}

/**
 * SEC-102 — effective capabilities = role/catalog ∪ non-expired grants,
 * subject to membership state and owner invariant.
 */
export function resolveEffectiveAdminCapabilities(
  input: ResolveEffectiveAdminCapabilitiesInput,
): AdminCapability[] {
  const status = String(input.membershipStatus ?? '').trim().toLowerCase()
  if (status !== 'active') return []

  const now = input.now ?? new Date()
  if (input.membershipExpiresAt) {
    const membershipExpiry = new Date(input.membershipExpiresAt)
    if (!Number.isFinite(membershipExpiry.getTime()) || membershipExpiry.getTime() <= now.getTime())
      return []
  }

  if (input.isOrganizationCreator || input.isMasterAccount) return [...ALL_CAPABILITIES]

  const configured = [
    ...(Array.isArray(input.configuredPermissions) ? input.configuredPermissions : []),
    ...(Array.isArray(input.customRoleCapabilities) ? input.customRoleCapabilities : []),
  ]
  const base = resolveAdminCapabilities(input.role, configured)
  const grantCaps = (input.grants || [])
    .filter((grant) => {
      if (!isAdminCapability(grant.capability)) return false
      if (grant.revokedAt) return false
      if (!grant.expiresAt) return true
      const expires = new Date(grant.expiresAt)
      return Number.isFinite(expires.getTime()) && expires.getTime() > now.getTime()
    })
    .filter((grant) => {
      // Compatibility grants without scope are treated as organization grants
      // only. They never implicitly authorize an entity-targeted command.
      const scopeType = grant.scopeType ?? 'organization'
      if (scopeType === 'organization') {
        if (grant.scopeId && input.orgId && grant.scopeId !== input.orgId) return false
        return !input.target || input.target.type === 'organization'
      }
      return Boolean(
        input.target
        && input.target.type === scopeType
        && grant.scopeId
        && grant.scopeId === input.target.id,
      )
    })
    .map((grant) => grant.capability)

  return Array.from(new Set([...base, ...grantCaps]))
}

export function hasEffectiveAdminCapability(
  input: ResolveEffectiveAdminCapabilitiesInput,
  required: AdminCapability,
): boolean {
  return resolveEffectiveAdminCapabilities(input).includes(required)
}
