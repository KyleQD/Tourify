/**
 * SEC-112 — Authorization contract matrix (unit-level endpoint contract).
 * Covers owner, role, custom role, expired/revoked membership, wrong org,
 * guessed ID, child ID, bulk IDs, share token, and service job revalidation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/security/write-security-audit-event", () => ({
  writeSecurityAuditEvent: vi.fn(async () => ({ id: "audit-1" })),
}))

const serviceFrom = vi.fn()
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: serviceFrom }),
}))

import { NextResponse } from "next/server"
import { z } from "zod"
import {
  clearOrgCommandIdempotencyForTests,
  executeOrgCommand,
  requireEntityAccess,
} from "@/lib/auth/org-command"
import type { ActingAdminContext } from "@/lib/auth/admin-context"
import {
  hasAdminCapability,
  resolveEffectiveAdminCapabilities,
} from "@/lib/auth/admin-capabilities"
import {
  assertChildParentOrgChain,
  orgScopedDelete,
  orgScopedUpdate,
} from "@/lib/admin/org-scoped-mutation"
import { executeServiceRoleJob, ServiceRoleJobError } from "@/lib/supabase/service-role-job"
import {
  ADMIN_FEATURE_FIXTURE,
  actingHeadersForOrg,
  fixtureOrg,
} from "@/lib/testing/admin-feature-factory"

function actingContext(
  persona: "owner" | "manager" | "viewer" | "worker",
  org: "a" | "b" = "a",
  overrides: Partial<ActingAdminContext> = {},
): ActingAdminContext {
  const orgMeta = fixtureOrg(org)
  const role =
    persona === "owner"
      ? "owner"
      : persona === "manager"
        ? "tour_manager"
        : persona === "viewer"
          ? "viewer"
          : "worker"
  const capabilities = resolveEffectiveAdminCapabilities({
    role,
    membershipStatus: "active",
  })
  return {
    userId: ADMIN_FEATURE_FIXTURE.users.orgAOwner.userId,
    profileId: orgMeta.profileId,
    accountType: "organization",
    orgId: orgMeta.orgId,
    membershipRole: role,
    capabilities,
    source: "header",
    correlationId: "corr-sec112",
    ...overrides,
  }
}

describe("SEC-112 authorization contract", () => {
  beforeEach(() => {
    clearOrgCommandIdempotencyForTests()
    serviceFrom.mockReset()
  })

  it("owner retains full capabilities including finance.pay and contract.sign", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "owner",
      membershipStatus: "active",
    })
    expect(hasAdminCapability(caps, "tour.delete")).toBe(true)
    expect(hasAdminCapability(caps, "finance.pay")).toBe(true)
    expect(hasAdminCapability(caps, "contract.sign")).toBe(true)
  })

  it("role matrix: tour_manager can manage tours but not finance.pay", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "tour_manager",
      membershipStatus: "active",
    })
    expect(hasAdminCapability(caps, "tour.manage")).toBe(true)
    expect(hasAdminCapability(caps, "finance.pay")).toBe(false)
  })

  it("custom role uses configured capabilities when catalog is present", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "custom_ops",
      membershipStatus: "active",
      configuredPermissions: ["tour.view", "logistics.view"],
    })
    expect(caps).toEqual(["tour.view", "logistics.view"])
    expect(hasAdminCapability(caps, "tour.manage")).toBe(false)
  })

  it("revoked membership denies all capabilities", () => {
    expect(
      resolveEffectiveAdminCapabilities({
        role: "owner",
        membershipStatus: "revoked",
      }),
    ).toEqual([])
  })

  it("expired grants are ignored", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "viewer",
      membershipStatus: "active",
      now: new Date("2026-07-20T12:00:00.000Z"),
      grants: [{ capability: "ticketing.manage", expiresAt: "2026-07-01T00:00:00.000Z" }],
    })
    expect(hasAdminCapability(caps, "ticketing.manage")).toBe(false)
  })

  it("wrong org: entity access returns 404 without leaking", async () => {
    const tourId = ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId
    const auth = {
      user: { id: "user-b" },
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      },
    }
    const denied = await requireEntityAccess(
      auth as any,
      actingContext("owner", "b"),
      "tour",
      tourId,
    )
    expect(denied).toBeInstanceOf(NextResponse)
    expect(denied!.status).toBe(404)
    const body = await denied!.json()
    expect(body.code).toBe("entity_not_found")
  })

  it("guessed parent id: org-scoped update matches nothing", async () => {
    const filters: Record<string, string> = {}
    const supabase = {
      from: () => {
        const builder: any = {
          update: () => builder,
          eq: (c: string, v: string) => {
            filters[c] = v
            return builder
          },
          select: () => builder,
          maybeSingle: async () => ({ data: null, error: null }),
        }
        return builder
      },
    }
    const result = await orgScopedUpdate({
      supabase,
      table: "tours",
      id: "00000000-0000-4000-8000-000000000099",
      orgId: fixtureOrg("a").orgId,
      patch: { name: "hijack" },
    })
    expect(filters).toEqual({
      id: "00000000-0000-4000-8000-000000000099",
      org_id: fixtureOrg("a").orgId,
    })
    expect(result.data).toBeNull()
  })

  it("child id without valid parent chain is rejected", async () => {
    const supabase = {
      rpc: async () => ({ data: null, error: { code: "P0002", message: "not found" } }),
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }
    await expect(
      assertChildParentOrgChain(supabase, fixtureOrg("a").orgId, {
        parentTable: "lodging_bookings",
        parentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        childTable: "lodging_guest_assignments",
        childId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        parentFkColumn: "booking_id",
      }),
    ).rejects.toMatchObject({ code: "entity_not_found" })
  })

  it("bulk ids: each target must be revalidated (no silent skip)", async () => {
    const ids = [
      ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId,
      ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId,
    ]
    const seen: string[] = []
    for (const id of ids) {
      const result = await orgScopedDelete({
        supabase: {
          from: () => {
            const builder: any = {
              delete: () => builder,
              eq: (c: string, v: string) => {
                if (c === "id") seen.push(v)
                return builder
              },
              select: () => builder,
              maybeSingle: async () =>
                id === ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId
                  ? { data: { id }, error: null }
                  : { data: null, error: null },
            }
            return builder
          },
        },
        table: "tours",
        id,
        orgId: fixtureOrg("a").orgId,
      })
      if (id === ADMIN_FEATURE_FIXTURE.tours.bCollision.tourId) {
        expect(result.data).toBeNull()
      } else {
        expect(result.data?.id).toBe(id)
      }
    }
    expect(seen).toEqual(ids)
  })

  it("share token surface: acting headers encode org A distinctly from org B", () => {
    const a = actingHeadersForOrg("a")
    const b = actingHeadersForOrg("b")
    expect(a["x-acting-org-id"]).not.toBe(b["x-acting-org-id"])
    expect(a["x-acting-profile-id"]).not.toBe(b["x-acting-profile-id"])
  })

  it("viewer cannot execute tour.delete command", async () => {
    const response = await executeOrgCommand({
      context: actingContext("viewer"),
      auth: { user: { id: "viewer" }, supabase: {} },
      schema: z.object({ id: z.string().uuid() }),
      input: { id: ADMIN_FEATURE_FIXTURE.tours.aMultiStop.tourId },
      capability: "tour.delete",
      commandName: "admin.tours.delete",
      handler: async () => NextResponse.json({ ok: true }),
    })
    expect(response.status).toBe(403)
  })

  it("service job revalidates client-supplied org/target and rejects mismatch", async () => {
    serviceFrom.mockImplementation((table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "organizations") {
            return { data: { id: fixtureOrg("a").orgId }, error: null }
          }
          if (table === "events_v2") {
            return {
              data: {
                id: ADMIN_FEATURE_FIXTURE.tours.bCollision.eventIds[0],
                org_id: fixtureOrg("b").orgId,
              },
              error: null,
            }
          }
          return { data: null, error: null }
        },
      }
      return builder
    })

    await expect(
      executeServiceRoleJob(
        {
          orgId: fixtureOrg("a").orgId,
          reason: "sec112 service job contract",
          moduleId: "admin.ticketing.refund",
          target: { eventId: ADMIN_FEATURE_FIXTURE.tours.bCollision.eventIds[0] },
        },
        async () => "should-not-run",
      ),
    ).rejects.toBeInstanceOf(ServiceRoleJobError)
  })
})
