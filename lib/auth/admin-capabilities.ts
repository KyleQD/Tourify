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
  'workforce.view',
  'workforce.manage',
  'workforce.publish',
  'hiring.manage',
  'vendor.view',
  'vendor.manage',
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
  'workforce.manage',
  'workforce.publish',
  'hiring.manage',
  'vendor.manage',
  'site_map.edit',
  'site_map.share',
  'communications.send',
  'communications.broadcast',
  'audit.view',
]

const ROLE_DEFAULT_CAPABILITIES: Record<string, readonly AdminCapability[]> = {
  owner: ALL_CAPABILITIES,
  admin: ALL_CAPABILITIES.filter(
    capability => !['finance.pay', 'contract.sign'].includes(capability)
  ),
  tour_manager: TOUR_MANAGER_CAPABILITIES,
  production: TOUR_MANAGER_CAPABILITIES.filter(
    capability => !['tour.archive', 'tour.publish', 'hiring.manage'].includes(capability)
  ),
  finance: [
    ...OPERATIONS_VIEW,
    'finance.manage',
    'finance.approve',
    'finance.pay',
    'contract.view',
    'vendor.view',
    'audit.view',
  ],
  ticketing: [
    'tour.view',
    'event.view',
    'ticketing.view',
    'ticketing.manage',
    'ticketing.scan',
    'ticketing.refund',
    'communications.send',
  ],
  viewer: OPERATIONS_VIEW,
}

const KNOWN_CAPABILITIES = new Set<string>(ADMIN_CAPABILITIES)

export function isAdminCapability(value: unknown): value is AdminCapability {
  return typeof value === 'string' && KNOWN_CAPABILITIES.has(value)
}

/**
 * Resolve effective capabilities for an organization role.
 *
 * `org_role_permissions` predates the canonical Admin capability catalog. During
 * rollout, rows without `tour.view` are treated as legacy and use the safe
 * application role defaults. Once the security migration has run, the database
 * row is authoritative for every non-owner role. Organization owners retain the
 * invariant full capability set.
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

  const hasCanonicalCatalog = configured.includes('tour.view')
  const source = hasCanonicalCatalog
    ? configured
    : ROLE_DEFAULT_CAPABILITIES[normalizedRole] || []

  return Array.from(new Set(source))
}

export function hasAdminCapability(
  capabilities: readonly AdminCapability[],
  required: AdminCapability,
): boolean {
  return capabilities.includes(required)
}
