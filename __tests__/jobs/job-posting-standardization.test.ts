import { describe, expect, it } from "vitest"

import {
  buildArtistJobPayload,
  buildEventJobPayload,
  buildJobPostingEndpoint,
  buildTourJobPayload,
  buildVenueJobPostingPayload,
  buildWorkforceJobPostingPayload,
} from "@/lib/job-posting/job-posting-adapters"
import {
  buildEventJobInitialValues,
  buildTourJobInitialValues,
  normalizeJobDate,
  normalizeJobTime,
} from "@/lib/job-posting/job-posting-prefill"
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

describe("event and tour job prefills", () => {
  it("maps persisted event details into matching job fields", () => {
    const values = buildEventJobInitialValues({
      description: "An outdoor headline show.",
      eventDate: "2026-08-20T19:30:00.000Z",
      eventTime: "19:30:00",
      venueName: "Music Box San Diego",
      venueAddress: "1337 India St",
      venueCity: "San Diego",
      venueState: "CA",
      venueCountry: "US",
      venueWebsite: "https://musicboxsd.com",
      venueContactEmail: "ops@example.com",
      venueContactPhone: "555-0100",
      durationMinutes: 150,
      soundRequirements: "House console",
      specialRequirements: "All ages",
    })

    expect(values).toMatchObject({
      description: "An outdoor headline show.",
      location: "Music Box San Diego",
      city: "San Diego",
      state: "CA",
      country: "US",
      event_date: "2026-08-20",
      event_time: "19:30",
      duration_hours: 2.5,
      contact_email: "ops@example.com",
      contact_phone: "555-0100",
      external_link: "https://musicboxsd.com",
    })
    expect(values.special_requirements).toContain("Special requirements: All ages")
    expect(values.special_requirements).toContain("Sound: House console")
  })

  it("maps tour details and distinct stop locations into matching job fields", () => {
    const values = buildTourJobInitialValues({
      description: "West Coast summer run.",
      startDate: "2026-09-01T00:00:00.000Z",
      transportation: "Sleeper bus",
      accommodation: "Hotels provided",
      equipmentRequirements: "PA System, Microphones\nLighting Equipment",
      specialRequirements: "Valid passport",
      stops: [
        { venueName: "Music Box", venueCity: "San Diego", venueState: "CA", venueCountry: "US" },
        { venueName: "The Wiltern", venueCity: "Los Angeles", venueState: "CA", venueCountry: "US" },
      ],
    })

    expect(values).toMatchObject({
      description: "West Coast summer run.",
      location: "Music Box, The Wiltern",
      city: "San Diego, Los Angeles",
      state: "CA",
      country: "US",
      event_date: "2026-09-01",
      required_equipment: ["PA System", "Microphones", "Lighting Equipment"],
    })
    expect(values.special_requirements).toContain("Transportation: Sleeper bus")
    expect(values.special_requirements).toContain("Accommodation: Hotels provided")
  })

  it("normalizes ISO and local date/time values for native inputs", () => {
    expect(normalizeJobDate("2026-08-20T19:30:00Z")).toBe("2026-08-20")
    expect(normalizeJobTime("2026-08-20T19:30:00Z")).toBe("19:30")
    expect(normalizeJobTime("7:30 PM")).toBe("")
  })
})
