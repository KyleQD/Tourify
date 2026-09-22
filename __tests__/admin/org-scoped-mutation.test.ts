import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  assertChildParentOrgChain,
  OrgScopedMutationError,
  orgScopedChildDelete,
  orgScopedChildUpdate,
  orgScopedDelete,
  orgScopedUpdate,
} from "@/lib/admin/org-scoped-mutation"

function createChainMock(opts: {
  parent?: { id: string; org_id: string } | null
  child?: { id: string; booking_id: string } | null
  mutateData?: unknown
}) {
  const from = vi.fn((table: string) => {
    const state: any = { table, filters: {} as Record<string, string> }
    const builder: any = {
      select: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: (col: string, val: string) => {
        state.filters[col] = val
        return builder
      },
      maybeSingle: async () => {
        if (table === "lodging_bookings" && state.filters.id && state.filters.org_id) {
          return { data: opts.parent ?? null, error: null }
        }
        if (table === "lodging_guest_assignments" && state.filters.id) {
          if (state.filters.booking_id && opts.child) {
            return { data: opts.mutateData ?? opts.child, error: null }
          }
          return { data: opts.child ?? null, error: null }
        }
        return { data: opts.mutateData ?? null, error: null }
      },
    }
    return builder
  })
  return { from }
}

describe("SEC-110 org-scoped mutations", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("requires id and org_id for parent updates", async () => {
    await expect(
      orgScopedUpdate({
        supabase: { from: vi.fn() },
        table: "tours",
        id: "",
        orgId: "org-1",
        patch: {},
      }),
    ).rejects.toMatchObject({ code: "mutation_scope_required" })
  })

  it("predicates parent update on id + org_id", async () => {
    const eq = vi.fn().mockReturnThis()
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "t1" }, error: null })
    const update = vi.fn().mockReturnValue({ eq, select: () => ({ maybeSingle }) })
    // chain eq calls: id then org_id
    eq.mockImplementation(function (this: any) {
      return { eq, select: () => ({ maybeSingle }) }
    })
    const supabase = {
      from: vi.fn(() => ({ update })),
    }

    // Simpler mock: rebuild with sequential eq
    let filters: Record<string, string> = {}
    const supabase2 = {
      from: () => {
        const builder: any = {
          update: () => builder,
          eq: (c: string, v: string) => {
            filters[c] = v
            return builder
          },
          select: () => builder,
          maybeSingle: async () => ({ data: { id: "t1" }, error: null }),
        }
        return builder
      },
    }

    await orgScopedUpdate({
      supabase: supabase2,
      table: "financial_transactions",
      id: "tx-1",
      orgId: "org-1",
      patch: { amount: 10 },
    })
    expect(filters).toEqual({ id: "tx-1", org_id: "org-1" })
  })

  it("validates child parent org chain before child update", async () => {
    const supabase = createChainMock({
      parent: { id: "b1", org_id: "org-1" },
      child: { id: "g1", booking_id: "b1" },
      mutateData: { id: "g1", guest_name: "Ada" },
    })

    const chain = await assertChildParentOrgChain(supabase, "org-1", {
      parentTable: "lodging_bookings",
      parentId: "b1",
      childTable: "lodging_guest_assignments",
      childId: "g1",
      parentFkColumn: "booking_id",
    })
    expect(chain).toEqual({ parentId: "b1", childId: "g1" })

    const updated = await orgScopedChildUpdate({
      supabase,
      orgId: "org-1",
      chain: {
        parentTable: "lodging_bookings",
        parentId: "b1",
        childTable: "lodging_guest_assignments",
        childId: "g1",
        parentFkColumn: "booking_id",
      },
      patch: { guest_name: "Ada" },
    })
    expect(updated.data).toMatchObject({ id: "g1" })
  })

  it("rejects child when parent is wrong org", async () => {
    const supabase = createChainMock({ parent: null, child: { id: "g1", booking_id: "b1" } })
    await expect(
      orgScopedChildDelete({
        supabase,
        orgId: "org-1",
        chain: {
          parentTable: "lodging_bookings",
          parentId: "b1",
          childTable: "lodging_guest_assignments",
          childId: "g1",
          parentFkColumn: "booking_id",
        },
      }),
    ).rejects.toBeInstanceOf(OrgScopedMutationError)
  })

  it("predicates parent delete on id + org_id", async () => {
    const filters: Record<string, string> = {}
    const supabase = {
      from: () => {
        const builder: any = {
          delete: () => builder,
          eq: (c: string, v: string) => {
            filters[c] = v
            return builder
          },
          select: () => builder,
          maybeSingle: async () => ({ data: { id: "b1" }, error: null }),
        }
        return builder
      },
    }
    await orgScopedDelete({
      supabase,
      table: "lodging_bookings",
      id: "b1",
      orgId: "org-1",
    })
    expect(filters).toEqual({ id: "b1", org_id: "org-1" })
  })
})
