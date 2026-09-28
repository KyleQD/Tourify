import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const syncActiveStaffMemberShifts = vi.fn()
vi.mock("@/lib/services/staff-shift-assignment-sync", () => ({
  syncActiveStaffMemberShifts: (...args: unknown[]) => syncActiveStaffMemberShifts(...args),
  syncEmploymentAssignmentForShift: vi.fn(),
}))

import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import type { HiringEntity } from "@/types/hiring-entity"

const employer: HiringEntity = {
  entityType: "organization",
  entityId: "00000000-0000-0000-0000-000000000002",
  displayName: "Test Org",
}

function serviceWithCandidate(candidate: Record<string, unknown> | null) {
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: candidate, error: null })),
    })),
  }
  const service = new HiringRosterService({ supabase: supabase as never })
  const rosterUpsert = vi.spyOn(service, "upsertRosterFromApproval").mockResolvedValue({ id: "staff-1" } as never)
  return { service, supabase, rosterUpsert }
}

describe("completed onboarding shift bridge", () => {
  it("links persisted shifts after the hired worker becomes active", async () => {
    syncActiveStaffMemberShifts.mockReset().mockResolvedValue({ synced: 1, notified: 1, errors: [] })
    const { service, supabase, rosterUpsert } = serviceWithCandidate({
      id: "candidate-1",
      user_id: "worker-1",
      name: "Worker One",
      position: "Stagehand",
    })

    const member = await service.upsertRosterFromCompletedOnboarding({
      employer,
      actorUserId: "manager-1",
      candidateId: "candidate-1",
    })

    expect(member?.id).toBe("staff-1")
    expect(rosterUpsert).toHaveBeenCalledWith(expect.objectContaining({ userId: "worker-1", completed: true }))
    expect(syncActiveStaffMemberShifts).toHaveBeenCalledWith({
      supabase,
      staffMemberId: "staff-1",
      actorUserId: "manager-1",
    })
  })

  it("reports a shift link failure instead of completing silently", async () => {
    syncActiveStaffMemberShifts.mockReset().mockResolvedValue({
      synced: 0,
      notified: 0,
      errors: ["Shift shift-1 could not be linked to a worker assignment."],
    })
    const { service } = serviceWithCandidate({ id: "candidate-1", user_id: "worker-1" })

    await expect(service.upsertRosterFromCompletedOnboarding({
      employer,
      actorUserId: "manager-1",
      candidateId: "candidate-1",
    })).rejects.toThrow("Shift shift-1 could not be linked")
  })
})
