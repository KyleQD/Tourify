import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  assertAssignmentTransition,
  canTransitionAssignment,
  mapAssignmentStatusToShift,
  mapAssignmentStatusToTourTeam,
  mapRosterStatusToAssignment,
  mapShiftStatusToAssignment,
  mapTourTeamStatusToAssignment,
  presentTourMemberAssignmentStatus,
  WorkforceAssignmentTransitionError,
} from "@/lib/admin/workforce-assignment-status"

describe("WORK-103 canonical assignment status", () => {
  it("maps roster / shift / tour surfaces into employment status", () => {
    expect(mapRosterStatusToAssignment("pending")).toBe("invited")
    expect(mapRosterStatusToAssignment("active")).toBe("active")
    expect(mapRosterStatusToAssignment("offboarded")).toBe("cancelled")

    expect(mapShiftStatusToAssignment("scheduled")).toBe("invited")
    expect(mapShiftStatusToAssignment("confirmed")).toBe("confirmed")
    expect(mapShiftStatusToAssignment("cancelled")).toBe("cancelled")

    expect(mapTourTeamStatusToAssignment("pending")).toBe("invited")
    expect(mapTourTeamStatusToAssignment("confirmed")).toBe("confirmed")
    expect(mapTourTeamStatusToAssignment("declined")).toBe("cancelled")
  })

  it("maps assignment status back to shift and tour team surfaces", () => {
    expect(mapAssignmentStatusToShift("invited")).toBe("scheduled")
    expect(mapAssignmentStatusToShift("confirmed")).toBe("confirmed")
    expect(mapAssignmentStatusToShift("cancelled")).toBe("cancelled")

    expect(mapAssignmentStatusToTourTeam("invited")).toBe("pending")
    expect(mapAssignmentStatusToTourTeam("active")).toBe("confirmed")
    expect(mapAssignmentStatusToTourTeam("cancelled")).toBe("declined")
  })

  it("enforces the employment lifecycle graph", () => {
    expect(canTransitionAssignment("invited", "confirmed")).toBe(true)
    expect(canTransitionAssignment("invited", "cancelled")).toBe(true)
    expect(canTransitionAssignment("confirmed", "active")).toBe(true)
    expect(canTransitionAssignment("active", "completed")).toBe(true)
    expect(canTransitionAssignment("completed", "invited")).toBe(false)
    expect(canTransitionAssignment("cancelled", "confirmed")).toBe(false)

    expect(() => assertAssignmentTransition("invited", "confirmed")).not.toThrow()
    expect(() => assertAssignmentTransition("completed", "active")).toThrow(
      WorkforceAssignmentTransitionError,
    )
  })

  it("presents tour member rows with canonical assignment_status", () => {
    expect(presentTourMemberAssignmentStatus("confirmed")).toEqual({
      assignmentStatus: "confirmed",
      tourTeamStatus: "confirmed",
    })
    expect(presentTourMemberAssignmentStatus("pending").assignmentStatus).toBe("invited")
  })
})

describe("WORK-103 resolveAssignmentIdentity", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("resolves from employment assignment id", async () => {
    const { resolveAssignmentIdentity } = await import("@/lib/admin/workforce-assignment.service")

    const supabase = {
      from(table: string) {
        if (table === "employment_assignments") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    user_id: "11111111-1111-4111-8111-111111111111",
                    staff_member_id: "66666666-6666-4666-8666-666666666666",
                    staff_shift_id: null,
                    event_id: null,
                    tour_id: null,
                    role_title: "Rigger",
                    department: "Stage",
                    status: "invited",
                    employer_entity_type: "organization",
                    employer_entity_id: "22222222-2222-4222-8222-222222222222",
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "staff_members") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "66666666-6666-4666-8666-666666666666",
                    user_id: "11111111-1111-4111-8111-111111111111",
                    org_id: "22222222-2222-4222-8222-222222222222",
                    position: "Rigger",
                    department: "Stage",
                    status: "pending",
                    employer_entity_type: "organization",
                    employer_entity_id: "22222222-2222-4222-8222-222222222222",
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    const identity = await resolveAssignmentIdentity({
      supabase: supabase as any,
      employmentAssignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    })

    expect(identity).toMatchObject({
      userId: "11111111-1111-4111-8111-111111111111",
      staffMemberId: "66666666-6666-4666-8666-666666666666",
      roleTitle: "Rigger",
      status: "invited",
      orgId: "22222222-2222-4222-8222-222222222222",
    })
    expect(identity?.sources).toContain("employment_assignments")
  })
})
