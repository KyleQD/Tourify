import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import {
  deriveCommercePermissionsFromAdminCapabilities,
  parseCommerceScopeFromRequest,
  resolveCommerceContextForAdmin,
} from "@/lib/admin/commerce/resolve-context"
import type { ActingAdminContext, AuthenticatedAdminRequest } from "@/lib/auth/admin-context"

const adminContext: ActingAdminContext = {
  userId: "user-a",
  profileId: "profile-a",
  accountType: "organization",
  orgId: "org-a",
  membershipRole: "finance",
  capabilities: ["finance.view", "finance.manage", "ticketing.refund"],
  source: "header",
  scope: "organization",
  allowedTourIds: [],
  correlationId: "request-abcdef",
}

interface MockAuthRows {
  events?: Record<string, { org_id: string; venue_id?: string | null }>
  storefronts?: Record<string, { seller_user_id: string }>
  artistMemberships?: Array<{ organizer_account_id: string; artist_profile_id: string; status: string }>
}

function mockAuth(rows: MockAuthRows = {}): AuthenticatedAdminRequest {
  const filters: Record<string, Array<[string, unknown]>> = {}
  return {
    user: { id: "user-a" },
    supabase: {
      filters,
      from(table: string) {
        const builder = {
          select: () => builder,
          eq(column: string, value: unknown) {
            filters[table] ||= []
            filters[table].push([column, value])
            return builder
          },
          maybeSingle: async () => {
            if (table === "events_v2") {
              const tableFilters = filters.events_v2 || []
              const id = tableFilters.find(([column]) => column === "id")?.[1]
              const orgId = tableFilters.find(([column]) => column === "org_id")?.[1]
              const venueId = tableFilters.find(([column]) => column === "venue_id")?.[1]
              const match = Object.entries(rows.events || {}).find(([rowId, row]) => {
                if (id && rowId !== id) return false
                if (orgId && row.org_id !== orgId) return false
                if (venueId && row.venue_id !== venueId) return false
                return true
              })
              return match
                ? { data: { id: match[0], org_id: match[1].org_id, venue_id: match[1].venue_id }, error: null }
                : { data: null, error: null }
            }

            if (table === "marketplace_storefronts") {
              const tableFilters = filters.marketplace_storefronts || []
              const id = tableFilters.find(([column]) => column === "id")?.[1]
              const sellerUserId = tableFilters.find(([column]) => column === "seller_user_id")?.[1]
              const match = Object.entries(rows.storefronts || {}).find(([rowId, row]) => {
                if (id && rowId !== id) return false
                if (sellerUserId && row.seller_user_id !== sellerUserId) return false
                return true
              })
              return match
                ? { data: { id: match[0], seller_user_id: match[1].seller_user_id }, error: null }
                : { data: null, error: null }
            }

            if (table === "organization_artist_members") {
              const tableFilters = filters.organization_artist_members || []
              const organizerAccountId = tableFilters.find(([column]) => column === "organizer_account_id")?.[1]
              const artistProfileId = tableFilters.find(([column]) => column === "artist_profile_id")?.[1]
              const status = tableFilters.find(([column]) => column === "status")?.[1]
              const match = (rows.artistMemberships || []).find((row) => {
                if (organizerAccountId && row.organizer_account_id !== organizerAccountId) return false
                if (artistProfileId && row.artist_profile_id !== artistProfileId) return false
                if (status && row.status !== status) return false
                return true
              })
              return match ? { data: { id: "artist-membership-a" }, error: null } : { data: null, error: null }
            }

            return { data: null, error: null }
          },
        }
        return builder
      },
    },
  } as AuthenticatedAdminRequest
}

describe("COM-024 server-side CommerceContext resolver", () => {
  it("derives conservative Commerce permissions from existing admin capabilities", () => {
    expect(deriveCommercePermissionsFromAdminCapabilities([
      "finance.view",
      "finance.manage",
      "finance.pay",
      "ticketing.refund",
    ])).toEqual([
      "commerce.view",
      "commerce.issue_refunds",
      "commerce.view_financials",
      "commerce.retry_payouts",
      "commerce.manage_payouts",
      "commerce.manage_settlements",
      "commerce.manage_fees",
    ])
  })

  it("preserves direct Commerce permissions from the admin capability catalog", () => {
    expect(deriveCommercePermissionsFromAdminCapabilities([
      "commerce.manage_sellers",
      "commerce.export",
    ])).toEqual([
      "commerce.view",
      "commerce.manage_sellers",
      "commerce.export",
    ])
  })

  it("parses event, venue, artist, and seller child scopes from request parameters", () => {
    expect(parseCommerceScopeFromRequest(
      new NextRequest("http://localhost/api/admin/commerce/orders?event_id=event-a"),
      { orgId: "org-a" },
    )).toEqual({
      type: "event",
      id: "event-a",
      organizationId: "org-a",
      eventId: "event-a",
    })

    expect(parseCommerceScopeFromRequest(
      new NextRequest("http://localhost/api/admin/commerce/orders?seller_user_id=seller-a"),
      { orgId: "org-a" },
    )).toEqual({
      type: "seller",
      id: "seller-a",
      organizationId: "org-a",
      sellerUserId: "seller-a",
      storefrontId: null,
    })

    expect(parseCommerceScopeFromRequest(
      new NextRequest("http://localhost/api/admin/commerce/orders?venue_id=venue-a"),
      { orgId: "org-a" },
    )).toEqual({
      type: "venue",
      id: "venue-a",
      organizationId: "org-a",
      venueId: "venue-a",
    })

    expect(parseCommerceScopeFromRequest(
      new NextRequest("http://localhost/api/admin/commerce/orders?artist_id=artist-a"),
      { orgId: "org-a" },
    )).toEqual({
      type: "artist",
      id: "artist-a",
      organizationId: "org-a",
      artistId: "artist-a",
      artistUserId: null,
    })
  })

  it("resolves default organization scope from the verified admin context", async () => {
    const context = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/overview"),
      auth: mockAuth(),
      admin: adminContext,
      requiredPermission: "commerce.manage_settlements",
    })

    expect(context).not.toBeInstanceOf(NextResponse)
    expect((context as any).scope).toMatchObject({
      type: "organization",
      id: "org-a",
      organizationId: "org-a",
    })
    expect((context as any).permissions.permissions).toContain("commerce.manage_settlements")
    expect((context as any).request.correlationId).toBe("request-abcdef")
  })

  it("validates event scope against the acting organization", async () => {
    const context = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/tickets?event_id=event-a"),
      auth: mockAuth({ events: { "event-a": { org_id: "org-a" } } }),
      admin: adminContext,
      requiredPermission: "commerce.issue_refunds",
    })

    expect(context).not.toBeInstanceOf(NextResponse)
    expect((context as any).scope).toMatchObject({
      type: "event",
      id: "event-a",
      organizationId: "org-a",
    })
  })

  it("denies event scope outside the acting organization", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/tickets?event_id=event-b"),
      auth: mockAuth({ events: { "event-b": { org_id: "org-b" } } }),
      admin: adminContext,
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(404)
    expect((response as NextResponse).headers.get("x-correlation-id")).toBe("request-abcdef")
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: {
        code: "entity_not_found",
        retryable: false,
      },
      correlationId: "request-abcdef",
    })
  })

  it("denies platform scope by default", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/overview?commerce_scope_type=platform"),
      auth: mockAuth(),
      admin: adminContext,
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: {
        code: "commerce_platform_scope_unavailable",
        retryable: false,
      },
      correlationId: "request-abcdef",
    })
  })

  it("denies organization scope outside the acting organization", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/overview?commerce_scope_type=organization&commerce_scope_id=org-b"),
      auth: mockAuth(),
      admin: adminContext,
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: {
        code: "commerce_scope_denied",
        retryable: false,
      },
      correlationId: "request-abcdef",
    })
  })

  it("validates venue scope against events in the acting organization", async () => {
    const context = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/orders?venue_id=venue-a"),
      auth: mockAuth({ events: { "event-a": { org_id: "org-a", venue_id: "venue-a" } } }),
      admin: adminContext,
      requiredPermission: "commerce.view",
    })

    expect(context).not.toBeInstanceOf(NextResponse)
    expect((context as any).scope).toMatchObject({
      type: "venue",
      id: "venue-a",
      organizationId: "org-a",
      venueId: "venue-a",
    })
  })

  it("validates artist scope against accepted organization roster membership", async () => {
    const context = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/orders?artist_id=artist-profile-a"),
      auth: mockAuth({
        artistMemberships: [{
          organizer_account_id: "profile-a",
          artist_profile_id: "artist-profile-a",
          status: "accepted",
        }],
      }),
      admin: adminContext,
      requiredPermission: "commerce.view",
    })

    expect(context).not.toBeInstanceOf(NextResponse)
    expect((context as any).scope).toMatchObject({
      type: "artist",
      id: "artist-profile-a",
      organizationId: "org-a",
      artistId: "artist-profile-a",
    })
  })

  it("validates seller scope against the acting owner storefront", async () => {
    const context = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/listings?seller_user_id=user-a&storefront_id=storefront-a"),
      auth: mockAuth({ storefronts: { "storefront-a": { seller_user_id: "user-a" } } }),
      admin: adminContext,
      requiredPermission: "commerce.view",
    })

    expect(context).not.toBeInstanceOf(NextResponse)
    expect((context as any).scope).toMatchObject({
      type: "seller",
      id: "user-a",
      organizationId: "org-a",
      sellerUserId: "user-a",
      storefrontId: "storefront-a",
    })
  })

  it("denies seller scope for a different seller user", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/listings?seller_user_id=seller-b"),
      auth: mockAuth({ storefronts: { "storefront-b": { seller_user_id: "seller-b" } } }),
      admin: adminContext,
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: {
        code: "commerce_scope_denied",
        retryable: false,
      },
      correlationId: "request-abcdef",
    })
  })

  it("returns a structured error when the required Commerce permission is absent", async () => {
    const response = await resolveCommerceContextForAdmin({
      request: new NextRequest("http://localhost/api/admin/commerce/payouts"),
      auth: mockAuth(),
      admin: {
        ...adminContext,
        capabilities: ["ticketing.view"],
      },
      requiredPermission: "commerce.manage_payouts",
    })

    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(403)
    expect((response as NextResponse).headers.get("x-correlation-id")).toBe("request-abcdef")
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      error: {
        code: "commerce_permission_denied",
        retryable: false,
      },
      correlationId: "request-abcdef",
    })
  })
})
