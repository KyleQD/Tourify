import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.fn(async (..._args: unknown[]) => ({ id: "notif_1" }))
const postApplicantHiringMessage = vi.fn(async (..._args: unknown[]) => ({ conversationId: "conv_1", delivered: true }))

vi.mock("@/lib/services/optimized-notification-service", () => ({
  OptimizedNotificationService: {
    createNotification: (...args: unknown[]) => createNotification(...args),
  },
}))

// Mocking the comms helper keeps the server-only service-role client out of the
// unit-test module graph while letting us assert that hiring events are posted
// to the applicant's work thread.
vi.mock("@/lib/rebuild/hiring-applicant-comms", () => ({
  postApplicantHiringMessage: (...args: unknown[]) => postApplicantHiringMessage(...args),
}))

import { runStaffApplicationApprovedSideEffects } from "@/lib/rebuild/hiring-automation"

interface NotificationPayload {
  userId: string
  type: string
  title: string
  content: string
  metadata: Record<string, unknown>
}

function findNotificationFor(userId: string, type?: string): NotificationPayload | undefined {
  const call = createNotification.mock.calls.find(([arg]) => {
    const payload = arg as NotificationPayload
    return payload.userId === userId && (type === undefined || payload.type === type)
  })
  return call ? (call[0] as NotificationPayload) : undefined
}

describe("runStaffApplicationApprovedSideEffects", () => {
  beforeEach(() => {
    createNotification.mockClear()
    postApplicantHiringMessage.mockClear()
  })

  it("sends a congratulations-only approval notification plus a separate onboarding invite when onboarding is ready", async () => {
    await runStaffApplicationApprovedSideEffects({
      applicationId: "app_1",
      applicantUserId: "user_applicant",
      venueId: null,
      jobPostingId: "job_1",
      actorUserId: "user_admin",
      onboardingUrl: "https://app.test/onboarding/hire/token123",
      positionTitle: "Bartender",
      jobTitle: "Weekend Bartender",
      employerName: "Neon Room",
      templateName: "Bartender Onboarding",
    })

    const approval = findNotificationFor("user_applicant", "hiring_application_approved")
    expect(approval).toBeDefined()
    expect(approval!.title).toContain("Neon Room")
    expect(approval!.content).toContain("Weekend Bartender")
    // The approval notification never embeds the onboarding link — that is a
    // distinct notification so the two events stay separate.
    expect(approval!.content).not.toContain("http")
    expect(approval!.metadata.onboarding_pending).toBe(false)
    expect(approval!.metadata.conversation_id).toBe("conv_1")

    const onboarding = findNotificationFor("user_applicant", "hiring_onboarding_invite")
    expect(onboarding).toBeDefined()
    expect(onboarding!.content).toContain("Bartender Onboarding")
    expect(onboarding!.content).toContain("https://app.test/onboarding/hire/token123")
    expect(onboarding!.metadata.onboarding_url).toBe("https://app.test/onboarding/hire/token123")
  })

  it("posts the approval message and onboarding task card into the applicant work thread", async () => {
    await runStaffApplicationApprovedSideEffects({
      applicationId: "app_1",
      applicantUserId: "user_applicant",
      actorUserId: "user_admin",
      onboardingUrl: "https://app.test/onboarding/hire/token123",
      jobTitle: "Weekend Bartender",
      employerName: "Neon Room",
      templateName: "Bartender Onboarding",
      onboardingReady: true,
      onboardingPending: false,
    })

    // Approval message (plain) + onboarding message (task card) = two thread posts.
    expect(postApplicantHiringMessage).toHaveBeenCalledTimes(2)
    const taskCardCall = postApplicantHiringMessage.mock.calls.find(([arg]) => Boolean((arg as any).taskCard))
    expect(taskCardCall).toBeDefined()
    expect((taskCardCall![0] as any).taskCard.actionUrl).toBe("https://app.test/onboarding/hire/token123")
  })

  it("tells the applicant onboarding info is coming soon when the template is pending", async () => {
    await runStaffApplicationApprovedSideEffects({
      applicationId: "app_2",
      applicantUserId: "user_applicant",
      actorUserId: "user_admin",
      onboardingUrl: null,
      onboardingPending: true,
    })

    const approval = findNotificationFor("user_applicant", "hiring_application_approved")
    expect(approval).toBeDefined()
    expect(approval!.title).toBe("You've been hired!")
    expect(approval!.content).toContain("onboarding information will be sent")
    expect(approval!.content).not.toContain("http")
    expect(approval!.metadata.onboarding_pending).toBe(true)

    // No onboarding invite should fire when there is no link yet.
    expect(findNotificationFor("user_applicant", "hiring_onboarding_invite")).toBeUndefined()

    const actor = findNotificationFor("user_admin")
    expect(actor).toBeDefined()
    expect(actor!.content).toContain("Assign an onboarding template")
    expect(actor!.metadata.onboarding_pending).toBe(true)
  })

  it("surfaces non-blocking warnings in the actor notification", async () => {
    await runStaffApplicationApprovedSideEffects({
      applicationId: "app_4",
      applicantUserId: "user_applicant",
      actorUserId: "user_admin",
      onboardingUrl: "https://app.test/onboarding/hire/token",
      templateName: "Onboarding",
      onboardingReady: true,
      onboardingPending: false,
      warnings: ["Applicant approved, but adding them to the roster failed. You can add them manually."],
    })

    const actor = findNotificationFor("user_admin", "hiring_application_approved_actor")
    expect(actor).toBeDefined()
    expect(actor!.content).toContain("adding them to the roster failed")
    expect(actor!.metadata.warnings).toEqual([
      "Applicant approved, but adding them to the roster failed. You can add them manually.",
    ])
  })
})
