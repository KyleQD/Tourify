import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock supabase module — the service imports it at module level
vi.mock("@/lib/supabase", () => {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "neq", "in", "is", "limit", "order", "range", "filter",
    "ilike", "or", "not", "match", "insert", "update", "delete", "upsert", "rpc"]
  methods.forEach(m => {
    chain[m] = vi.fn().mockReturnThis()
  })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: null, error: null })
  ;(chain.single as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue({ data: null, error: null })
  ;(chain.then as ReturnType<typeof vi.fn>) = vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: [], error: null })
  )

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chain),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    },
  }
})

import { AccountManagementService } from "@/lib/services/account-management.service"

describe("AccountManagementService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("is a class with getUserAccounts static method", () => {
    expect(typeof AccountManagementService.getUserAccounts).toBe("function")
  })

  it("getUserAccounts returns an array", async () => {
    const result = await AccountManagementService.getUserAccounts("test-user-id")
    expect(Array.isArray(result)).toBe(true)
  })

  it("getUserAccounts does not throw for unknown user", async () => {
    await expect(
      AccountManagementService.getUserAccounts("00000000-0000-0000-0000-000000000000")
    ).resolves.not.toThrow()
  })
})
