/**
 * SEC-204 — Delegated / external entity grants.
 *
 * Venue/vendor/contractor links grant only named resources + actions,
 * expire automatically, and cannot enumerate organization data.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { isAdminCapability } from "@/lib/auth/admin-capabilities"
import type { ProtectedDataClass } from "@/lib/admin/protected-data-policy"
import { PROTECTED_DATA_CLASS_POLICIES } from "@/lib/admin/protected-data-policy"

export const ENTITY_GRANT_GRANTEE_TYPES = [
  "user",
  "venue",
  "vendor",
  "contractor",
  "external_email",
] as const

export type EntityGrantGranteeType = (typeof ENTITY_GRANT_GRANTEE_TYPES)[number]

export const ENTITY_GRANT_RESOURCE_TYPES = [
  "tour",
  "event",
  "site_map",
  "document",
  "publication",
] as const

export type EntityGrantResourceType = (typeof ENTITY_GRANT_RESOURCE_TYPES)[number]

export const ENTITY_GRANT_STATUSES = ["active", "revoked", "expired"] as const
export type EntityGrantStatus = (typeof ENTITY_GRANT_STATUSES)[number]

/** Caps that may be delegated externally (never finance.pay / org.roles.manage / etc.). */
export const DELEGATABLE_CAPABILITIES = [
  "tour.view",
  "event.view",
  "logistics.view",
  "advance.manage",
  "site_map.view",
  "vendor.view",
  "contract.view",
  "workforce.view",
] as const satisfies readonly AdminCapability[]

export type DelegatableCapability = (typeof DELEGATABLE_CAPABILITIES)[number]

const DELEGATABLE_SET = new Set<string>(DELEGATABLE_CAPABILITIES)
const PROTECTED_CLASS_SET = new Set(
  PROTECTED_DATA_CLASS_POLICIES.map((row) => row.class),
)

export interface EntityGrantRecord {
  id: string
  orgId: string
  granteeType: EntityGrantGranteeType
  granteeUserId?: string | null
  granteeVenueId?: string | null
  granteeVendorId?: string | null
  granteeEmail?: string | null
  resourceType: EntityGrantResourceType
  resourceId: string
  capabilities: readonly string[]
  protectedDataClasses: readonly string[]
  status: EntityGrantStatus
  expiresAt: string
  revokedAt?: string | null
  createdBy?: string | null
  reason?: string | null
}

export type EntityGrantEvaluation =
  | { ok: true; grant: EntityGrantRecord; effectiveCapabilities: AdminCapability[] }
  | {
      ok: false
      code:
        | "grant_inactive"
        | "grant_expired"
        | "grant_revoked"
        | "resource_mismatch"
        | "capability_not_granted"
        | "capability_not_delegatable"
        | "protected_class_denied"
      message: string
    }

export function isDelegatableCapability(value: unknown): value is DelegatableCapability {
  return typeof value === "string" && DELEGATABLE_SET.has(value)
}

export function isProtectedDataClassName(value: unknown): value is ProtectedDataClass {
  return typeof value === "string" && PROTECTED_CLASS_SET.has(value as ProtectedDataClass)
}

export function normalizeEntityGrantCapabilities(
  capabilities: readonly string[],
): { ok: true; capabilities: DelegatableCapability[] } | { ok: false; invalid: string[] } {
  const invalid: string[] = []
  const next: DelegatableCapability[] = []
  for (const cap of capabilities) {
    if (!isDelegatableCapability(cap)) {
      invalid.push(cap)
      continue
    }
    if (!next.includes(cap)) next.push(cap)
  }
  if (invalid.length) return { ok: false, invalid }
  return { ok: true, capabilities: next }
}

export function isEntityGrantExpired(
  grant: Pick<EntityGrantRecord, "expiresAt" | "status">,
  nowMs = Date.now(),
): boolean {
  if (grant.status === "expired") return true
  const expires = Date.parse(grant.expiresAt)
  return Number.isFinite(expires) && expires <= nowMs
}

export function isEntityGrantActive(
  grant: Pick<EntityGrantRecord, "status" | "expiresAt" | "revokedAt">,
  nowMs = Date.now(),
): boolean {
  if (grant.status === "revoked" || grant.revokedAt) return false
  if (isEntityGrantExpired(grant, nowMs)) return false
  return grant.status === "active"
}

export function evaluateEntityGrantAccess(args: {
  grant: EntityGrantRecord
  resourceType: EntityGrantResourceType
  resourceId: string
  capability: AdminCapability
  protectedDataClass?: ProtectedDataClass | null
  nowMs?: number
}): EntityGrantEvaluation {
  const nowMs = args.nowMs ?? Date.now()
  const { grant } = args

  if (grant.status === "revoked" || grant.revokedAt) {
    return {
      ok: false,
      code: "grant_revoked",
      message: "This delegated grant has been revoked.",
    }
  }

  if (isEntityGrantExpired(grant, nowMs)) {
    return {
      ok: false,
      code: "grant_expired",
      message: "This delegated grant has expired.",
    }
  }

  if (grant.status !== "active") {
    return {
      ok: false,
      code: "grant_inactive",
      message: "This delegated grant is not active.",
    }
  }

  if (
    grant.resourceType !== args.resourceType
    || grant.resourceId !== args.resourceId
  ) {
    return {
      ok: false,
      code: "resource_mismatch",
      message: "Grant does not cover this resource.",
    }
  }

  if (!isDelegatableCapability(args.capability)) {
    return {
      ok: false,
      code: "capability_not_delegatable",
      message: `Capability ${args.capability} cannot be delegated externally.`,
    }
  }

  if (!grant.capabilities.includes(args.capability)) {
    return {
      ok: false,
      code: "capability_not_granted",
      message: `Capability ${args.capability} is not included in this grant.`,
    }
  }

  if (args.protectedDataClass) {
    if (!grant.protectedDataClasses.includes(args.protectedDataClass)) {
      return {
        ok: false,
        code: "protected_class_denied",
        message: `Protected data class ${args.protectedDataClass} is not included in this grant.`,
      }
    }
  }

  const effectiveCapabilities = grant.capabilities.filter(isAdminCapability)
  return { ok: true, grant, effectiveCapabilities }
}

/**
 * External principals must only see their granted resource IDs —
 * never an organization catalog / enumeration.
 */
export function filterEnumerableResourcesForGrantee(args: {
  requestedResourceIds: readonly string[]
  grants: readonly EntityGrantRecord[]
  resourceType: EntityGrantResourceType
  nowMs?: number
}): string[] {
  const nowMs = args.nowMs ?? Date.now()
  const allowed = new Set(
    args.grants
      .filter(
        (grant) =>
          grant.resourceType === args.resourceType && isEntityGrantActive(grant, nowMs),
      )
      .map((grant) => grant.resourceId),
  )
  return args.requestedResourceIds.filter((id) => allowed.has(id))
}

/** Deny org-wide list queries for pure external grantees (no org membership). */
export function assertExternalCannotEnumerateOrg(args: {
  isOrgMember: boolean
  listMode: "org_catalog" | "granted_resources" | "single_resource"
}): { ok: true } | { ok: false; code: "enumeration_denied"; message: string } {
  if (args.isOrgMember) return { ok: true }
  if (args.listMode === "org_catalog") {
    return {
      ok: false,
      code: "enumeration_denied",
      message: "External delegates cannot enumerate organization resources.",
    }
  }
  return { ok: true }
}

export function mapEntityGrantRow(row: Record<string, unknown>): EntityGrantRecord {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    granteeType: row.grantee_type as EntityGrantGranteeType,
    granteeUserId: (row.grantee_user_id as string | null) ?? null,
    granteeVenueId: (row.grantee_venue_id as string | null) ?? null,
    granteeVendorId: (row.grantee_vendor_id as string | null) ?? null,
    granteeEmail: (row.grantee_email as string | null) ?? null,
    resourceType: row.resource_type as EntityGrantResourceType,
    resourceId: String(row.resource_id),
    capabilities: Array.isArray(row.capabilities)
      ? row.capabilities.map(String)
      : [],
    protectedDataClasses: Array.isArray(row.protected_data_classes)
      ? row.protected_data_classes.map(String)
      : [],
    status: (row.status as EntityGrantStatus) || "active",
    expiresAt: String(row.expires_at),
    revokedAt: (row.revoked_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
  }
}

export function buildEntityGrantInsert(args: {
  orgId: string
  actorUserId: string
  granteeType: EntityGrantGranteeType
  granteeUserId?: string | null
  granteeVenueId?: string | null
  granteeVendorId?: string | null
  granteeEmail?: string | null
  resourceType: EntityGrantResourceType
  resourceId: string
  capabilities: readonly DelegatableCapability[]
  protectedDataClasses?: readonly ProtectedDataClass[]
  expiresAt: string
  reason?: string | null
}): Record<string, unknown> {
  const expires = Date.parse(args.expiresAt)
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    throw new EntityGrantValidationError(
      "expires_at must be a future timestamp.",
      "expires_at_invalid",
    )
  }

  const caps = normalizeEntityGrantCapabilities(args.capabilities)
  if (!caps.ok) {
    throw new EntityGrantValidationError(
      `Non-delegatable capabilities: ${caps.invalid.join(", ")}`,
      "capability_not_delegatable",
    )
  }

  const classes = (args.protectedDataClasses || []).filter(isProtectedDataClassName)

  return {
    org_id: args.orgId,
    grantee_type: args.granteeType,
    grantee_user_id: args.granteeUserId ?? null,
    grantee_venue_id: args.granteeVenueId ?? null,
    grantee_vendor_id: args.granteeVendorId ?? null,
    grantee_email: args.granteeEmail?.trim() || null,
    resource_type: args.resourceType,
    resource_id: args.resourceId,
    capabilities: caps.capabilities,
    protected_data_classes: classes,
    status: "active",
    expires_at: new Date(expires).toISOString(),
    created_by: args.actorUserId,
    reason: args.reason?.trim() || null,
  }
}

export class EntityGrantValidationError extends Error {
  readonly status = 422
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "EntityGrantValidationError"
    this.code = code
  }
}

export class EntityGrantAccessError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, code: string, status = 403) {
    super(message)
    this.name = "EntityGrantAccessError"
    this.code = code
    this.status = status
  }
}
