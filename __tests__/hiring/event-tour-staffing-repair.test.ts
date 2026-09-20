import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/rebuild/hiring-onboarding-notify", () => ({
  sendOnboardingInviteNotification: vi.fn(),
}))

import { buildTourMemberWrite } from "@/lib/admin/tour-collaboration"
import {
  assertNoShiftConflict,
  StaffingFlowError,
  staffingErrorStatus,
} from "@/lib/services/staffing-assignment.service"
import { staffingInvitationDestinationMatches } from "@/lib/services/staffing-invitation.service"

const root = process.cwd()
const migration = readFileSync(
  join(root, "supabase/migrations/20260821031214_repair_event_tour_staffing_flow.sql"),
  "utf8",
)

describe("event/tour staffing migration contract", () => {
  it("supports organization-only shifts while retaining an explicit scope check", () => {
    expect(migration).toContain("alter column venue_id drop not null")
    expect(migration).toContain("check (org_id is not null or venue_id is not null)")
  })

  it("adds event invitations, tour assignment kind, replay keys, and scoped RLS", () => {
    expect(migration).toContain("add column if not exists event_id uuid")
    expect(migration).toContain("foreign key (event_id) references public.events_v2")
    expect(migration).toContain("'tour'")
    expect(migration).toContain("staff_members_org_user_key")
    expect(migration).toContain("staff_onboarding_candidates_invitation_token_key")
    expect(migration).toContain("employment_assignments_active_tour_key")
    expect(migration).toContain("staff_shifts_exact_active_key")
    expect(migration).toContain("'workforce.manage'")
    expect(migration).toContain("'workforce.view'")
    expect(migration).toContain("sm.user_id = (select auth.uid())")
  })
})

describe("staffing service conflicts", () => {
  it("rejects an invalid window before querying", async () => {
    await expect(assertNoShiftConflict({} as never, {
      staffMemberId: "staff",
      shiftDate: "2026-08-20",
      startTime: "18:00",
      endTime: "09:00",
    })).rejects.toMatchObject({ code: "validation" })
  })

  it("returns a readable 409 for an overlap", async () => {
    const chain: Record<string, any> = {}
    const self = () => chain
    chain.select = vi.fn(self)
    chain.eq = vi.fn(self)
    chain.is = vi.fn(self)
    chain.not = vi.fn(self)
    chain.lt = vi.fn(self)
    chain.gt = vi.fn(self)
    chain.neq = vi.fn(self)
    chain.limit = vi.fn(async () => ({ data: [{ id: "shift_existing" }], error: null }))
    const supabase = { from: vi.fn(() => chain) }

    const promise = assertNoShiftConflict(supabase as never, {
      staffMemberId: "staff",
      shiftDate: "2026-08-20",
      startTime: "10:00",
      endTime: "14:00",
    })
    await expect(promise).rejects.toMatchObject({ code: "conflict" })
    await promise.catch((error) => expect(staffingErrorStatus(error)).toBe(409))
  })

  it("maps structured staffing errors to public statuses", () => {
    expect(staffingErrorStatus(new StaffingFlowError("forbidden", "no"))).toBe(403)
    expect(staffingErrorStatus(new StaffingFlowError("not_found", "no"))).toBe(404)
  })
})

describe("tour and invitation contracts", () => {
  it("never writes the removed org_id column to tour_team_members", () => {
    const payload = buildTourMemberWrite({
      tour_id: "11111111-1111-4111-8111-111111111111",
      user_id: "22222222-2222-4222-8222-222222222222",
      role: "Lighting Director",
      status: "pending",
    }, "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444")
    expect(payload).not.toHaveProperty("org_id")
    expect(payload).toMatchObject({ role: "Lighting Director", status: "pending" })
  })

  it("accepts either the matching email or the matching verified phone", () => {
    expect(staffingInvitationDestinationMatches({
      invitationEmail: "worker@example.com",
      invitationPhone: "+1 (415) 555-0100",
      userEmail: "different@example.com",
      userPhone: "14155550100",
    })).toBe(true)
    expect(staffingInvitationDestinationMatches({
      invitationEmail: "worker@example.com",
      userEmail: "WORKER@example.com",
    })).toBe(true)
    expect(staffingInvitationDestinationMatches({
      invitationEmail: "worker@example.com",
      userEmail: "different@example.com",
    })).toBe(false)
  })
})

describe("shared assignment UX contracts", () => {
  const eventManager = readFileSync(join(root, "components/admin/event-staff-manager.tsx"), "utf8")
  const tourManager = readFileSync(join(root, "components/admin/tour-team-manager.tsx"), "utf8")
  const workMode = readFileSync(join(root, "components/work-mode/work-mode-workspace.tsx"), "utf8")
  const workModeReadModel = readFileSync(join(root, "lib/work-mode/read-model.ts"), "utf8")

  it("offers organization people and external invitation modes with onboarding selection", () => {
    for (const source of [eventManager, tourManager]) {
      expect(source).toContain("Organization people")
      expect(source).toContain("Invite someone")
      expect(source).toContain("Onboarding packet")
    }
    expect(eventManager).toContain("Assignment not saved")
    expect(tourManager).toContain("assignmentError")
  })

  it("renders tour/event context and onboarding before operational tasks in Work Mode", () => {
    expect(workMode).toContain("Tour assignment")
    expect(workMode).toContain("Event shift")
    expect(workModeReadModel).toContain("tasks: [...onboardingTasks, ...operationalTasks]")
    expect(workMode).toContain("Complete onboarding")
  })
})
