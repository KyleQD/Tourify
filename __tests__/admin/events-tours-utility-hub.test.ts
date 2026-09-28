import { describe, expect, it } from "vitest"

import {
  buildAdminHiringHref,
  buildAdminRosterHref,
  resolveEmployerFromEventRow,
} from "@/lib/admin/admin-ops-context"
import { mapAdminEventStatus } from "@/lib/events/admin-event-normalization"
import { getEventReadiness, getTourReadiness } from "@/lib/admin/operations-readiness"
import { mapV2StatusToUi } from "@/app/api/events/_lib/events-v2-admin"

describe("utility hub status honesty", () => {
  it("maps inquiry/hold/offer to draft in UI", () => {
    expect(mapAdminEventStatus("inquiry")).toBe("draft")
    expect(mapAdminEventStatus("hold")).toBe("draft")
    expect(mapAdminEventStatus("offer")).toBe("draft")
    expect(mapV2StatusToUi("inquiry")).toBe("draft")
  })
})

describe("utility hub ops employer hrefs", () => {
  it("includes entity_type and entity_id on roster/hiring links", () => {
    const roster = buildAdminRosterHref({
      eventId: "33333333-3333-4333-8333-333333333333",
      entityType: "organization",
      entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    })
    expect(roster).toContain("entity_type=organization")
    expect(roster).toContain("entity_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    expect(roster).toContain("eventId=33333333-3333-4333-8333-333333333333")

    const hiring = buildAdminHiringHref({
      eventId: "33333333-3333-4333-8333-333333333333",
      entityType: "venue",
      entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    })
    expect(hiring).toContain("entity_type=venue")
    expect(hiring).toContain("entity_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
  })

  it("prefers venue_account_id from settings when resolving employer", () => {
    const employer = resolveEmployerFromEventRow({
      org_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      venue_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      settings: { venue_account_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
    })
    expect(employer).toEqual({
      entityType: "venue",
      entityId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      venueId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    })
  })
})

describe("utility hub readiness blockers", () => {
  it("treats missing venue profile and staff as warnings when a venue draft exists (ADR-006)", () => {
    const readiness = getEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      venue_name: "Some Hall",
      staff_count: 0,
    })
    const blockerIds = readiness.blockers.map((item) => item.id)
    expect(blockerIds).not.toContain("venue")
    expect(blockerIds).not.toContain("team")
    expect(readiness.conflicts.some((item) => item.id === "venue_profile")).toBe(true)
    expect(readiness.conflicts.some((item) => item.id === "team")).toBe(true)
  })

  it("still blocks publish when no venue identity exists", () => {
    const readiness = getEventReadiness({
      title: "Show",
      start_at: "2026-08-01T20:00:00.000Z",
      staff_count: 0,
    })
    expect(readiness.blockers.map((item) => item.id)).toContain("venue")
  })

  it("blocks tour publish without stops or headliner account", () => {
    const readiness = getTourReadiness({
      name: "Run",
      main_artist: "Label only",
      start_date: "2026-08-01",
      end_date: "2026-08-10",
      events: [],
    })
    expect(readiness.blockers.some((item) => item.id === "events")).toBe(true)
    expect(readiness.conflicts.some((item) => item.id === "headliner-account")).toBe(true)
    expect(readiness.conflicts.some((item) => item.id === "no-stops")).toBe(true)
  })
})

describe("utility hub venue attach settings contract", () => {
  it("documents dual-write keys used by the operations service", () => {
    const settings = {
      venue_account_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      artist_account_ids: ["eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"],
    }
    expect(settings.venue_account_id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(settings.artist_account_ids[0]).toMatch(/^[0-9a-f-]{36}$/i)
  })
})
