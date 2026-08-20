import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { assertOrgEntityReferences, OrgEntityAccessError } from "@/lib/admin/org-entity-access"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import {
  resolveActingAdminContext,
  type ActingAdminContext,
  type AuthenticatedAdminRequest,
} from "@/lib/auth/admin-context"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import {
  COMMERCE_PERMISSIONS,
  createCommerceContextFromAdmin,
  hasCommercePermission,
  normalizeCommercePermissions,
  type CommerceContext,
  type CommerceDisplayContext,
  type CommercePermission,
  type CommerceScope,
  type CommerceScopeType,
} from "@/lib/admin/commerce/context"
import { commerceErrorResponse } from "@/lib/admin/commerce/errors"

const DIRECT_COMMERCE_PERMISSION_MAP = Object.fromEntries(
  COMMERCE_PERMISSIONS.map((permission) => [permission, [permission] as const]),
) as Partial<Record<AdminCapability, readonly CommercePermission[]>>

export const ADMIN_TO_COMMERCE_PERMISSION_MAP: Readonly<
  Partial<Record<AdminCapability, readonly CommercePermission[]>>
> = {
  ...DIRECT_COMMERCE_PERMISSION_MAP,
  "audit.view": ["commerce.view_audit"],
  "finance.view": ["commerce.view", "commerce.view_financials"],
  "finance.manage": [
    "commerce.view",
    "commerce.view_financials",
    "commerce.manage_settlements",
    "commerce.manage_fees",
  ],
  "finance.approve": ["commerce.view", "commerce.view_financials", "commerce.manage_settlements"],
  "finance.pay": ["commerce.view", "commerce.view_financials", "commerce.manage_payouts"],
  "ticketing.view": ["commerce.view", "commerce.manage_orders"],
  "ticketing.manage": [
    "commerce.view",
    "commerce.manage_orders",
    "commerce.manage_fulfillment",
  ],
  "ticketing.refund": ["commerce.view", "commerce.view_financials", "commerce.issue_refunds"],
  "content.view": ["commerce.view"],
  "content.manage": ["commerce.view", "commerce.manage_cases", "commerce.manage_disputes"],
}

export interface CommerceScopeValidationArgs {
  request: NextRequest
  auth: AuthenticatedAdminRequest
  admin: ActingAdminContext
  scope: CommerceScope
}

export type CommerceScopeValidator = (
  args: CommerceScopeValidationArgs,
) => Promise<NextResponse | null> | NextResponse | null

export interface ResolveCommerceContextOptions {
  requiredPermission?: CommercePermission
  permissions?: readonly CommercePermission[]
  scope?: CommerceScope
  display?: Partial<CommerceDisplayContext>
  validateScope?: CommerceScopeValidator
}

export interface ResolvedCommerceContextInput extends ResolveCommerceContextOptions {
  request: NextRequest
  auth: AuthenticatedAdminRequest
  admin: ActingAdminContext
}

type CommerceScopeRow = { id?: string | null; seller_user_id?: string | null }

export function deriveCommercePermissionsFromAdminCapabilities(
  capabilities: readonly AdminCapability[],
): CommercePermission[] {
  const permissions = new Set<CommercePermission>()
  for (const capability of capabilities) {
    for (const permission of ADMIN_TO_COMMERCE_PERMISSION_MAP[capability] || []) {
      permissions.add(permission)
    }
  }
  return normalizeCommercePermissions(Array.from(permissions))
}

function readScopeType(value: string | null): CommerceScopeType | null {
  if (
    value === "platform"
    || value === "organization"
    || value === "venue"
    || value === "artist"
    || value === "event"
    || value === "seller"
  ) return value
  return null
}

export function parseCommerceScopeFromRequest(
  request: NextRequest,
  admin: Pick<ActingAdminContext, "orgId">,
): CommerceScope {
  const url = new URL(request.url)
  const explicitType = readScopeType(url.searchParams.get("commerce_scope_type"))
  const explicitId = url.searchParams.get("commerce_scope_id")
  const eventId = url.searchParams.get("event_id") || url.searchParams.get("eventId")
  const venueId = url.searchParams.get("venue_id") || url.searchParams.get("venueId")
  const artistId = url.searchParams.get("artist_id") || url.searchParams.get("artistId")
  const artistUserId = url.searchParams.get("artist_user_id") || url.searchParams.get("artistUserId")
  const sellerUserId = url.searchParams.get("seller_user_id") || url.searchParams.get("sellerUserId")
  const storefrontId = url.searchParams.get("storefront_id") || url.searchParams.get("storefrontId")

  if (explicitType) {
    const scopedId = explicitType === "organization" ? (explicitId || admin.orgId) : explicitId
    return {
      type: explicitType,
      id: scopedId,
      organizationId: admin.orgId,
      eventId: explicitType === "event" ? scopedId : eventId,
      venueId: explicitType === "venue" ? scopedId : venueId,
      artistId: explicitType === "artist" ? scopedId : artistId,
      artistUserId,
      sellerUserId: explicitType === "seller" ? scopedId : sellerUserId,
      storefrontId: explicitType === "seller" ? storefrontId || null : storefrontId,
    }
  }

  if (eventId) {
    return {
      type: "event",
      id: eventId,
      organizationId: admin.orgId,
      eventId,
    }
  }

  if (venueId) {
    return {
      type: "venue",
      id: venueId,
      organizationId: admin.orgId,
      venueId,
    }
  }

  if (artistId || artistUserId) {
    return {
      type: "artist",
      id: artistId || artistUserId,
      organizationId: admin.orgId,
      artistId,
      artistUserId,
    }
  }

  if (sellerUserId) {
    return {
      type: "seller",
      id: sellerUserId,
      organizationId: admin.orgId,
      sellerUserId,
      storefrontId,
    }
  }

  return {
    type: "organization",
    id: admin.orgId,
    organizationId: admin.orgId,
  }
}

async function queryScopedRecord(
  query: { maybeSingle: () => Promise<{ data: CommerceScopeRow | null; error: unknown }> },
  unavailableMessage: string,
  correlationId?: string | null,
): Promise<CommerceScopeRow | NextResponse | null> {
  const { data, error } = await query.maybeSingle()
  if (error) {
    return commerceErrorResponse({
      status: 503,
      code: "commerce_scope_unavailable",
      message: unavailableMessage,
      retryable: true,
      correlationId,
    })
  }
  return data?.id ? data : null
}

async function validateBuiltInCommerceScope({
  auth,
  admin,
  scope,
}: Pick<CommerceScopeValidationArgs, "auth" | "admin" | "scope">): Promise<NextResponse | null> {
  if (scope.type === "platform") {
    return commerceErrorResponse({
      status: 403,
      code: "commerce_platform_scope_unavailable",
      message: "Platform Commerce scope is not enabled for this admin resolver.",
      correlationId: admin.correlationId,
    })
  }

  if (scope.type === "organization") {
    if (scope.id !== admin.orgId) {
      return commerceErrorResponse({
        status: 403,
        code: "commerce_scope_denied",
        message: "Commerce organization scope must match the acting organization.",
        correlationId: admin.correlationId,
      })
    }
    return null
  }

  if (scope.type === "event") {
    const eventId = scope.eventId || scope.id
    if (!eventId) {
      return commerceErrorResponse({
        status: 422,
        code: "commerce_scope_required",
        message: "Event scope requires an event id.",
        correlationId: admin.correlationId,
      })
    }
    try {
      await assertOrgEntityReferences(auth.supabase, admin.orgId, { eventId })
      return null
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return commerceErrorResponse({
          status: error.status,
          code: error.code,
          message: error.message,
          retryable: error.status === 503,
          correlationId: admin.correlationId,
        })
      }
      return commerceErrorResponse({
        status: 503,
        code: "commerce_scope_unavailable",
        message: "Unable to verify Commerce event scope.",
        retryable: true,
        correlationId: admin.correlationId,
      })
    }
  }

  if (scope.type === "venue") {
    const venueId = scope.venueId || scope.id
    if (!venueId) {
      return commerceErrorResponse({
        status: 422,
        code: "commerce_scope_required",
        message: "Venue scope requires a venue id.",
        correlationId: admin.correlationId,
      })
    }
    const result = await queryScopedRecord(
      auth.supabase
        .from("events_v2")
        .select("id")
        .eq("org_id", admin.orgId)
        .eq("venue_id", venueId),
      "Unable to verify Commerce venue scope.",
      admin.correlationId,
    )
    if (result instanceof NextResponse) {
      result.headers.set("x-correlation-id", admin.correlationId)
      return result
    }
    if (!result) {
      return commerceErrorResponse({
        status: 404,
        code: "entity_not_found",
        message: "Venue not found in the acting organization.",
        correlationId: admin.correlationId,
      })
    }
    return null
  }

  if (scope.type === "artist") {
    const artistId = scope.artistId || scope.id
    const artistUserId = scope.artistUserId || null
    if (!artistId && !artistUserId) {
      return commerceErrorResponse({
        status: 422,
        code: "commerce_scope_required",
        message: "Artist scope requires an artist id.",
        correlationId: admin.correlationId,
      })
    }
    if (artistUserId && artistUserId === admin.userId) return null

    if (artistId) {
      const result = await queryScopedRecord(
        auth.supabase
          .from("organization_artist_members")
          .select("id")
          .eq("organizer_account_id", admin.profileId)
          .eq("artist_profile_id", artistId)
          .eq("status", "accepted"),
        "Unable to verify Commerce artist scope.",
        admin.correlationId,
      )
      if (result instanceof NextResponse) {
        result.headers.set("x-correlation-id", admin.correlationId)
        return result
      }
      if (result) return null
    }

    return commerceErrorResponse({
      status: 404,
      code: "entity_not_found",
      message: "Artist not found in the acting organization.",
      correlationId: admin.correlationId,
    })
  }

  if (scope.type === "seller") {
    const sellerUserId = scope.sellerUserId || scope.id
    if (!sellerUserId) {
      return commerceErrorResponse({
        status: 422,
        code: "commerce_scope_required",
        message: "Seller scope requires a seller user id.",
        correlationId: admin.correlationId,
      })
    }
    if (sellerUserId !== admin.userId) {
      return commerceErrorResponse({
        status: 403,
        code: "commerce_scope_denied",
        message: "Seller scope must match the acting organization owner until seller-org mapping is canonical.",
        correlationId: admin.correlationId,
      })
    }

    let query = auth.supabase
      .from("marketplace_storefronts")
      .select("id, seller_user_id")
      .eq("seller_user_id", sellerUserId)
    if (scope.storefrontId) query = query.eq("id", scope.storefrontId)

    const result = await queryScopedRecord(query, "Unable to verify Commerce seller scope.", admin.correlationId)
    if (result instanceof NextResponse) {
      result.headers.set("x-correlation-id", admin.correlationId)
      return result
    }
    if (!result) {
      return commerceErrorResponse({
        status: 404,
        code: "entity_not_found",
        message: "Seller storefront not found.",
        correlationId: admin.correlationId,
      })
    }
    return null
  }

  return commerceErrorResponse({
    status: 422,
    code: "commerce_scope_validation_unavailable",
    message: `Commerce ${scope.type} scope requires a route-specific validator.`,
    correlationId: admin.correlationId,
  })
}

export async function resolveCommerceContextForAdmin({
  request,
  auth,
  admin,
  requiredPermission,
  permissions,
  scope,
  display,
  validateScope,
}: ResolvedCommerceContextInput): Promise<CommerceContext | NextResponse> {
  const resolvedScope = scope ?? parseCommerceScopeFromRequest(request, admin)
  const builtInDenied = await validateBuiltInCommerceScope({ auth, admin, scope: resolvedScope })
  if (builtInDenied) return builtInDenied

  if (validateScope) {
    const routeDenied = await validateScope({ request, auth, admin, scope: resolvedScope })
    if (routeDenied) return routeDenied
  }

  const context = createCommerceContextFromAdmin({
    admin,
    scope: resolvedScope,
    permissions: permissions ?? deriveCommercePermissionsFromAdminCapabilities(admin.capabilities),
    display,
  })

  if (requiredPermission && !hasCommercePermission(context.permissions, requiredPermission)) {
    return commerceErrorResponse({
      status: 403,
      code: "commerce_permission_denied",
      message: `This action requires the ${requiredPermission} permission.`,
      correlationId: admin.correlationId,
    })
  }

  return context
}

export async function resolveCommerceContext(
  request: NextRequest,
  options: ResolveCommerceContextOptions = {},
): Promise<CommerceContext | NextResponse> {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return commerceErrorResponse({
      status: 401,
      code: "unauthenticated",
      message: "Authentication required.",
    })
  }

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  return resolveCommerceContextForAdmin({
    request,
    auth,
    admin,
    ...options,
  })
}

export function withCommerceContext(
  requiredPermission: CommercePermission,
  handler: (
    request: NextRequest,
    context: CommerceContext,
  ) => Promise<NextResponse> | NextResponse,
  options: Omit<ResolveCommerceContextOptions, "requiredPermission"> = {},
) {
  return async (request: NextRequest) => {
    const context = await resolveCommerceContext(request, {
      ...options,
      requiredPermission,
    })
    if (context instanceof NextResponse) return context
    return handler(request, context)
  }
}
