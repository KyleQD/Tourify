import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.fn(async (..._args: any[]) => ({ id: "n1" }))
const resolveHiringEntityDisplayName = vi.fn(async (..._args: any[]) => "DreamStream")

vi.mock("@/lib/services/optimized-notification-service", () => ({
  OptimizedNotificationService: {
    createNotification: (...args: any[]) => createNotification(...args),
  },
}))

vi.mock("@/lib/auth/hiring-entity-resolver", () => ({
  resolveHiringEntityDisplayName: (...args: any[]) => resolveHiringEntityDisplayName(...args),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => {
    throw new Error("should use injected supabase in tests")
  },
}))

import {
  publishStaffShifts,
  respondToShiftAssignment,
  syncEmploymentAssignmentForShift,
} from "@/lib/services/staff-shift-assignment-sync"

function createMockSupabase(handlers: {
  staffMember?: Record<string, unknown> | null
  existingAssignment?: { id: string; status: string } | null
  insertAssignmentId?: string
  assignmentForRespond?: Record<string, unknown> | null
  shiftForRespond?: Record<string, unknown> | null
  profile?: Record<string, unknown> | null
  shiftsForPublish?: Record<string, unknown>[]
}) {
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {}
    const self = () => chain

    chain.select = vi.fn(self)
    chain.eq = vi.fn(self)
    chain.in = vi.fn(self)
    chain.maybeSingle = vi.fn(async () => {
      if (table === "staff_members") return { data: handlers.staffMember ?? null, error: null }
      if (table === "employment_assignments") {
        if (handlers.assignmentForRespond) return { data: handlers.assignmentForRespond, error: null }
        return { data: handlers.existingAssignment ?? null, error: null }
      }
      if (table === "staff_shifts") return { data: handlers.shiftForRespond ?? null, error: null }
      if (table === "profiles") return { data: handlers.profile ?? null, error: null }
      return { data: null, error: null }
    })
    chain.single = vi.fn(async () => {
      if (table === "employment_assignments")
        return { data: { id: handlers.insertAssignmentId ?? "assign_new" }, error: null }
      return { data: null, error: null }
    })
    chain.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: handlers.insertAssignmentId ?? "assign_new" },
          error: null,
        })),
      })),
    }))
    chain.update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
        then: undefined,
      })),
    }))
    // Make update awaitable as Promise-like for simple `.update().eq()` chains
    const updateEq = vi.fn(async () => ({ error: null }))
    chain.update = vi.fn(() => ({
      eq: updateEq,
    }))

    if (table === "staff_shifts" && handlers.shiftsForPublish) {
      chain.in = vi.fn(async () => ({ data: handlers.shiftsForPublish, error: null }))
    }

    if (table === "hiring_audit_events") {
      chain.insert = vi.fn(async () => ({ error: null }))
    }

    return chain
  })

  return { from } as unknown as import("@supabase/supabase-js").SupabaseClient
}

describe("staff-shift-assignment-sync", () => {
  beforeEach(() => {
    createNotification.mockClear()
    resolveHiringEntityDisplayName.mockClear()
  })

  it("creates employment_assignments and notifies on sync with notify:true", async () => {
    const supabase = createMockSupabase({
      staffMember: {
        id: "staff_1",
        user_id: "user_1",
        position: "Stagehand",
        department: "Production",
        employer_entity_type: "organization",
        employer_entity_id: "org_1",
      },
      existingAssignment: null,
      insertAssignmentId: "assign_1",
    })

    const result = await syncEmploymentAssignmentForShift({
      supabase,
      notify: true,
      actorUserId: "admin_1",
      shift: {
        id: "shift_1",
        venue_id: "venue_1",
        event_id: "event_1",
        staff_member_id: "staff_1",
        shift_date: "2026-07-12",
        start_time: "10:00:00",
        end_time: "18:00:00",
        role_assignment: "Stagehand",
        status: "scheduled",
      },
    })

    expect(result.workerUserId).toBe("user_1")
    expect(result.assignmentId).toBe("assign_1")
    expect(result.notified).toBe(true)
    expect(createNotification).toHaveBeenCalled()
  })

  it("accept response confirms assignment and shift", async () => {
    const updateCalls: unknown[] = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "employment_assignments") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({
              data: {
                id: "assign_1",
                user_id: "user_1",
                status: "invited",
                staff_shift_id: "shift_1",
                staff_member_id: "staff_1",
                role_title: "FOH",
              },
              error: null,
            })),
            update: vi.fn((payload: unknown) => {
              updateCalls.push({ table, payload })
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn(async () => ({ error: null })),
                }),
              }
            }),
          }
        }
        if (table === "staff_shifts") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({
              data: {
                id: "shift_1",
                created_by: "admin_1",
                shift_date: "2026-07-12",
                staff_member_id: "staff_1",
                role_assignment: "FOH",
              },
              error: null,
            })),
            update: vi.fn((payload: unknown) => {
              updateCalls.push({ table, payload })
              return { eq: vi.fn(async () => ({ error: null })) }
            }),
          }
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({
              data: { full_name: "Alex Worker", display_name: null, username: "alex" },
              error: null,
            })),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        }
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient

    const result = await respondToShiftAssignment({
      supabase,
      assignmentId: "assign_1",
      userId: "user_1",
      action: "accept",
    })

    expect(result.ok).toBe(true)
    expect(result.status).toBe("confirmed")
    expect(updateCalls.some((c) => (c as { table: string }).table === "employment_assignments")).toBe(true)
    expect(updateCalls.some((c) => (c as { table: string }).table === "staff_shifts")).toBe(true)
    expect(createNotification).toHaveBeenCalled()
  })

  it("publishStaffShifts notifies pending shifts", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "staff_shifts") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn(async () => ({
              data: [
                {
                  id: "shift_1",
                  venue_id: "venue_1",
                  staff_member_id: "staff_1",
                  shift_date: "2026-07-12",
                  start_time: "10:00",
                  end_time: "18:00",
                  role_assignment: "Security",
                  status: "scheduled",
                },
              ],
              error: null,
            })),
            update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
          }
        }
        if (table === "staff_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({
              data: {
                id: "staff_1",
                user_id: "user_1",
                position: "Security",
                department: "Security",
                employer_entity_type: "venue",
                employer_entity_id: "venue_1",
              },
              error: null,
            })),
          }
        }
        if (table === "employment_assignments") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { id: "assign_pub" }, error: null })),
              })),
            })),
            update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
          }
        }
        if (table === "hiring_audit_events") {
          return { insert: vi.fn(async () => ({ error: null })) }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        }
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient

    const result = await publishStaffShifts({
      supabase,
      shiftIds: ["shift_1"],
      actorUserId: "admin_1",
      notify: true,
    })

    expect(result.published).toBe(1)
    expect(result.notified).toBe(1)
    expect(result.errors).toEqual([])
  })
})
