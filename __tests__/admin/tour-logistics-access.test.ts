import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/admin/admin-tour-event-access", () => ({
  assertAdminEventAccess: vi.fn(),
  assertAdminTourAccess: vi.fn(),
}))

import { assertAdminEventAccess, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  assertAdminLogisticsTaskAccess,
  assertAdminLogisticsTasksAccess,
} from "@/lib/admin/logistics-task-access"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const ORG_ID = "22222222-2222-4222-8222-222222222222"
const TOUR_ID = "33333333-3333-4333-8333-333333333333"
const EVENT_ID = "44444444-4444-4444-8444-444444444444"
const TASK_ONE = "55555555-5555-4555-8555-555555555555"
const TASK_TWO = "66666666-6666-4666-8666-666666666666"

function batchClient(rows: Array<Record<string, unknown>>) {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  query.select.mockReturnValue(query)
  return { from: vi.fn().mockReturnValue(query), query }
}

function singleClient(row: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return { from: vi.fn().mockReturnValue(query), query }
}

describe("Admin logistics task access", () => {
  beforeEach(() => vi.clearAllMocks())

  it("checks each unique tour and event against the exact acting organization", async () => {
    const client = batchClient([
      { id: TASK_ONE, tour_id: TOUR_ID, event_id: EVENT_ID, created_by: USER_ID },
      { id: TASK_TWO, tour_id: TOUR_ID, event_id: null, created_by: USER_ID },
    ])

    await expect(assertAdminLogisticsTasksAccess({
      supabase: client,
      userId: USER_ID,
      orgId: ORG_ID,
      taskIds: [TASK_ONE, TASK_TWO],
    })).resolves.toEqual([TASK_ONE, TASK_TWO])

    expect(assertAdminTourAccess).toHaveBeenCalledOnce()
    expect(assertAdminTourAccess).toHaveBeenCalledWith(expect.objectContaining({ orgId: ORG_ID, tourId: TOUR_ID }))
    expect(assertAdminEventAccess).toHaveBeenCalledOnce()
    expect(assertAdminEventAccess).toHaveBeenCalledWith(expect.objectContaining({ orgId: ORG_ID, eventId: EVENT_ID }))
  })

  it("rejects a partial task lookup before authorizing a bulk mutation", async () => {
    const client = batchClient([
      { id: TASK_ONE, tour_id: TOUR_ID, event_id: null, created_by: USER_ID },
    ])

    await expect(assertAdminLogisticsTasksAccess({
      supabase: client,
      userId: USER_ID,
      orgId: ORG_ID,
      taskIds: [TASK_ONE, TASK_TWO],
    })).rejects.toThrow("not found")
    expect(assertAdminTourAccess).not.toHaveBeenCalled()
  })

  it("rejects an unscoped task owned by another user", async () => {
    const client = singleClient({
      id: TASK_ONE,
      tour_id: null,
      event_id: null,
      created_by: TASK_TWO,
    })

    await expect(assertAdminLogisticsTaskAccess({
      supabase: client,
      userId: USER_ID,
      orgId: ORG_ID,
      taskId: TASK_ONE,
    })).rejects.toThrow("acting organization")
  })
})
