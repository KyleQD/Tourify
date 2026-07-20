import { beforeEach, describe, expect, it, vi } from "vitest"

import { assertCanViewHiringPii, canViewHiringPii } from "@/lib/auth/hiring-permissions"

function createMockSupabase(rpcResult: { data?: unknown; error?: { message: string } | null }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(async () => rpcResult),
  } as never
}

describe("canViewHiringPii", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("allows self-owned organization accounts", async () => {
    const userId = "33333333-3333-4333-8333-333333333333"
    const result = await canViewHiringPii({
      supabase: createMockSupabase({ data: false, error: null }),
      userId,
      employer: {
        entityType: "organization",
        entityId: userId,
        displayName: "Org",
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.allowed).toBe(true)
  })

  it("denies hiring managers when RPC returns false", async () => {
    const result = await canViewHiringPii({
      supabase: createMockSupabase({ data: false, error: null }),
      userId: "44444444-4444-4444-8444-444444444444",
      employer: {
        entityType: "organization",
        entityId: "55555555-5555-4555-8555-555555555555",
        displayName: "Org",
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.allowed).toBe(false)
  })

  it("assertCanViewHiringPii returns forbidden when denied", async () => {
    const result = await assertCanViewHiringPii({
      supabase: createMockSupabase({ data: false, error: null }),
      userId: "44444444-4444-4444-8444-444444444444",
      employer: {
        entityType: "venue",
        entityId: "55555555-5555-4555-8555-555555555555",
        displayName: "Venue",
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("FORBIDDEN")
  })
})
