import { describe, expect, it } from "vitest"

import {
  applyEventReadinessWarningOverrides,
  evaluateEventReadiness,
} from "@/lib/admin/event-readiness-engine"
import { ADMIN_READINESS_RULES, listEventReadinessRules } from "@/lib/admin/readiness-contract"
import { getEventReadiness } from "@/lib/admin/operations-readiness"

describe("EVENT-201 event readiness engine", () => {
  it("exposes stable contract rule ids for every event domain rule", () => {
    const ids = listEventReadinessRules().map((rule) => rule.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "basics",
        "schedule",
        "venue",
        "venue_profile",
        "team",
        "tour_assignment",
        "advancing",
        "logistics",
        "finance",
        "day_sheet",
        "communications",
      ]),
    )
  })

  it("blocks publish without title, schedule, or venue identity", () => {
    const evaluation = evaluateEventReadiness({ title: "", date: "", venue_name: "" })
    expect(evaluation.ok).toBe(false)
    expect(evaluation.blockers.map((row) => row.id)).toEqual(
      expect.arrayContaining(["basics", "schedule", "venue"]),
    )
    expect(evaluation.blockers.every((row) => row.severity === "blocker")).toBe(true)
    expect(evaluation.blockers.every((row) => row.remediationUrl.includes("/admin/dashboard/events/"))).toBe(true)
    expect(evaluation.blockers.every((row) => typeof row.evidence === "object")).toBe(true)
  })

  it("treats missing venue profile and staffing as warnings when venue draft exists", () => {
    const evaluation = evaluateEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      venue_name: "Some Hall",
      staff_count: 0,
    })
    expect(evaluation.ok).toBe(true)
    expect(evaluation.blockers).toHaveLength(0)
    expect(evaluation.warnings.map((row) => row.id)).toEqual(
      expect.arrayContaining(["venue_profile", "team"]),
    )
    expect(evaluation.warnings.find((row) => row.id === "venue_profile")?.overridePolicy).toBe(
      "capability_warning",
    )
  })

  it("does not trust stale venue profile ids and uses canonical staffing evidence", () => {
    const staleVenue = evaluateEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      venue_name: "Some Hall",
      venue_account_id: "44444444-4444-4444-8444-444444444444",
      venue_profile_status: "missing",
      staff_count: 2,
      staffing_status: "verified",
    })

    expect(staleVenue.warnings.find((row) => row.id === "venue_profile")?.evidence).toMatchObject({
      venueAccountIdProvided: true,
      venueProfileStatus: "missing",
    })
    expect(staleVenue.warnings.map((row) => row.id)).not.toContain("team")
  })

  it("applies capability warning overrides without clearing blockers", () => {
    const evaluation = evaluateEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      venue_name: "Some Hall",
      staff_count: 0,
    })
    const overridden = applyEventReadinessWarningOverrides({
      evaluation,
      overrideFindingIds: ["venue_profile", "team", "basics"],
      hasOverrideCapability: true,
    })
    expect(overridden.warnings.map((row) => row.id)).not.toContain("venue_profile")
    expect(overridden.warnings.map((row) => row.id)).not.toContain("team")
    expect(overridden.ok).toBe(true)

    const blocked = evaluateEventReadiness({ title: "", date: "", venue_name: "" })
    const stillBlocked = applyEventReadinessWarningOverrides({
      evaluation: blocked,
      overrideFindingIds: ["basics", "schedule", "venue"],
      hasOverrideCapability: true,
    })
    expect(stillBlocked.ok).toBe(false)
    expect(stillBlocked.blockers.map((row) => row.id)).toEqual(
      expect.arrayContaining(["basics", "schedule", "venue"]),
    )
  })

  it("shares the same findings through getEventReadiness for builder/command surfaces", () => {
    const summary = getEventReadiness({
      eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      title: "Opening night",
      date: "2026-08-14",
      venue_name: "The Fonda",
      staff_count: 0,
    })
    expect(summary.evaluation?.source).toBe("event_readiness_contract")
    expect(summary.evaluation?.findings.every((row) => row.id && row.severity && row.remediationUrl)).toBe(true)
    expect(summary.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        ADMIN_READINESS_RULES.event_basics.id,
        ADMIN_READINESS_RULES.event_schedule.id,
        ADMIN_READINESS_RULES.event_venue_identity.id,
        ADMIN_READINESS_RULES.event_staffing.id,
      ]),
    )
    expect(summary.conflicts.map((row) => row.id)).toEqual(
      expect.arrayContaining(["venue_profile", "team"]),
    )
    expect(summary.blockers).toHaveLength(0)
  })

  it("flags multi-tour events without a primary tour", () => {
    const evaluation = evaluateEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      venue_account_id: "44444444-4444-4444-8444-444444444444",
      tour_ids: ["tour-a", "tour-b"],
      primary_tour_id: null,
      staff_count: 1,
      has_logistics: true,
      has_site_map: true,
      has_comms: true,
      technical_rider: "ok",
      hospitality_rider: "ok",
      security_notes: "ok",
      ticket_price: "40",
      day_sheet_notes: "doors 7",
    })
    expect(evaluation.warnings.some((row) => row.id === "tour_assignment")).toBe(true)
  })
})
