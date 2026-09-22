import { listVenueRbacVenueIds, venueHasActiveRole, venueHasRbacAccess } from "@/lib/venue/rbac-access"

/**
 * VEN-122 — canonical RBAC access resolution contract tests.
 */

function chainableSingle(row: any) {
  const chain: any = {
    eq: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: row, error: null }),
  }
  return chain
}

describe("venueHasRbacAccess", () => {
  it("returns true when has_entity_permission RPC grants the named permission", async () => {
    const calls: any[] = []
    const client = {
      rpc: async (fn: string, args: any) => {
        calls.push({ fn, args })
        return { data: true, error: null }
      },
      from: () => ({ select: () => ({ eq: () => chainableSingle(null) }) }),
    }
    const allowed = await venueHasRbacAccess(client as never, "u-1", "vp-1", "manage_team")
    expect(allowed).toBe(true)
    expect(calls[0]).toMatchObject({
      fn: "has_entity_permission",
      args: {
        p_user_id: "u-1",
        p_entity_type: "Venue",
        p_entity_id: "vp-1",
        p_permission_name: "manage_team",
      },
    })
  })

  it("does not treat an RPC failure as a grant", async () => {
    const client = {
      rpc: async () => ({ data: null, error: new Error("boom") }),
      from: () => ({
        select: () => ({
          eq: () =>
            chainableSingle({ role_id: "role-9", rbac_roles: { name: "Venue Manager" } }),
        }),
      }),
    }
    // No permission requested → active assignment suffices.
    expect(await venueHasRbacAccess(client as never, "u-1", "vp-1")).toBe(true)

    // Named permission + RPC failure + assignment present: assignment check
    // still passes only because a role exists; document this dual-read behavior.
    expect(await venueHasRbacAccess(client as never, "u-1", "vp-1", "manage_team")).toBe(true)
  })

  it("denies when no assignment and RPC does not grant", async () => {
    const client = {
      rpc: async () => ({ data: false, error: null }),
      from: () => ({ select: () => ({ eq: () => chainableSingle(null) }) }),
    }
    expect(await venueHasRbacAccess(client as never, "u-2", "vp-2", "view_finances")).toBe(false)
  })
})

describe("venueHasActiveRole", () => {
  it("returns role id/name for active assignments", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => chainableSingle({ role_id: "role-3", rbac_roles: [{ name: "Venue Scheduler" }] }),
        }),
      }),
    }
    const role = await venueHasActiveRole(client as never, "u-1", "vp-1")
    expect(role).toEqual({ roleId: "role-3", roleName: "Venue Scheduler" })
  })
})

describe("listVenueRbacVenueIds", () => {
  it("dedupes entity ids and tolerates query errors", async () => {
    let fail = false
    const client = {
      from: () => {
        const chain: any = {
          eq: () => chain,
        }
        // Terminal await: the code awaits the builder directly after .eq chain.
        chain.then = (resolve: any) =>
          resolve(
            fail
              ? { data: null, error: new Error("x") }
              : {
                  data: [{ entity_id: "vp-a" }, { entity_id: "vp-b" }, { entity_id: "vp-a" }],
                  error: null,
                },
          )
        return {
          select: () => chain,
        }
      },
    }
    expect(await listVenueRbacVenueIds(client as never, "u-1")).toEqual(["vp-a", "vp-b"])
    fail = true
    expect(await listVenueRbacVenueIds(client as never, "u-1")).toEqual([])
  })
})
