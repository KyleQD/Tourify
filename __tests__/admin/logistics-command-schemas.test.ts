import { describe, expect, it } from "vitest"

import {
  assertLogisticsStatusTransition,
  canTransitionLogisticsStatus,
  LogisticsStatusTransitionError,
  parseLogisticsCommand,
} from "@/lib/admin/logistics-command-schemas"

describe("LOG-103 logistics command schemas", () => {
  it("rejects unknown fields on create_task", () => {
    const result = parseLogisticsCommand({
      action: "create_task",
      type: "equipment",
      title: "Load-in",
      surprise: true,
    })
    expect(result.ok).toBe(false)
  })

  it("accepts a strict create_task payload", () => {
    const result = parseLogisticsCommand({
      action: "create_task",
      type: "catering",
      title: "Dinner service prep",
      category: "meal_service",
      event_id: "11111111-1111-4111-8111-111111111111",
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.action).toBe("create_task")
  })

  it("rejects status changes via update_task action shape", () => {
    const result = parseLogisticsCommand({
      action: "update_task",
      id: "11111111-1111-4111-8111-111111111111",
      status: "completed",
    })
    expect(result.ok).toBe(false)
  })

  it("enforces allowlisted status transitions", () => {
    expect(canTransitionLogisticsStatus("pending", "in_progress")).toBe(true)
    expect(canTransitionLogisticsStatus("completed", "pending")).toBe(false)
    expect(canTransitionLogisticsStatus("in_progress", "completed")).toBe(true)
    expect(() => assertLogisticsStatusTransition("cancelled", "pending")).toThrow(
      LogisticsStatusTransitionError,
    )
  })

  it("treats same-status as allowed (idempotent)", () => {
    expect(canTransitionLogisticsStatus("in_progress", "in_progress")).toBe(true)
  })

  it("parses bulk and transition commands", () => {
    const transition = parseLogisticsCommand({
      action: "transition_task_status",
      id: "11111111-1111-4111-8111-111111111111",
      status: "confirmed",
    })
    expect(transition.ok).toBe(true)

    const bulk = parseLogisticsCommand({
      action: "bulk_transition_task_status",
      ids: ["11111111-1111-4111-8111-111111111111"],
      status: "completed",
    })
    expect(bulk.ok).toBe(true)
  })
})
