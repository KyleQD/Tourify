import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { createJobPostingApiSchema } from "@/lib/api/hiring-api-schemas"
import { JOB_SEAT_PERMISSION_BUNDLES } from "@/lib/hiring/job-seat-permissions"
import { buildWorkforceJobPostingPayload } from "@/lib/job-posting/job-posting-adapters"
import type { HiringEntity } from "@/types/hiring-entity"

const root = process.cwd()
const employer: HiringEntity = {
  entityType: "organization",
  entityId: "11111111-1111-4111-8111-111111111111",
  displayName: "Test Org",
}
const onboardingTemplateId = "22222222-2222-4222-8222-222222222222"
const eventId = "33333333-3333-4333-8333-333333333333"
const tourId = "44444444-4444-4444-8444-444444444444"

describe("scoped job posting API contract", () => {
  it("requires the matching event or tour target", () => {
    const missingEvent = createJobPostingApiSchema.safeParse({
      title: "Stagehand",
      description: "Support production",
      assignment_scope: "event",
      status: "draft",
    })
    expect(missingEvent.success).toBe(false)

    const tour = createJobPostingApiSchema.safeParse({
      title: "Stagehand",
      description: "Support production",
      assignment_scope: "tour",
      tour_id: tourId,
      status: "draft",
    })
    expect(tour.success).toBe(true)
  })

  it("rejects organization seat access on scoped roster jobs", () => {
    const result = createJobPostingApiSchema.safeParse({
      title: "Stagehand",
      description: "Support production",
      assignment_scope: "event",
      event_id: eventId,
      seat_permissions: ["finance.manage"],
      status: "draft",
    })
    expect(result.success).toBe(false)
  })

  it("allows publishing before onboarding is configured", () => {
    const result = createJobPostingApiSchema.safeParse({
      title: "Stagehand",
      description: "Support production",
      assignment_scope: "organization",
      status: "published",
    })
    expect(result.success).toBe(true)
  })
})

describe("scoped job posting payloads", () => {
  it("serializes an event roster target and onboarding packet", () => {
    const payload = buildWorkforceJobPostingPayload({
      employer,
      status: "published",
      values: {
        title: "Stagehand",
        description: "Support production",
        assignmentScope: "event",
        eventId,
        onboardingTemplateId,
      },
    })
    expect(payload).toMatchObject({
      assignment_scope: "event",
      event_id: eventId,
      tour_id: null,
      onboarding_template_id: onboardingTemplateId,
      seat_permissions: [],
    })
    expect(createJobPostingApiSchema.safeParse(payload).success).toBe(true)
  })

  it("serializes owner-selected organization seat permissions", () => {
    const permissions = JOB_SEAT_PERMISSION_BUNDLES.find((bundle) => bundle.id === "ticketing")!.capabilities
    const payload = buildWorkforceJobPostingPayload({
      employer,
      status: "published",
      values: {
        title: "Ticketing coordinator",
        description: "Manage event ticketing",
        assignmentScope: "organization",
        onboardingTemplateId,
        seatRole: "worker",
        seatPermissions: permissions,
      },
    })
    expect(payload).toMatchObject({
      assignment_scope: "organization",
      event_id: null,
      tour_id: null,
      seat_role: "worker",
      seat_permissions: ["ticketing.view", "ticketing.manage"],
    })
    expect(createJobPostingApiSchema.safeParse(payload).success).toBe(true)
  })
})

describe("approval and database projection contracts", () => {
  const migration = readFileSync(join(root, "supabase/migrations/20260821180438_job_posting_scopes_and_organization_seats.sql"), "utf8")
  const service = readFileSync(join(root, "lib/services/hiring-onboarding.service.ts"), "utf8")
  const wizard = readFileSync(join(root, "components/hiring/admin-job-posting-wizard.tsx"), "utf8")

  it("adds explicit destinations and active organization seats", () => {
    expect(migration).toContain("job_posting_templates_assignment_target_check")
    expect(migration).toContain("foreign key (event_id) references public.events_v2")
    expect(migration).toContain("add column if not exists permissions text[]")
    expect(migration).toContain("employment_assignments_active_organization_key")
  })

  it("projects approvals to each operational destination", () => {
    expect(service).toContain("projectHireToEventRoster")
    expect(service).toContain("projectHireToTourCrew")
    expect(service).toContain("provisionOrganizationSeat")
    expect(service).toContain("syncTourEmploymentAssignment")
  })

  it("shows destination, onboarding, and seat access in the shared modal", () => {
    expect(wizard).toContain("Where will this person work?")
    expect(wizard).toContain("Organization seat access")
    expect(wizard).toContain("Onboarding packet (optional)")
    expect(wizard).toContain("This posting is ready to publish")
    expect(wizard).toContain("Approved applicants will be added to the selected team automatically")
  })
})
