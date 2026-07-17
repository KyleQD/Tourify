import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  service: {
    getDashboardStats: vi.fn(),
    getJobPostings: vi.fn(),
    getJobApplications: vi.fn(),
    getOnboardingCandidates: vi.fn(),
    getStaffMembers: vi.fn(),
    getOnboardingWorkflows: vi.fn(),
    getTeamCommunications: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
    },
  })),
}))

vi.mock("@/lib/auth/hiring-permissions", () => ({
  canManageVenueStaffing: vi.fn(async () => true),
  canReviewStaffingApplications: vi.fn(async () => false),
}))

vi.mock("@/lib/services/admin-onboarding-staff.service", () => ({
  AdminOnboardingStaffService: mocks.service,
}))

import { GET } from "@/app/api/admin/staff/dashboard/route"

describe("admin staff dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.service.getDashboardStats.mockResolvedValue({ ok: true })
    mocks.service.getJobPostings.mockResolvedValue([])
    mocks.service.getJobApplications.mockResolvedValue([])
    mocks.service.getOnboardingCandidates.mockResolvedValue([])
    mocks.service.getStaffMembers.mockResolvedValue([])
    mocks.service.getOnboardingWorkflows.mockResolvedValue([])
    mocks.service.getTeamCommunications.mockResolvedValue([])
  })

  it("returns partial dashboard data with failed_slices when one slice fails", async () => {
    mocks.service.getJobPostings.mockRejectedValue(new Error("relationship missing"))

    const response = await GET(new Request("https://tourify.test/api/admin/staff/dashboard?venue_id=venue-1") as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.job_postings).toEqual([])
    expect(payload.failed_slices).toContain("job_postings")
  })
})
