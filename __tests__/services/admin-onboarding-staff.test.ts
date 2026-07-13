import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDb = vi.hoisted(() => ({
  tables: {} as Record<string, { exists?: boolean; rows?: Array<Record<string, any>>; error?: any }>,
}))

vi.mock("@/lib/supabase", () => {
  const createChain = (table: string) => {
    const filters: Array<(row: Record<string, any>) => boolean> = []
    const resolveRows = () => {
      const state = mockDb.tables[table]
      if (!state?.exists) return { data: null, error: { message: `relation "${table}" does not exist` } }
      if (state.error) return { data: null, error: state.error }
      return { data: (state.rows ?? []).filter((row) => filters.every((filter) => filter(row))), error: null }
    }

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push((row) => row[field] === value)
        return chain
      }),
      or: vi.fn(() => chain),
      is: vi.fn((field: string, value: unknown) => {
        filters.push((row) => row[field] === value)
        return chain
      }),
      in: vi.fn((field: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[field]))
        return chain
      }),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => resolveRows()),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: null, error: null })),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      rpc: vi.fn(() => chain),
      then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolveRows()).then(onFulfilled, onRejected),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn((table: string) => createChain(table)),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    },
  }
})

import { AdminOnboardingStaffService } from "@/lib/services/admin-onboarding-staff.service"

describe("AdminOnboardingStaffService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.tables = {}
  })

  it("has getJobPostings static method", () => {
    expect(typeof AdminOnboardingStaffService.getJobPostings).toBe("function")
  })

  it("getJobPostings returns an empty list when table missing", async () => {
    await expect(AdminOnboardingStaffService.getJobPostings("venue-123")).resolves.toEqual([])
  })

  it("getJobPostings keeps rows when optional form relationship cannot be hydrated", async () => {
    mockDb.tables = {
      job_posting_templates: {
        exists: true,
        rows: [{ id: "job-1", venue_id: null, application_form_template_id: "form-1", title: "Door Staff" }],
      },
    }

    await expect(AdminOnboardingStaffService.getJobPostings("not-a-uuid")).resolves.toEqual([
      expect.objectContaining({
        id: "job-1",
        application_form_template: null,
      }),
    ])
  })

  it("has getJobApplications static method", () => {
    expect(typeof AdminOnboardingStaffService.getJobApplications).toBe("function")
  })

  it("getJobApplications returns rows when optional posting relationship cannot be hydrated", async () => {
    mockDb.tables = {
      job_applications: {
        exists: true,
        rows: [{ id: "app-1", venue_id: "venue-1", job_posting_id: "job-1", applicant_name: "Ava" }],
      },
    }

    await expect(AdminOnboardingStaffService.getJobApplications("venue-1")).resolves.toEqual([
      expect.objectContaining({
        id: "app-1",
        job_posting: null,
        evidence_request_status: null,
      }),
    ])
  })

  it("read-only dashboard methods degrade to empty data when tables are missing", async () => {
    await expect(AdminOnboardingStaffService.getOnboardingCandidates("venue-1")).resolves.toEqual([])
    await expect(AdminOnboardingStaffService.getStaffShifts("venue-1")).resolves.toEqual([])
    await expect(AdminOnboardingStaffService.getDashboardStats("venue-1")).resolves.toMatchObject({
      onboarding: { total_candidates: 0 },
      job_postings: { total_postings: 0 },
      staff_management: { total_staff: 0 },
    })
  })
})
