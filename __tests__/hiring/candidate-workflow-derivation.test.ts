import { describe, expect, it } from "vitest"

import {
  buildWorkflowStepsFromCandidate,
  deriveWorkflowStageId,
  type WorkflowDerivationInput,
} from "@/lib/hiring/candidate-workflow-utils"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"

type TestCandidate = WorkflowDerivationInput &
  Pick<HiringCandidate, "createdAt" | "updatedAt" | "approvedAt" | "completedAt">

function baseCandidate(overrides: Partial<TestCandidate> = {}): TestCandidate {
  return {
    status: "pending",
    stage: "invitation",
    onboardingProgress: 0,
    complianceStatus: "missing",
    invitationToken: null,
    onboardingDeliveryStatus: "not_sent",
    application: null,
    roster: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    approvedAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe("deriveWorkflowStageId", () => {
  it("returns invitation_sent for an approved application with a token and no progress", () => {
    const candidate = baseCandidate({
      invitationToken: "tok_123",
      onboardingDeliveryStatus: "sent",
      application: { status: "approved" },
    })
    expect(deriveWorkflowStageId(candidate)).toBe("invitation_sent")
  })

  it("returns onboarding_started when the worker has partial progress", () => {
    const candidate = baseCandidate({
      status: "in_progress",
      stage: "onboarding",
      onboardingProgress: 40,
      onboardingDeliveryStatus: "in_progress",
    })
    expect(deriveWorkflowStageId(candidate)).toBe("onboarding_started")
  })

  it("returns review_pending when submitted for review", () => {
    const candidate = baseCandidate({
      status: "submitted",
      stage: "review",
      onboardingProgress: 100,
    })
    expect(deriveWorkflowStageId(candidate)).toBe("review_pending")
  })

  it("returns onboarding_started when needs_revision", () => {
    const candidate = baseCandidate({
      status: "needs_revision",
      stage: "onboarding",
      onboardingProgress: 100,
      complianceStatus: "blocked",
    })
    expect(deriveWorkflowStageId(candidate)).toBe("onboarding_started")
  })

  it("returns approved when completed without an active roster", () => {
    const candidate = baseCandidate({
      status: "completed",
      stage: "approved",
      onboardingProgress: 100,
      roster: null,
    })
    expect(deriveWorkflowStageId(candidate)).toBe("approved")
  })

  it("returns team_assigned when completed and roster is active", () => {
    const candidate = baseCandidate({
      status: "completed",
      stage: "approved",
      onboardingProgress: 100,
      roster: { workModeStatus: "active", employmentAssignmentId: "ea_1" },
    })
    expect(deriveWorkflowStageId(candidate)).toBe("team_assigned")
  })

  it("falls back to job_posted when there are no signals", () => {
    expect(deriveWorkflowStageId(baseCandidate())).toBe("job_posted")
  })
})

describe("buildWorkflowStepsFromCandidate", () => {
  it("marks earlier stages complete and the current stage active", () => {
    const candidate = baseCandidate({
      invitationToken: "tok_123",
      onboardingDeliveryStatus: "sent",
      application: { status: "approved" },
    })
    const steps = buildWorkflowStepsFromCandidate(candidate)

    const byId = Object.fromEntries(steps.map((step) => [step.id, step.status]))
    expect(byId.job_posted).toBe("completed")
    expect(byId.application_received).toBe("completed")
    expect(byId.screening).toBe("completed")
    expect(byId.invitation_sent).toBe("active")
    expect(byId.onboarding_started).toBe("pending")
    expect(byId.team_assigned).toBe("pending")
    expect(steps).toHaveLength(9)
  })

  it("marks the active stage as blocked when the candidate is rejected", () => {
    const candidate = baseCandidate({
      status: "rejected",
      stage: "rejected",
      invitationToken: "tok_123",
      onboardingDeliveryStatus: "sent",
    })
    const steps = buildWorkflowStepsFromCandidate(candidate)
    const invitationStep = steps.find((step) => step.id === "invitation_sent")
    expect(invitationStep?.status).toBe("blocked")
  })
})
