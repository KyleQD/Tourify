import { describe, expect, it } from "vitest"

import {
  presentApplicationReviewItem,
  presentDashboardStats,
  presentJobListItem,
  presentRosterMemberListItem,
  presentTemplateListItem,
} from "@/lib/hiring/api-presenters"

describe("workforce API presenters", () => {
  it("flattens nested dashboard stats for the hiring overview", () => {
    expect(
      presentDashboardStats({
        stats: {
          jobs: { total: 3, published: 2, draft: 1, closed: 0 },
          applications: { total: 10, pending: 4, approved: 3, rejected: 2, waitlisted: 1 },
          onboarding: { total: 5, pending: 1, inProgress: 2, completed: 2, rejected: 0, averageProgress: 64 },
          roster: { total: 7, active: 6, inactive: 1 },
        },
        recentActivity: [{ id: "evt_1", action: "approved", createdAt: "2026-06-30T00:00:00.000Z" }],
      })
    ).toMatchObject({
      totalJobs: 3,
      publishedJobs: 2,
      totalApplications: 10,
      pendingApplications: 4,
      onboardingInProgress: 2,
      rosterActive: 6,
      averageOnboardingProgress: 64,
      recentActivity: [{ id: "evt_1" }],
    })
  })

  it("presents raw job postings as dashboard list items", () => {
    expect(
      presentJobListItem({
        id: "job_1",
        title: "Security Guard",
        department: "Security",
        position: "Guard",
        number_of_positions: 4,
        created_at: "2026-06-30T00:00:00.000Z",
      })
    ).toEqual({
      id: "job_1",
      title: "Security Guard",
      department: "Security",
      position: "Guard",
      status: null,
      numberOfPositions: 4,
      createdAt: "2026-06-30T00:00:00.000Z",
      publishedAt: null,
    })
  })

  it("presents applications for both compact lists and review drawers", () => {
    const item = presentApplicationReviewItem({
      id: "app_1",
      applicant_name: "Avery Worker",
      applicant_email: "avery@example.com",
      applicant_phone: "555-0100",
      job_posting_id: "job_1",
      job_title: "Bartender",
      status: "pending",
      created_at: "2026-06-30T00:00:00.000Z",
      form_responses: { experience: "5 years" },
      is_eligible: true,
    })

    expect(item.applicantName).toBe("Avery Worker")
    expect(item.jobTitle).toBe("Bartender")
    expect(item.applicant.email).toBe("avery@example.com")
    expect(item.job.id).toBe("job_1")
    expect(item.formResponses).toEqual({ experience: "5 years" })
    expect(item.eligibility?.isEligible).toBe(true)
    expect(item.isStarred).toBe(false)
    expect(item.profileSnapshot).toBeNull()
  })

  it("maps the profile snapshot, star state, and snapshot avatar fallback", () => {
    const item = presentApplicationReviewItem({
      id: "app_2",
      applicant_name: "Jordan Crew",
      applicant_email: "jordan@example.com",
      job_posting_id: "job_2",
      job_title: "Rigger",
      status: "shortlisted",
      created_at: "2026-06-30T00:00:00.000Z",
      form_responses: {},
      is_starred: true,
      starred_at: "2026-06-30T01:00:00.000Z",
      profile_shared_at: "2026-06-30T00:00:00.000Z",
      profile_snapshot: {
        version: "1",
        basics: { fullName: "Jordan Crew", avatarUrl: "https://example.com/j.png" },
      },
    })

    expect(item.isStarred).toBe(true)
    expect(item.starredAt).toBe("2026-06-30T01:00:00.000Z")
    expect(item.profileSnapshot?.basics.fullName).toBe("Jordan Crew")
    expect(item.applicant.avatarUrl).toBe("https://example.com/j.png")
  })

  it("presents roster members and templates with camelCase fields", () => {
    expect(
      presentRosterMemberListItem({
        id: "member_1",
        full_name: "Riley Crew",
        role: "FOH",
        compliance_status: "approved",
        created_at: "2026-06-30T00:00:00.000Z",
      })
    ).toMatchObject({
      id: "member_1",
      name: "Riley Crew",
      position: "FOH",
      complianceStatus: "approved",
      startedAt: "2026-06-30T00:00:00.000Z",
    })

    expect(
      presentTemplateListItem({
        id: "template_1",
        name: "General Staff",
        is_default: true,
        updated_at: "2026-06-30T00:00:00.000Z",
      })
    ).toMatchObject({
      id: "template_1",
      name: "General Staff",
      isDefault: true,
      updatedAt: "2026-06-30T00:00:00.000Z",
    })
  })
})
