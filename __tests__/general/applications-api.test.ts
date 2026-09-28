import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { PATCH } from "@/app/api/me/applications/route"
import { createClient } from "@/lib/supabase/server"

const mockedCreateClient = vi.mocked(createClient)

function patchRequest(body: unknown) {
  return new Request("https://tourify.test/api/me/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never
}

describe("current-user application actions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("requires authentication", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const response = await PATCH(
      patchRequest({
        source: "artist",
        application_id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
        action: "withdraw",
      }),
    )

    expect(response.status).toBe(401)
  })

  it("does not reveal or mutate another applicant's application", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)

    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(query),
    } as never)

    const response = await PATCH(
      patchRequest({
        source: "staffing",
        application_id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
        action: "withdraw",
      }),
    )

    expect(response.status).toBe(404)
    expect(query.eq).toHaveBeenCalledWith("applicant_id", "user-1")
  })
})
