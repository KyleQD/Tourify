import { describe, expect, it } from "vitest"

import {
  buildArtistJobPayload,
  buildEventJobPayload,
  buildJobPostingEndpoint,
  buildTourJobPayload,
  buildVenueJobPostingPayload,
  buildWorkforceJobPostingPayload,
} from "@/lib/job-posting/job-posting-adapters"
import { getJobPostingWizardStepState } from "@/lib/job-posting/job-posting-wizard-state"
import type { CreateJobFormData } from "@/types/artist-jobs"
import type { HiringEntity } from "@/types/hiring-entity"

const employer: HiringEntity = {
  entityType: "organization",
  entityId: "11111111-1111-4111-8111-111111111111",
  displayName: "Test Org",
}

const artistJobValues: CreateJobFormData = {
  title: "Tour Guitarist",
  description: "Play the summer tour.",
  category_id: "cat-1",
  job_type: "tour",
  payment_type: "paid",
  payment_currency: "USD",
  location: "",
  location_type: "in_person",
  event_date: "",
  required_skills: ["Guitar"],
  required_equipment: ["Guitar"],
  required_experience: "professional",
  required_genres: ["Rock"],
  benefits: ["Travel"],
  priority: "normal",
  featured: false,
  status: "open",
}

describe("job posting standardization adapters", () => {
  it("builds workforce payloads with employer scope and default application fields", () => {
    const payload = buildWorkforceJobPostingPayload({
      employer,
      status: "published",
      values: {
        title: "Security Guard",
        description: "Monitor the front gate.",
        department: "Security",
        position: "Guard",
        numberOfPositions: 2,
        salaryMin: "20",
        salaryMax: "30",
        salaryType: "hourly",
        remote: false,
        urgent: true,
      },
    })

    expect(payload).toMatchObject({
      entity_type: "organization",
      entity_id: employer.entityId,
      employer_entity_type: "organization",
      employer_entity_id: employer.entityId,
      title: "Security Guard",
      department: "Security",
      position: "Guard",
      number_of_positions: 2,
      urgent: true,
      status: "published",
      salary_range: { min: 20, max: 30, type: "hourly" },
    })
    expect(payload.application_form_template.fields.length).toBeGreaterThan(0)
  })

  it("builds venue payloads for the existing venue hiring endpoint", () => {
    const payload = buildVenueJobPostingPayload({
      venue: { id: "22222222-2222-4222-8222-222222222222", name: "The Room" },
      values: {
        title: "Lead Bartender",
        description: "Run the bar.",
        department: "Bar Staff",
        salaryMin: "200",
        salaryType: "fixed",
      },
    })

    expect(payload).toMatchObject({
      venue_id: "22222222-2222-4222-8222-222222222222",
      title: "Lead Bartender",
      department: "Bar Staff",
      location: "The Room",
      status: "published",
      salary_range: { min: 200, max: null, type: "flat" },
    })
  })

  it("preserves artist job values and optional date overrides", () => {
    const payload = buildArtistJobPayload({
      values: artistJobValues,
      eventDate: "2026-08-01",
      deadline: "2026-07-25",
    })

    expect(payload).toMatchObject({
      title: "Tour Guitarist",
      event_date: "2026-08-01",
      deadline: "2026-07-25",
    })
  })

  it("adds event defaults without changing the event endpoint contract", () => {
    const payload = buildEventJobPayload({
      values: artistJobValues,
      context: { eventDate: "2026-09-10", eventLocation: "Las Vegas" },
    })

    expect(payload).toMatchObject({
      title: "Tour Guitarist",
      location: "Las Vegas",
      event_date: "2026-09-10",
    })
  })

  it("adds tour context for the existing tour jobs endpoint", () => {
    const payload = buildTourJobPayload({
      values: { ...artistJobValues, external_link: "" },
      context: {
        tourId: "33333333-3333-4333-8333-333333333333",
        tourName: "Summer Tour",
        tourStartDate: "2026-08-01",
        tourEndDate: "2026-08-30",
      },
    })

    expect(payload).toMatchObject({
      tour_id: "33333333-3333-4333-8333-333333333333",
      tour_name: "Summer Tour",
      tour_start_date: "2026-08-01",
      tour_end_date: "2026-08-30",
    })
    expect(payload).not.toHaveProperty("external_link")
  })

  it("builds endpoints without double question marks", () => {
    expect(buildJobPostingEndpoint("/api/hiring/job-postings", "?entity_type=organization")).toBe(
      "/api/hiring/job-postings?entity_type=organization"
    )
  })
})

describe("job posting wizard shell", () => {
  it("calculates step state for shared progress UI", () => {
    expect(getJobPostingWizardStepState(1, 2)).toEqual({ isActive: false, isDone: true, isFuture: false })
    expect(getJobPostingWizardStepState(2, 2)).toEqual({ isActive: true, isDone: false, isFuture: false })
    expect(getJobPostingWizardStepState(3, 2)).toEqual({ isActive: false, isDone: false, isFuture: true })
  })
})
