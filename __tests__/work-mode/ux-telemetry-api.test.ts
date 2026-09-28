import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { POST } from "@/app/api/ux/telemetry/route"
import { createClient } from "@/lib/supabase/server"

const mockedCreateClient = vi.mocked(createClient)

function request(body: unknown) {
  return new Request("https://tourify.test/api/ux/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("UX telemetry API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires an authenticated user", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const response = await POST(
      request({ eventName: "viewed", flow: "work_mode", route: "/work/today" }),
    )
    expect(response.status).toBe(401)
  })

  it("rejects telemetry fields outside the non-sensitive contract", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    } as never)

    const response = await POST(
      request({
        eventName: "viewed",
        flow: "work_mode",
        route: "/work/today",
        context: { nested: { secret: true } },
      }),
    )
    expect(response.status).toBe(422)
  })

  it("fails open when the manual SQL has not been applied", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({
          error: { message: "relation ux_telemetry_events does not exist" },
        }),
      })),
    } as never)

    const response = await POST(
      request({ eventName: "viewed", flow: "work_mode", route: "/work/today" }),
    )
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ accepted: true, persisted: false })
  })
})
