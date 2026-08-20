import type { ActingAdminContext } from "@/lib/auth/admin-context"

export const COMMERCE_SCOPE_TYPES = [
  "platform",
  "organization",
  "venue",
  "artist",
  "event",
  "seller",
] as const

export type CommerceScopeType = (typeof COMMERCE_SCOPE_TYPES)[number]

export const COMMERCE_PERMISSIONS = [
  "commerce.view",
  "commerce.view_customers",
  "commerce.view_seller_pii",
  "commerce.manage_orders",
  "commerce.manage_fulfillment",
  "commerce.manage_listings",
  "commerce.manage_sellers",
  "commerce.manage_cases",
  "commerce.manage_disputes",
  "commerce.issue_refunds",
  "commerce.view_financials",
  "commerce.retry_payouts",
  "commerce.manage_payouts",
  "commerce.manage_settlements",
  "commerce.manage_fees",
  "commerce.manage_subscriptions",
  "commerce.export",
  "commerce.view_audit",
] as const

export type CommercePermission = (typeof COMMERCE_PERMISSIONS)[number]

const COMMERCE_PERMISSION_SET = new Set<string>(COMMERCE_PERMISSIONS)

export type CommercePermissionCategory =
  | "overview"
  | "customer_data"
  | "seller_data"
  | "orders"
  | "fulfillment"
  | "listings"
  | "sellers"
  | "cases"
  | "refunds"
  | "financials"
  | "payouts"
  | "settlements"
  | "fees"
  | "subscriptions"
  | "exports"
  | "audit"

export type CommercePermissionRisk = "read" | "write" | "sensitive" | "financial" | "audit"

export interface CommercePermissionDefinition {
  permission: CommercePermission
  category: CommercePermissionCategory
  risk: CommercePermissionRisk
  implies?: readonly CommercePermission[]
}

export const COMMERCE_PERMISSION_DEFINITIONS: Readonly<Record<CommercePermission, CommercePermissionDefinition>> = {
  "commerce.view": { permission: "commerce.view", category: "overview", risk: "read" },
  "commerce.view_customers": {
    permission: "commerce.view_customers",
    category: "customer_data",
    risk: "sensitive",
    implies: ["commerce.view"],
  },
  "commerce.view_seller_pii": {
    permission: "commerce.view_seller_pii",
    category: "seller_data",
    risk: "sensitive",
    implies: ["commerce.view"],
  },
  "commerce.manage_orders": {
    permission: "commerce.manage_orders",
    category: "orders",
    risk: "write",
    implies: ["commerce.view"],
  },
  "commerce.manage_fulfillment": {
    permission: "commerce.manage_fulfillment",
    category: "fulfillment",
    risk: "write",
    implies: ["commerce.view"],
  },
  "commerce.manage_listings": {
    permission: "commerce.manage_listings",
    category: "listings",
    risk: "write",
    implies: ["commerce.view"],
  },
  "commerce.manage_sellers": {
    permission: "commerce.manage_sellers",
    category: "sellers",
    risk: "write",
    implies: ["commerce.view"],
  },
  "commerce.manage_cases": {
    permission: "commerce.manage_cases",
    category: "cases",
    risk: "write",
    implies: ["commerce.view"],
  },
  "commerce.manage_disputes": {
    permission: "commerce.manage_disputes",
    category: "cases",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.issue_refunds": {
    permission: "commerce.issue_refunds",
    category: "refunds",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.view_financials": {
    permission: "commerce.view_financials",
    category: "financials",
    risk: "financial",
    implies: ["commerce.view"],
  },
  "commerce.retry_payouts": {
    permission: "commerce.retry_payouts",
    category: "payouts",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.manage_payouts": {
    permission: "commerce.manage_payouts",
    category: "payouts",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials", "commerce.retry_payouts"],
  },
  "commerce.manage_settlements": {
    permission: "commerce.manage_settlements",
    category: "settlements",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.manage_fees": {
    permission: "commerce.manage_fees",
    category: "fees",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.manage_subscriptions": {
    permission: "commerce.manage_subscriptions",
    category: "subscriptions",
    risk: "financial",
    implies: ["commerce.view", "commerce.view_financials"],
  },
  "commerce.export": {
    permission: "commerce.export",
    category: "exports",
    risk: "sensitive",
    implies: ["commerce.view"],
  },
  "commerce.view_audit": { permission: "commerce.view_audit", category: "audit", risk: "audit" },
}

export const HIGH_RISK_COMMERCE_PERMISSIONS = COMMERCE_PERMISSIONS.filter((permission) =>
  ["financial", "audit"].includes(COMMERCE_PERMISSION_DEFINITIONS[permission].risk),
)

export interface CommerceActorContext {
  userId: string
  profileId: string | null
  membershipRole?: string | null
}

export interface CommerceScope {
  type: CommerceScopeType
  id: string | null
  /** Organization anchor for child scopes such as event or seller. */
  organizationId?: string | null
  eventId?: string | null
  venueId?: string | null
  artistId?: string | null
  artistUserId?: string | null
  sellerUserId?: string | null
  storefrontId?: string | null
}

export interface CommercePermissionSet {
  permissions: readonly CommercePermission[]
}

export interface CommerceDisplayContext {
  name: string
  timezone: string
  defaultCurrency: string
}

export interface CommerceRequestContext {
  correlationId: string
  source: "header" | "session" | "system"
}

export interface CommerceContext {
  actor: CommerceActorContext
  scope: CommerceScope
  permissions: CommercePermissionSet
  display: CommerceDisplayContext
  request: CommerceRequestContext
  /**
   * Link to the already-verified Admin context. Commerce code can inspect this
   * during migration, but must not use it as a substitute for Commerce permissions.
   */
  admin: Pick<
    ActingAdminContext,
    "orgId" | "profileId" | "membershipRole" | "capabilities" | "correlationId" | "source"
  >
}

export interface CommerceContextFromAdminInput {
  admin: ActingAdminContext
  permissions?: readonly CommercePermission[]
  scope?: CommerceScope
  display?: Partial<CommerceDisplayContext>
}

export function isCommercePermission(value: unknown): value is CommercePermission {
  return typeof value === "string" && COMMERCE_PERMISSION_SET.has(value)
}

export function normalizeCommercePermissions(
  permissions: readonly unknown[] = [],
): CommercePermission[] {
  const normalized = new Set<CommercePermission>()
  const addPermission = (permission: CommercePermission) => {
    if (normalized.has(permission)) return
    normalized.add(permission)
    for (const implied of COMMERCE_PERMISSION_DEFINITIONS[permission].implies || []) {
      addPermission(implied)
    }
  }

  for (const permission of permissions) {
    if (isCommercePermission(permission)) addPermission(permission)
  }

  return COMMERCE_PERMISSIONS.filter((permission) => normalized.has(permission))
}

export function createCommercePermissionSet(
  permissions: readonly unknown[] = [],
): CommercePermissionSet {
  return { permissions: normalizeCommercePermissions(permissions) }
}

export function hasCommercePermission(
  permissionSet: CommercePermissionSet,
  permission: CommercePermission,
): boolean {
  return permissionSet.permissions.includes(permission)
}

export function assertCommercePermission(
  permissionSet: CommercePermissionSet,
  permission: CommercePermission,
): void {
  if (!hasCommercePermission(permissionSet, permission)) {
    throw new Error(`Commerce permission denied: ${permission}`)
  }
}

export function hasAnyCommercePermission(
  permissionSet: CommercePermissionSet,
  permissions: readonly CommercePermission[],
): boolean {
  return permissions.some((permission) => hasCommercePermission(permissionSet, permission))
}

export function hasAllCommercePermissions(
  permissionSet: CommercePermissionSet,
  permissions: readonly CommercePermission[],
): boolean {
  return permissions.every((permission) => hasCommercePermission(permissionSet, permission))
}

export function assertAnyCommercePermission(
  permissionSet: CommercePermissionSet,
  permissions: readonly CommercePermission[],
): void {
  if (!hasAnyCommercePermission(permissionSet, permissions)) {
    throw new Error(`Commerce permission denied: one of ${permissions.join(", ")}`)
  }
}

export function requiresHighRiskCommercePermission(permission: CommercePermission): boolean {
  return HIGH_RISK_COMMERCE_PERMISSIONS.includes(permission)
}

export function createCommerceContextFromAdmin({
  admin,
  permissions = [],
  scope,
  display,
}: CommerceContextFromAdminInput): CommerceContext {
  const resolvedScope: CommerceScope = scope ?? {
    type: "organization",
    id: admin.orgId,
    organizationId: admin.orgId,
  }

  if (resolvedScope.type !== "platform" && !resolvedScope.id) {
    throw new Error("Commerce scope id is required for non-platform scopes.")
  }

  return {
    actor: {
      userId: admin.userId,
      profileId: admin.profileId,
      membershipRole: admin.membershipRole,
    },
    scope: {
      ...resolvedScope,
      organizationId: resolvedScope.organizationId ?? admin.orgId,
    },
    permissions: createCommercePermissionSet(permissions),
    display: {
      name: display?.name || "Commerce Operations",
      timezone: display?.timezone || "UTC",
      defaultCurrency: (display?.defaultCurrency || "USD").toUpperCase(),
    },
    request: {
      correlationId: admin.correlationId,
      source: admin.source,
    },
    admin: {
      orgId: admin.orgId,
      profileId: admin.profileId,
      membershipRole: admin.membershipRole,
      capabilities: admin.capabilities,
      correlationId: admin.correlationId,
      source: admin.source,
    },
  }
}
