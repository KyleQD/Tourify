import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.fn(async (..._args: unknown[]) => ({ id: "notif_1" }))

vi.mock("@/lib/services/optimized-notification-service", () => ({
  OptimizedNotificationService: {
    createNotification: (...args: unknown[]) => createNotification(...args),
  },
}))

import { sendRosterAddedNotification } from "@/lib/rebuild/hiring-roster-notify"

describe("sendRosterAddedNotification", () => {
  beforeEach(() => {
    createNotification.mockClear()
  })

  it("sends hiring_roster_added with employer and role context", async () => {
    const result = await sendRosterAddedNotification({
      workerUserId: "user_worker",
      candidateId: "cand_1",
      staffMemberId: "staff_1",
      jobTitle: "Growth Specialist",
      employerName: "DreamStream",
      employerEntityType: "organization",
      employerEntityId: "org_1",
    })

    expect(result.sent).toBe(true)
    expect(createNotification).toHaveBeenCalledTimes(1)

    const payload = createNotification.mock.calls[0][0] as {
      userId: string
      type: string
      title: string
      content: string
      metadata: Record<string, unknown>
    }

    expect(payload.userId).toBe("user_worker")
    expect(payload.type).toBe("hiring_roster_added")
    expect(payload.title).toContain("DreamStream")
    expect(payload.content).toContain("roster")
    expect(payload.metadata.candidate_id).toBe("cand_1")
    expect(payload.metadata.staff_member_id).toBe("staff_1")
    expect(payload.metadata.job_title).toBe("Growth Specialist")
  })

  it("returns sent:false when notification service throws", async () => {
    createNotification.mockRejectedValueOnce(new Error("notify failed"))

    const result = await sendRosterAddedNotification({
      workerUserId: "user_worker",
      candidateId: "cand_1",
    })

    expect(result.sent).toBe(false)
  })
})
