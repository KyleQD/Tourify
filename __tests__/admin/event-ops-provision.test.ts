import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { provisionEventOperationsSchema } from "@/lib/admin/event-ops-provision"

describe("PLAN-105 explicit operational provisioning", () => {
  it("requires reviewed:true and positive ticket quantities", () => {
    expect(
      provisionEventOperationsSchema.safeParse({
        staff_shifts: [],
        ticket_types: [{ name: "GA", price: 40, quantity_available: 100 }],
      }).success,
    ).toBe(false)

    expect(
      provisionEventOperationsSchema.safeParse({
        reviewed: true,
        ticket_types: [{ name: "GA", price: 40, quantity_available: 0 }],
      }).success,
    ).toBe(false)

    const ok = provisionEventOperationsSchema.safeParse({
      reviewed: true,
      staff_shifts: [
        {
          staff_member_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          shift_date: "2026-08-01",
          start_time: "09:00",
          end_time: "17:00",
        },
      ],
      ticket_types: [{ name: "GA", price: 40, quantity_available: 100 }],
    })
    expect(ok.success).toBe(true)
  })
})
