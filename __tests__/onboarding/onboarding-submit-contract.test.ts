import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/services/enhanced-onboarding.service", () => ({
  EnhancedOnboardingService: {
    submitOnboardingResponses: vi.fn(),
  },
}))

vi.mock("@/lib/services/unified-onboarding.service", () => ({
  UnifiedOnboardingService: {
    getUserOnboardingFlowById: vi.fn(),
    completeOnboardingFlow: vi.fn(),
  },
}))

import { POST } from "@/app/api/onboarding/submit/route"
import {
  parseOnboardingSubmission,
  onboardingSubmissionSchema,
} from "@/app/api/onboarding/_lib/contract"
import { createClient } from "@/lib/supabase/server"
import { EnhancedOnboardingService } from "@/lib/services/enhanced-onboarding.service"
import { UnifiedOnboardingService } from "@/lib/services/unified-onboarding.service"

const mockedCreateClient = vi.mocked(createClient)
const mockedEnhancedService = vi.mocked(EnhancedOnboardingService)
const mockedUnifiedService = vi.mocked(UnifiedOnboardingService)

describe("onboarding submission contract", () => {
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

  it("normalizes legacy invitation and candidate aliases", () => {
    expect(
      parseOnboardingSubmission({
        invitation_token: "invitation-token",
        responses: { name: "New worker" },
      }),
    ).toMatchObject({
      target: { kind: "invitation", token: "invitation-token" },
      responses: { name: "New worker" },
      completed: true,
    })

    expect(
      parseOnboardingSubmission({
        candidate_id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
        responses: {},
      }),
    ).toMatchObject({
      target: { kind: "candidate", id: "c8026785-e770-4cdd-8f3f-b21931c186cb" },
    })
  })

  it("accepts the canonical target shape", () => {
    expect(
      onboardingSubmissionSchema.parse({
        target: { kind: "flow", id: "c8026785-e770-4cdd-8f3f-b21931c186cb" },
        responses: { currentStep: 2 },
      }),
    ).toMatchObject({
      target: { kind: "flow" },
      completed: true,
    })
  })

  it("routes candidate submissions through the single submit implementation", async () => {
    mockedEnhancedService.submitOnboardingResponses.mockResolvedValue({
      success: true,
      data: { id: "c8026785-e770-4cdd-8f3f-b21931c186cb" },
    } as never)

    const response = await POST(
      new NextRequest("https://tourify.test/api/onboarding/submit", {
        method: "POST",
        body: JSON.stringify({
          candidate_id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
          responses: { currentStep: 2 },
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockedEnhancedService.submitOnboardingResponses).toHaveBeenCalledWith({
      candidate_id: "c8026785-e770-4cdd-8f3f-b21931c186cb",
      responses: { currentStep: 2 },
      documents: undefined,
    })
  })

  it("routes canonical flow submissions through the same endpoint", async () => {
    mockedUnifiedService.getUserOnboardingFlowById.mockResolvedValue({ id: "flow-1" } as never)
    mockedUnifiedService.completeOnboardingFlow.mockResolvedValue({ id: "flow-1", status: "completed" } as never)

    const response = await POST(
      new NextRequest("https://tourify.test/api/onboarding/submit", {
        method: "POST",
        body: JSON.stringify({
          target: { kind: "flow", id: "c8026785-e770-4cdd-8f3f-b21931c186cb" },
          responses: { currentStep: 3 },
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockedUnifiedService.completeOnboardingFlow).toHaveBeenCalledWith(
      "c8026785-e770-4cdd-8f3f-b21931c186cb",
      { currentStep: 3 },
      expect.anything(),
      "user-1",
    )
  })
})
