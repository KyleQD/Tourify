import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it, vi } from "vitest"

import {
  resolveCommerceContextForAdmin,
  type CommerceScopeValidationArgs,
} from "@/lib/admin/commerce/resolve-context"
import { commerceErrorResponse } from "@/lib/admin/commerce/errors"
import type { ActingAdminContext, AuthenticatedAdminRequest } from "@/lib/auth/admin-context"

const adminContext: ActingAdminContext = {
  userId: "user-a",
  profileId: "profile-a",
  accountType: "organization",
  orgId: "org-a",
  membershipRole: "finance",
  capabilities: ["commerce.view", "commerce.manage_orders", "commerce.manage_payouts"],
  source: "header",
  scope: "organization",
  allowedTourIds: [],
  correlationId: "request-cross-scope",
}

function authWithEventOrg(events: Record<string, string> = {}): AuthenticatedAdminRequest {
  const filters: Array<[string, unknown]> = []
  return {
    user: { id: "user-a" },
    supabase: {
      from(table: string) {
        const builder = {
          select: () => builder,
          eq(column: string, value: unknown) {
            if (table === "events_v2") filters.push([column, value])
            return builder
          },
          maybeSingle: async () => {
            const id = filters.find(([column]) => column === "id")?.[1]
            const orgId = filters.find(([column]) => column === "org_id")?.[1]
            if (typeof id === "string" && events[id] === orgId) {
              return { data: { id, org_id: orgId }, error: null }
            }
            return { data: null, error: null }
          },
        }
        return builder
      },
    },
  } as AuthenticatedAdminRequest
}

describe("COM-040 Commerce cross-scope API tests", () => {
  it("denies cross-organization event scopes before route handlers can read commerce data", async () => {
    const routeValidator = vi.fn()
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/orders?event_id=event-b"),
      auth: authWithEventOrg({ "event-b": "org-b" }),
      admin: adminContext,
      requiredPermission: "commerce.view",
      validateScope: routeValidator,
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect(routeValidator).not.toHaveBeenCalled()
    expect((response as NextResponse).status).toBe(404)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: { code: "entity_not_found" },
      correlationId: "request-cross-scope",
    })
  })

  it("lets route validators deny domain-specific cross-scope API access", async () => {
    const routeValidator = vi.fn(({ request, admin }: CommerceScopeValidationArgs) => {
      const sellerUserId = request.nextUrl.searchParams.get("seller_user_id")
      if (sellerUserId && sellerUserId !== admin.userId) {
        return commerceErrorResponse({
          status: 403,
          code: "commerce_scope_denied",
          message: "Seller route scope does not match the acting seller.",
          correlationId: admin.correlationId,
        })
      }
      return null
    })

    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/listings?seller_user_id=seller-b"),
      auth: authWithEventOrg(),
      admin: adminContext,
      requiredPermission: "commerce.view",
      scope: {
        type: "organization",
        id: "org-a",
        organizationId: "org-a",
      },
      validateScope: routeValidator,
    })

    expect(routeValidator).toHaveBeenCalledTimes(1)
    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: { code: "commerce_scope_denied" },
      correlationId: "request-cross-scope",
    })
  })

  it("does not promote valid scope into missing high-risk permissions", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/payouts"),
      auth: authWithEventOrg(),
      admin: {
        ...adminContext,
        capabilities: ["commerce.view"],
      },
      requiredPermission: "commerce.manage_payouts",
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: { code: "commerce_permission_denied" },
      correlationId: "request-cross-scope",
    })
  })
})
