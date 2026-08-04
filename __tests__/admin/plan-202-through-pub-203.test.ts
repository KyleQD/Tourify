import { describe, expect, it } from "vitest"

import { buildTourStopImpactPreview } from "@/lib/admin/tour-stop-protection"
import {
  assertUniqueContiguousOrdinals,
  assignContiguousOrdinals,
  moveStopByDelta,
  reorderStopsByIndex,
  TourStopOrdinalError,
} from "@/lib/admin/tour-stop-ordinals"
import {
  applyReadinessWarningOverrides,
  evaluatePersistedTourReadiness,
} from "@/lib/admin/tour-readiness-engine"
import { buildTourPlanChangeSet } from "@/lib/admin/tour-plan-changeset"
import {
  previewShiftedStopDates,
  validatePlannerDeepCopySelection,
} from "@/lib/admin/tour-planner-deepcopy"
import { renderPublicationSnapshot } from "@/lib/admin/publication-snapshot-renderer"
import { buildPublicationAudiencePreview } from "@/lib/admin/publication-audience-preview"
import { tourPlanStopSchema } from "@/lib/admin/tour-plan-schemas"

describe("PLAN-202 stop editor schema", () => {
  it("accepts stop types, timezone, windows, contacts, status without requiring raw venue UUID", () => {
    const parsed = tourPlanStopSchema.parse({
      name: "Opening",
      date: "2026-08-01",
      venue: "Garden Hall",
      stop_type: "festival",
      timezone: "America/New_York",
      window_start: "16:00",
      window_end: "23:00",
      contact_name: "Pat",
      contact_email: "pat@example.com",
      planning_status: "confirmed",
      notes: "Early load-in",
    })
    expect(parsed.stop_type).toBe("festival")
    expect(parsed.timezone).toBe("America/New_York")
    expect(parsed.venue_id).toBeUndefined()
  })
})

describe("PLAN-203 ordinal reorder", () => {
  it("reorders by pointer and keyboard with contiguous unique ordinals", () => {
    const stops = [
      { id: "a", ordinal: 0 },
      { id: "b", ordinal: 1 },
      { id: "c", ordinal: 2 },
    ]
    const byPointer = reorderStopsByIndex({ stops, fromIndex: 0, toIndex: 2 })
    expect(byPointer.map((s) => s.id)).toEqual(["b", "c", "a"])
    expect(byPointer.map((s) => s.ordinal)).toEqual([0, 1, 2])

    const byKey = moveStopByDelta({ stops: byPointer, stopId: "a", delta: -1 })
    expect(byKey.map((s) => s.id)).toEqual(["b", "a", "c"])
    assertUniqueContiguousOrdinals(byKey)
  })

  it("rejects broken ordinal sequences", () => {
    expect(() => assertUniqueContiguousOrdinals([{ ordinal: 0 }, { ordinal: 0 }])).toThrow(
      TourStopOrdinalError,
    )
    expect(assignContiguousOrdinals([{ id: "x" }, { id: "y" }]).map((s) => s.ordinal)).toEqual([
      0, 1,
    ])
  })
})

describe("PLAN-204 stop protection", () => {
  it("lists blockers and authorized next actions for protected stops", () => {
    const preview = buildTourStopImpactPreview({
      stopId: "s1",
      eventId: "e1",
      stopName: "Show",
      counts: {
        publishedOrActive: true,
        ticketsSold: 12,
        contracts: 1,
        staffAssignments: 3,
        settled: false,
        legallyRetained: false,
      },
    })
    expect(preview.requiresImpactWorkflow).toBe(true)
    expect(preview.blockers.map((b) => b.id)).toEqual(
      expect.arrayContaining(["published", "ticketed", "contracted", "staffed"]),
    )
    expect(preview.blockers.every((b) => b.nextAction.length > 0)).toBe(true)
  })
})

describe("PLAN-206 readiness engine", () => {
  it("returns stable rule ids, scope, evidence, remediation URL, override policy", () => {
    const evaluation = evaluatePersistedTourReadiness({
      tourId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "",
      mainArtist: null,
      startDate: null,
      endDate: null,
      stops: [],
    })
    expect(evaluation.ok).toBe(false)
    expect(evaluation.source).toBe("persisted_plan")
    expect(evaluation.blockers.some((b) => b.id === "overview")).toBe(true)
    expect(evaluation.blockers[0].remediationUrl).toContain("/admin/dashboard/tours/")
    expect(evaluation.blockers[0].overridePolicy).toBe("forbidden")
  })

  it("applies capability warning overrides only", () => {
    const base = evaluatePersistedTourReadiness({
      tourId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      orgId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Tour",
      mainArtist: "Ada",
      startDate: "2026-08-01",
      endDate: "2026-08-10",
      stops: [
        {
          ordinal: 0,
          stop_type: "show",
          name: "Show",
          local_date: "2026-08-01",
          venue_label: "Hall",
          venue_id: null,
        },
      ],
    })
    const withOverride = applyReadinessWarningOverrides({
      evaluation: base,
      overrideFindingIds: ["venue_profile"],
      hasOverrideCapability: true,
    })
    expect(withOverride.appliedOverrides).toContain("venue_profile")
    expect(withOverride.evaluation.warnings.some((w) => w.id === "venue_profile")).toBe(false)
  })
})

describe("PLAN-207 change sets", () => {
  it("categorizes diffs and identifies affected domains", () => {
    const changeSet = buildTourPlanChangeSet({
      fromVersion: 1,
      toVersion: 2,
      before: {
        name: "A",
        start_date: "2026-08-01",
        stops: [{ event_id: "e1", ordinal: 0, name: "Show", date: "2026-08-01", venue: "Hall" }],
        publication_ids: ["p1"],
        ticketed_event_ids: ["e1"],
        vendor_ids: ["v1"],
        party_count: 4,
        budget: 1000,
      },
      after: {
        name: "A",
        start_date: "2026-08-02",
        stops: [{ event_id: "e1", ordinal: 0, name: "Show", date: "2026-08-03", venue: "Arena" }],
        publication_ids: ["p1"],
        ticketed_event_ids: ["e1"],
        vendor_ids: ["v1"],
        party_count: 4,
        budget: 1200,
      },
    })
    expect(changeSet.categories).toEqual(
      expect.arrayContaining(["dates", "venue", "budget"]),
    )
    expect(changeSet.items.some((item) => item.affected.tickets > 0)).toBe(true)
  })
})

describe("PLAN-208 planner deep copy", () => {
  it("validates stop/hold selection and timezone/date shift", () => {
    const invalid = validatePlannerDeepCopySelection({
      selection: {
        stops: "copy",
        holds: "copy",
        templates: "exclude",
        settings: "copy",
        dateShiftDays: 7,
        requireTimezone: true,
      },
      stops: [{ id: "1", name: "Show", local_date: "2026-08-01", timezone: null }],
    })
    expect(invalid.ok).toBe(false)
    expect(invalid.errors.some((e) => /time zone/i.test(e))).toBe(true)

    const shifted = previewShiftedStopDates({
      stops: [{ id: "1", name: "Show", local_date: "2026-08-01", timezone: "UTC" }],
      dateShiftDays: 2,
    })
    expect(shifted[0].to).toBe("2026-08-03")
  })
})

describe("PUB-202 snapshot renderer", () => {
  it("is deterministic and fails missing required sections instead of silent omit", () => {
    const input = {
      publicationType: "itinerary" as const,
      orgId: "org",
      subjectType: "tour" as const,
      subjectId: "tour-1",
      sourcePlanVersion: 3,
      sections: [
        { key: "overview", title: "Overview", required: true, payload: { name: "Tour" } },
        { key: "stops", title: "Stops", required: true, payload: [{ name: "A" }] },
      ],
    }
    const first = renderPublicationSnapshot(input)
    const second = renderPublicationSnapshot(input)
    expect(first.ok).toBe(true)
    expect(first.checksum).toBe(second.checksum)

    const missing = renderPublicationSnapshot({
      ...input,
      sections: [
        { key: "overview", title: "Overview", required: true, payload: { name: "Tour" } },
        { key: "stops", title: "Stops", required: true, payload: null },
      ],
    })
    expect(missing.ok).toBe(false)
    expect(missing.errors.some((e) => /stops/i.test(e))).toBe(true)
    expect(missing.manifest.sections.find((s) => s.key === "stops")?.status).toBe("missing")
  })
})

describe("PUB-203 audience preview", () => {
  it("shows counts, roles/sources, exclusions, protected fields, channel availability", () => {
    const preview = buildPublicationAudiencePreview({
      publicationType: "itinerary",
      channelAvailability: { sms: false },
      candidates: [
        {
          subjectType: "user",
          subjectId: "u1",
          displayName: "Ada",
          role: "tour_manager",
          source: "tour_team",
          audienceClass: "internal",
          channels: ["in_app", "email", "sms"],
          protectedFields: ["phone"],
        },
        {
          subjectType: "vendor",
          subjectId: "v1",
          displayName: "Sound Co",
          role: "vendor",
          source: "vendor_roster",
          audienceClass: "vendor",
          channels: ["email"],
          protectedFields: [],
          excluded: true,
          excludeReason: "no NDA",
        },
      ],
    })
    expect(preview.includedCount).toBe(1)
    expect(preview.excludedCount).toBe(1)
    expect(preview.byRole.tour_manager).toBe(1)
    expect(preview.excluded[0].reason).toBe("no NDA")
    expect(preview.protectedFields).toContain("phone")
    expect(preview.channelAvailability.sms.available).toBe(false)
    expect(preview.channelAvailability.email.recipientCount).toBe(1)
  })
})
