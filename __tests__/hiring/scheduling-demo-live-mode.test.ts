import { describe, expect, it } from "vitest"

import {
  DEMO_MUTATION_ERROR,
  deriveLiveAvailability,
  extractEventVenueId,
  extractEventVenueName,
  LIVE_SHIFT_TEMPLATES,
  selectSchedulingTemplates,
  shouldLoadLiveSchedulingDetails,
} from "@/components/admin/scheduling/use-scheduling-data"
import { DEMO_SHIFT_TEMPLATES } from "@/components/admin/scheduling/scheduling-data"
import { resolveSchedulingVenueId } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"

describe("scheduling venue resolution", () => {
  it("extracts venue_id from event settings.venue_account_id", () => {
    expect(
      extractEventVenueId({
        id: "evt_1",
        settings: { venue_account_id: "venue_from_settings" },
      }),
    ).toBe("venue_from_settings")
  })

  it("prefers top-level venue_id over settings", () => {
    expect(
      extractEventVenueId({
        venue_id: "venue_top",
        settings: { venue_account_id: "venue_settings" },
      }),
    ).toBe("venue_top")
  })

  it("extracts nested venue name", () => {
    expect(
      extractEventVenueName({
        venue: { id: "v1", name: "The Fillmore" },
      }),
    ).toBe("The Fillmore")
  })

  it("resolveSchedulingVenueId uses venue employer entity id", () => {
    const employer: HiringEntity = {
      entityType: "venue",
      entityId: "venue_abc",
      displayName: "Venue ABC",
    }
    expect(resolveSchedulingVenueId(employer)).toBe("venue_abc")
  })

  it("resolveSchedulingVenueId uses scope.venueId for org employers", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
      scope: { venueId: "venue_scoped" },
    }
    expect(resolveSchedulingVenueId(employer)).toBe("venue_scoped")
  })

  it("resolveSchedulingVenueId returns null for org without venue scope", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
    }
    expect(resolveSchedulingVenueId(employer)).toBeNull()
  })

  it("exports demo mutation guard message", () => {
    expect(DEMO_MUTATION_ERROR).toContain("Switch to Live")
  })

  it("loads live schedule details for an org without a venue", () => {
    const employer: HiringEntity = {
      entityType: "organization",
      entityId: "org_1",
      displayName: "Org",
    }

    expect(shouldLoadLiveSchedulingDetails({ mode: "live", employer, venueId: null })).toBe(true)
    expect(shouldLoadLiveSchedulingDetails({ mode: "live", employer, venueId: "venue_1" })).toBe(true)
    expect(shouldLoadLiveSchedulingDetails({ mode: "demo", employer, venueId: "venue_1" })).toBe(false)
    expect(shouldLoadLiveSchedulingDetails({ mode: "live", employer: null, venueId: null })).toBe(false)
  })

  it("keeps demo templates out of live mode (WORK-104)", () => {
    expect(LIVE_SHIFT_TEMPLATES).toEqual([])
    expect(selectSchedulingTemplates("live")).toEqual([])
    expect(selectSchedulingTemplates("demo").length).toBeGreaterThan(0)
    expect(DEMO_SHIFT_TEMPLATES.every((tpl) => tpl.isDemoFixture)).toBe(true)
  })

  it("derives live availability from shifts only — no invented available slots", () => {
    const weekDays = [
      { key: "mon", label: "Mon", date: "2026-07-20", shortLabel: "M", isToday: false },
      { key: "tue", label: "Tue", date: "2026-07-21", shortLabel: "T", isToday: false },
    ]
    const staff = [
      {
        id: "staff_1",
        name: "Alex",
        role: "Rigger",
        department: "Production" as const,
        availabilityStatus: "pending" as const,
        confirmationStatus: "none" as const,
        skills: [],
        email: "a@example.com",
        phone: "",
        credentials: [],
        confirmationRate: 0,
        upcomingShifts: 1,
        weeklyHours: 4,
        conflictCount: 0,
        workedEvents: [],
        lastAssignedDaysAgo: 0,
      },
    ]
    const shifts = [
      {
        id: "shift_1",
        title: "Load-in",
        eventName: "Show",
        venueName: "Hall",
        department: "Production" as const,
        role: "Rigger",
        date: "2026-07-20",
        startTime: "09:00",
        endTime: "13:00",
        status: "confirmed" as const,
        assignedStaff: staff[0],
        neededStaffCount: 1,
        priority: "medium" as const,
        shiftType: "event" as const,
        updatedAt: new Date().toISOString(),
        requiredSkills: [],
      },
    ]

    const availability = deriveLiveAvailability(staff, weekDays as any, shifts)
    expect(availability[0].slots).toEqual([
      { day: "mon", status: "scheduled" },
      { day: "tue", status: "unavailable" },
    ])
    expect(availability[0].slots.every((slot) => slot.status !== "available")).toBe(true)
  })
})
