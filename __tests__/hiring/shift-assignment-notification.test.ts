import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.fn(async (..._args: unknown[]) => ({ id: "notif_1" }))

vi.mock("@/lib/services/optimized-notification-service", () => ({
  OptimizedNotificationService: {
    createNotification: (...args: unknown[]) => createNotification(...args),
  },
}))

import {
  sendShiftAssignmentNotification,
  sendShiftCancelledNotification,
  sendShiftResponseNotification,
  sendShiftUpdateNotification,
} from "@/lib/rebuild/shift-assignment-notify"

describe("shift-assignment-notify", () => {
  beforeEach(() => {
    createNotification.mockClear()
  })

  it("sends shift_assignment_invite with shift metadata", async () => {
    const result = await sendShiftAssignmentNotification({
      workerUserId: "user_worker",
      shiftId: "shift_1",
      staffMemberId: "staff_1",
      roleTitle: "Stagehand",
      shiftDate: "2026-07-12",
      startTime: "10:00",
      endTime: "18:00",
      employerName: "DreamStream",
      employerEntityType: "organization",
      employerEntityId: "org_1",
      assignmentId: "assign_1",
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
    expect(payload.type).toBe("shift_assignment_invite")
    expect(payload.content).toContain("Stagehand")
    expect(payload.metadata.shift_id).toBe("shift_1")
    expect(payload.metadata.assignment_id).toBe("assign_1")
    expect(payload.metadata.link).toBe("/messages?tab=work")
  })

  it("sends update and cancellation notifications", async () => {
    await sendShiftUpdateNotification({
      workerUserId: "user_worker",
      shiftId: "shift_1",
      shiftDate: "2026-07-12",
      changeSummary: "time was changed",
    })
    await sendShiftCancelledNotification({
      workerUserId: "user_worker",
      shiftId: "shift_1",
      roleTitle: "Security",
      shiftDate: "2026-07-12",
    })

    expect(createNotification).toHaveBeenCalledTimes(2)
    expect((createNotification.mock.calls[0][0] as { type: string }).type).toBe("shift_assignment_updated")
    expect((createNotification.mock.calls[1][0] as { type: string }).type).toBe("shift_assignment_cancelled")
  })

  it("notifies admin when worker responds", async () => {
    const result = await sendShiftResponseNotification({
      adminUserId: "admin_1",
      workerName: "Alex",
      action: "accept",
      shiftId: "shift_1",
      roleTitle: "FOH",
      shiftDate: "2026-07-12",
      assignmentId: "assign_1",
    })

    expect(result.sent).toBe(true)
    const payload = createNotification.mock.calls[0][0] as {
      userId: string
      type: string
      content: string
      metadata: Record<string, unknown>
    }
    expect(payload.userId).toBe("admin_1")
    expect(payload.type).toBe("shift_assignment_response")
    expect(payload.content).toContain("accepted")
    expect(payload.metadata.action).toBe("accept")
  })

  it("returns sent:false when notification service throws", async () => {
    createNotification.mockRejectedValueOnce(new Error("notify failed"))
    const result = await sendShiftAssignmentNotification({
      workerUserId: "user_worker",
      shiftId: "shift_1",
    })
    expect(result.sent).toBe(false)
  })
})
