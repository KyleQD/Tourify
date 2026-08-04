import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/services/unified-onboarding.service", () => ({
  UnifiedOnboardingService: {
    getUserOnboardingFlow: vi.fn(),
    getTemplateByFlowType: vi.fn(),
    getUserOnboardingFlowById: vi.fn(),
    createOnboardingFlow: vi.fn(),
    updateOnboardingFlow: vi.fn(),
    completeOnboardingFlow: vi.fn(),
    getOrCreateOnboardingFlow: vi.fn(),
  },
}))

import { GET, POST } from "@/app/api/onboarding/unified/route"
import { createClient } from "@/lib/supabase/server"
import { UnifiedOnboardingService } from "@/lib/services/unified-onboarding.service"

const mockedCreateClient = vi.mocked(createClient)
const mockedService = vi.mocked(UnifiedOnboardingService)

describe("unified onboarding API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    } as never)
  })

  it("always scopes reads to the authenticated user", async () => {
    mockedService.getTemplateByFlowType.mockResolvedValue(null)
    mockedService.getUserOnboardingFlow.mockResolvedValue({
      id: "flow-1",
      user_id: "user-1",
      flow_type: "artist",
      status: "in_progress",
      responses: {},
      metadata: {},
      created_at: "2026-07-28T00:00:00.000Z",
      updated_at: "2026-07-28T00:00:00.000Z",
    })

    const response = await GET(
      new Request(
        "https://tourify.test/api/onboarding/unified?flow_type=artist&user_id=user-2",
      ) as never,
    )

    expect(response.status).toBe(200)
    expect(mockedService.getUserOnboardingFlow).toHaveBeenCalledWith(
      "user-1",
      "artist",
      expect.anything(),
    )
    expect(mockedService.getTemplateByFlowType).toHaveBeenCalledWith(
      "artist",
      expect.anything(),
    )
  })

  it("returns an empty resumable state instead of a not-found error", async () => {
    mockedService.getUserOnboardingFlow.mockResolvedValue(null)
    mockedService.getTemplateByFlowType.mockResolvedValue(null)

    const response = await GET(
      new Request(
        "https://tourify.test/api/onboarding/unified?flow_type=venue",
      ) as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { flow: null, template: null },
    })
  })

  it("denies updates when the flow is not owned by the session user", async () => {
    mockedService.getUserOnboardingFlowById.mockResolvedValue(null)

    const response = await POST(
      new Request("https://tourify.test/api/onboarding/unified", {
        method: "POST",
        body: JSON.stringify({
          action: "update_flow",
          id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
          status: "in_progress",
          responses: { currentStep: 2 },
        }),
      }) as never,
    )

    expect(response.status).toBe(404)
    expect(mockedService.updateOnboardingFlow).not.toHaveBeenCalled()
  })
})
