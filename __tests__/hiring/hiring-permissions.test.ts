import { describe, expect, it, vi } from "vitest"

import { canManageHiring } from "@/lib/auth/hiring-permissions"

function createOwnershipSupabaseMock({ ownsEntity }: { ownsEntity: boolean }) {
  const maybeSingle = vi.fn(async () => ({
    data: ownsEntity ? { id: "00000000-0000-0000-0000-000000000002" } : null,
    error: null,
  }))
  const limit = vi.fn(() => ({ maybeSingle }))
  const eqUser = vi.fn(() => ({ limit }))
  const eqEntity = vi.fn(() => ({ eq: eqUser }))
  const select = vi.fn(() => ({ eq: eqEntity }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn(async () => ({ data: false, error: null }))

  return {
    supabase: { from, rpc },
    from,
    rpc,
  }
}

describe("canManageHiring", () => {
  it("allows an organization creator even when RBAC has not been assigned", async () => {
    const { supabase, rpc } = createOwnershipSupabaseMock({ ownsEntity: true })

    const result = await canManageHiring({
      supabase: supabase as never,
      userId: "00000000-0000-0000-0000-000000000001",
      employer: {
        entityType: "organization",
        entityId: "00000000-0000-0000-0000-000000000002",
        displayName: "Creator Org",
      },
    })

    expect(result).toEqual({ ok: true, data: { allowed: true } })
    expect(rpc).not.toHaveBeenCalled()
  })
})
