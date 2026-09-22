import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const authContext: {
  supabase: any
  admin: { orgId: string }
  user: { id: string }
} = {
  supabase: null,
  admin: { orgId: "org-a" },
  user: { id: "admin-user" },
}

const wrappedCapabilities: string[] = []

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  checkAdminPermissions: vi.fn(),
  withAdminCapability: vi.fn((capability, handler) => {
    return (request: NextRequest) => {
      wrappedCapabilities.push(capability)
      return handler(request, authContext)
    }
  }),
  withPlatformAdmin: vi.fn((handler) => (request: NextRequest) => handler(request, authContext)),
}))

vi.mock("@/lib/admin/admin-tour-event-access", () => ({
  adminAccessErrorResponse: vi.fn(() => ({ status: 404, message: "Denied" })),
  assertAdminEventAccess: vi.fn(),
  assertAdminTourAccess: vi.fn(),
}))

import { PATCH } from "@/app/api/admin/team-members/route"
import { GET as GET_VENUE } from "@/app/api/admin/venues/[id]/route"

function jsonPatch(body: Record<string, unknown>) {
  return new NextRequest("https://tourify.test/api/admin/team-members", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function createTeamMemberSupabase(options: {
  existing?: Record<string, unknown> | null
  bridge?: Record<string, unknown> | null
  lookupError?: Error | null
  bridgeError?: Error | null
  updateError?: Error | null
}) {
  const updateValues: Record<string, unknown>[] = []
  const eqCalls: Array<[string, unknown]> = []
  const from = vi.fn((table: string) => {
    if (table === "venue_team_members") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            eqCalls.push([column, value])
            return {
              maybeSingle: vi.fn(async () => ({
                data: options.existing ?? null,
                error: options.lookupError ?? null,
              })),
            }
          }),
        })),
        update: vi.fn((values: Record<string, unknown>) => {
          updateValues.push(values)
          const updateChain: any = {
            eq: vi.fn((column: string, value: unknown) => {
              eqCalls.push([column, value])
              return updateChain
            }),
            select: vi.fn(() => updateChain),
            single: vi.fn(async () => ({
              data: {
                id: "member-1",
                venue_id: "venue-1",
                status: values.status ?? "active",
              },
              error: options.updateError ?? null,
            })),
          }
          return updateChain
        }),
      }
    }

    if (table === "venue_identity_bridges") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: unknown) => {
            eqCalls.push([column, value])
            return {
              maybeSingle: vi.fn(async () => ({
                data: options.bridge ?? null,
                error: options.bridgeError ?? null,
              })),
            }
          }),
        })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, updateValues, eqCalls }
}

function createVenueSupabase() {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = []
  const from = vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: "select", args })
        return chain
      }),
      eq: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: "eq", args })
        return chain
      }),
      ilike: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: "ilike", args })
        return chain
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, op: "order", args })
        return chain
      }),
      limit: vi.fn(async (...args: unknown[]) => {
        calls.push({ table, op: "limit", args })
        return {
          data: [{ id: "event-1", title: "Show", start_at: "2026-09-22T20:00:00Z", status: "published", capacity: 100 }],
          error: null,
        }
      }),
      maybeSingle: vi.fn(async () => {
        if (table === "venue_profiles") {
          return {
            data: {
              id: "venue-1",
              venue_name: "The Room",
              created_at: "2026-09-22T00:00:00Z",
            },
            error: null,
          }
        }
        if (table === "venue_identity_bridges") {
          return { data: { venues_v2_id: "venues-v2-1" }, error: null }
        }
        return { data: null, error: null }
      }),
    }
    return chain
  })

  return { from, calls }
}

describe("admin team-member scope guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    wrappedCapabilities.length = 0
    authContext.admin = { orgId: "org-a" }
    authContext.user = { id: "admin-user" }
  })

  it("wraps the PATCH route with the workforce management capability", async () => {
    const supabase = createTeamMemberSupabase({
      existing: { id: "member-1", venue_id: "venue-1" },
      bridge: { operational_org_id: "org-a" },
    })
    authContext.supabase = supabase

    await PATCH(jsonPatch({ id: "member-1", status: "inactive" }))

    expect(wrappedCapabilities).toContain("workforce.manage")
  })

  it("denies a member update when the venue belongs to a different organization", async () => {
    const supabase = createTeamMemberSupabase({
      existing: { id: "member-1", venue_id: "venue-1" },
      bridge: { operational_org_id: "org-b" },
    })
    authContext.supabase = supabase

    const response = await PATCH(jsonPatch({ id: "member-1", status: "inactive" }))

    expect(response.status).toBe(403)
    expect(supabase.updateValues).toHaveLength(0)
  })

  it("binds allowed updates to both member id and venue id", async () => {
    const supabase = createTeamMemberSupabase({
      existing: { id: "member-1", venue_id: "venue-1" },
      bridge: { operational_org_id: "org-a" },
    })
    authContext.supabase = supabase

    const response = await PATCH(jsonPatch({ id: "member-1", status: "inactive" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.member).toMatchObject({ id: "member-1", venue_id: "venue-1", status: "inactive" })
    expect(supabase.eqCalls).toContainEqual(["id", "member-1"])
    expect(supabase.eqCalls).toContainEqual(["venue_id", "venue-1"])
    expect(supabase.updateValues[0]).toMatchObject({ status: "inactive" })
  })
})

describe("admin venue detail platform boundary", () => {
  it("loads events through the venue identity bridge rather than venue-name text matching", async () => {
    const supabase = createVenueSupabase()
    authContext.supabase = supabase

    const response = await GET_VENUE(new NextRequest("https://tourify.test/api/admin/venues/venue-1"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.events).toHaveLength(1)
    expect(supabase.calls).toContainEqual({ table: "events_v2", op: "eq", args: ["venue_id", "venues-v2-1"] })
    expect(supabase.calls.some((call) => call.op === "ilike")).toBe(false)
  })
})
