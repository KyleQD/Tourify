import { describe, it, expect, vi, beforeEach } from "vitest"

// Provide a supabase module mock that returns the expected table-check response
vi.mock("@/lib/supabase", () => {
  const chainReturnsError = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: null, error: { message: "relation \"job_posting_templates\" does not exist" } }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis(),
  })

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chainReturnsError()),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    },
  }
})

import { AdminOnboardingStaffService } from "@/lib/services/admin-onboarding-staff.service"

describe("AdminOnboardingStaffService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("has getJobPostings static method", () => {
    expect(typeof AdminOnboardingStaffService.getJobPostings).toBe("function")
  })

  it("getJobPostings throws user-friendly error when table missing", async () => {
    await expect(
      AdminOnboardingStaffService.getJobPostings("venue-123")
    ).rejects.toThrow("Failed to load job postings from database")
  })

  it("has getJobApplications static method", () => {
    expect(typeof AdminOnboardingStaffService.getJobApplications).toBe("function")
  })
})
