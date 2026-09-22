/**
 * WORK-401 — Tour party model tests.
 */

import { describe, it, expect } from "vitest"
import {
  TOUR_PARTY_STATUS_TRANSITIONS,
  TOUR_PARTY_FIELD_CLASSES,
  transitionTourPartyMember,
  memberIsActiveOnDate,
  membersActiveOnDate,
  membersActiveInRange,
  projectTourPartyMember,
  memberIsPublicationReady,
  summariseTourParty,
  type TourPartyMember,
  type TourPartyMemberStatus,
} from "@/lib/admin/tour-party-model"

const TOUR = "tour-1"
const ORG = "org-1"
const ACTOR = "mgr-1"
const NOW = "2026-09-01T10:00:00.000Z"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMember(overrides: Partial<TourPartyMember> = {}): TourPartyMember {
  return {
    member_id: "m1",
    tour_id: TOUR,
    org_id: ORG,
    person_id: "p1",
    work_mode_identity_id: "wm-1",
    role_title: "Tour Manager",
    department: "Production",
    status: "draft",
    join_date: "2026-09-01",
    leave_date: null,
    traveler: {
      is_traveling: true,
      home_base: "New York, NY",
      emergency_contact_name: "Jane Doe",
      emergency_contact_phone: "+1-555-0100",
      accessibility_notes: null,
      dietary_notes: "Vegan",
    },
    financial: {
      rate_per_day: 800,
      currency: "USD",
      per_diem_policy_id: "pd-1",
    },
    created_by: ACTOR,
    created_at: NOW,
    updated_by: ACTOR,
    updated_at: NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

describe("WORK-401 — tour party status transitions", () => {
  it("documents all 7 statuses in transition map", () => {
    const statuses = Object.keys(TOUR_PARTY_STATUS_TRANSITIONS) as TourPartyMemberStatus[]
    expect(statuses).toHaveLength(7)
    expect(statuses).toContain("draft")
    expect(statuses).toContain("offered")
    expect(statuses).toContain("accepted")
    expect(statuses).toContain("declined")
    expect(statuses).toContain("confirmed")
    expect(statuses).toContain("released")
    expect(statuses).toContain("cancelled")
  })

  it("cancelled is terminal — no forward transitions", () => {
    expect(TOUR_PARTY_STATUS_TRANSITIONS["cancelled"]).toHaveLength(0)
  })

  it("draft → offered → accepted → confirmed succeeds", () => {
    let m = makeMember({ status: "draft" })
    m = transitionTourPartyMember(m, "offered", ACTOR, NOW).member!
    expect(m.status).toBe("offered")
    m = transitionTourPartyMember(m, "accepted", ACTOR, NOW).member!
    expect(m.status).toBe("accepted")
    const r = transitionTourPartyMember(m, "confirmed", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.member.status).toBe("confirmed")
  })

  it("draft → confirmed directly (manager bypass) succeeds", () => {
    const m = makeMember({ status: "draft" })
    const r = transitionTourPartyMember(m, "confirmed", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.member.status).toBe("confirmed")
  })

  it("offered → declined, then re-offer is allowed", () => {
    let m = makeMember({ status: "offered" })
    m = transitionTourPartyMember(m, "declined", ACTOR, NOW).member
    expect(m.status).toBe("declined")
    const r = transitionTourPartyMember(m, "offered", ACTOR, NOW)
    expect(r.ok).toBe(true)
    expect(r.member.status).toBe("offered")
  })

  it("confirmed → released → confirmed (reinstate) is allowed", () => {
    let m = makeMember({ status: "confirmed" })
    m = transitionTourPartyMember(m, "released", ACTOR, NOW).member
    expect(m.status).toBe("released")
    const r = transitionTourPartyMember(m, "confirmed", ACTOR, NOW)
    expect(r.ok).toBe(true)
  })

  it("invalid transition returns ok=false with error message", () => {
    const m = makeMember({ status: "confirmed" })
    const r = transitionTourPartyMember(m, "offered", ACTOR, NOW)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/confirmed.*offered/i)
  })

  it("cancelled → anything returns ok=false", () => {
    const m = makeMember({ status: "cancelled" })
    const r = transitionTourPartyMember(m, "draft", ACTOR, NOW)
    expect(r.ok).toBe(false)
  })

  it("transition stamps updated_by and updated_at", () => {
    const m = makeMember({ status: "draft" })
    const r = transitionTourPartyMember(m, "offered", "new-actor", "2026-09-02T00:00:00.000Z")
    expect(r.member.updated_by).toBe("new-actor")
    expect(r.member.updated_at).toBe("2026-09-02T00:00:00.000Z")
  })

  it("does not mutate the original member", () => {
    const m = makeMember({ status: "draft" })
    transitionTourPartyMember(m, "offered", ACTOR, NOW)
    expect(m.status).toBe("draft")
  })
})

// ---------------------------------------------------------------------------
// Field classes
// ---------------------------------------------------------------------------

describe("WORK-401 — field classes", () => {
  it("role_title, join_date, status are operational", () => {
    expect(TOUR_PARTY_FIELD_CLASSES["role_title"]).toBe("operational")
    expect(TOUR_PARTY_FIELD_CLASSES["join_date"]).toBe("operational")
    expect(TOUR_PARTY_FIELD_CLASSES["status"]).toBe("operational")
  })

  it("home_base, emergency_contact_name are personnel_sensitive", () => {
    expect(TOUR_PARTY_FIELD_CLASSES["home_base"]).toBe("personnel_sensitive")
    expect(TOUR_PARTY_FIELD_CLASSES["emergency_contact_name"]).toBe("personnel_sensitive")
    expect(TOUR_PARTY_FIELD_CLASSES["dietary_notes"]).toBe("personnel_sensitive")
  })

  it("rate_per_day and currency are financial", () => {
    expect(TOUR_PARTY_FIELD_CLASSES["rate_per_day"]).toBe("financial")
    expect(TOUR_PARTY_FIELD_CLASSES["currency"]).toBe("financial")
  })

  it("date_of_birth and government_id_ref are sensitive_personal", () => {
    expect(TOUR_PARTY_FIELD_CLASSES["date_of_birth"]).toBe("sensitive_personal")
    expect(TOUR_PARTY_FIELD_CLASSES["government_id_ref"]).toBe("sensitive_personal")
  })

  it("work_mode_identity_id is operational", () => {
    expect(TOUR_PARTY_FIELD_CLASSES["work_mode_identity_id"]).toBe("operational")
  })
})

// ---------------------------------------------------------------------------
// Date scoping
// ---------------------------------------------------------------------------

describe("WORK-401 — date scoping", () => {
  it("member with null leave_date is active on any date >= join_date", () => {
    const m = makeMember({ join_date: "2026-09-01", leave_date: null, status: "confirmed" })
    expect(memberIsActiveOnDate(m, "2026-09-01")).toBe(true)
    expect(memberIsActiveOnDate(m, "2026-12-31")).toBe(true)
  })

  it("member is not active before join_date", () => {
    const m = makeMember({ join_date: "2026-09-10", leave_date: null, status: "confirmed" })
    expect(memberIsActiveOnDate(m, "2026-09-09")).toBe(false)
  })

  it("member is not active after leave_date", () => {
    const m = makeMember({ join_date: "2026-09-01", leave_date: "2026-09-15", status: "confirmed" })
    expect(memberIsActiveOnDate(m, "2026-09-15")).toBe(true)
    expect(memberIsActiveOnDate(m, "2026-09-16")).toBe(false)
  })

  it("cancelled member is never active", () => {
    const m = makeMember({ join_date: "2026-09-01", leave_date: null, status: "cancelled" })
    expect(memberIsActiveOnDate(m, "2026-09-05")).toBe(false)
  })

  it("declined member is never active", () => {
    const m = makeMember({ join_date: "2026-09-01", leave_date: null, status: "declined" })
    expect(memberIsActiveOnDate(m, "2026-09-05")).toBe(false)
  })

  it("membersActiveOnDate filters correctly", () => {
    const members = [
      makeMember({ member_id: "m1", join_date: "2026-09-01", leave_date: "2026-09-10", status: "confirmed" }),
      makeMember({ member_id: "m2", join_date: "2026-09-11", leave_date: null, status: "confirmed" }),
      makeMember({ member_id: "m3", join_date: "2026-09-01", leave_date: null, status: "cancelled" }),
    ]
    const active = membersActiveOnDate(members, "2026-09-05")
    expect(active.map((m) => m.member_id)).toEqual(["m1"])
  })

  it("membersActiveInRange returns members whose window overlaps the range", () => {
    const members = [
      makeMember({ member_id: "m1", join_date: "2026-09-01", leave_date: "2026-09-10", status: "confirmed" }),
      makeMember({ member_id: "m2", join_date: "2026-09-08", leave_date: "2026-09-20", status: "confirmed" }),
      makeMember({ member_id: "m3", join_date: "2026-09-25", leave_date: null, status: "confirmed" }),
    ]
    // Range 2026-09-07 → 2026-09-12
    const active = membersActiveInRange(members, "2026-09-07", "2026-09-12")
    const ids = active.map((m) => m.member_id)
    expect(ids).toContain("m1")  // ends 09-10, overlaps
    expect(ids).toContain("m2")  // starts 09-08, overlaps
    expect(ids).not.toContain("m3")  // starts 09-25, no overlap
  })
})

// ---------------------------------------------------------------------------
// Field projection
// ---------------------------------------------------------------------------

describe("WORK-401 — field projection", () => {
  it("operational projection hides personal fields", () => {
    const m = makeMember()
    const projected = projectTourPartyMember(m, "operational")
    expect(projected.traveler.home_base).toBeNull()
    expect(projected.traveler.emergency_contact_name).toBeNull()
    expect(projected.traveler.dietary_notes).toBeNull()
    expect(projected.financial.rate_per_day).toBeNull()
    expect(projected.financial.currency).toBeNull()
  })

  it("operational projection preserves is_traveling", () => {
    const m = makeMember()
    const projected = projectTourPartyMember(m, "operational")
    expect(projected.traveler.is_traveling).toBe(true)
  })

  it("full_workforce projection reveals personnel_sensitive fields", () => {
    const m = makeMember()
    const projected = projectTourPartyMember(m, "full_workforce")
    expect(projected.traveler.home_base).toBe("New York, NY")
    expect(projected.traveler.emergency_contact_name).toBe("Jane Doe")
    expect(projected.traveler.dietary_notes).toBe("Vegan")
    // still hides financial
    expect(projected.financial.rate_per_day).toBeNull()
  })

  it("financial projection reveals financial fields", () => {
    const m = makeMember()
    const projected = projectTourPartyMember(m, "financial")
    expect(projected.financial.rate_per_day).toBe(800)
    expect(projected.financial.currency).toBe("USD")
    expect(projected.traveler.home_base).toBe("New York, NY")
  })

  it("does not mutate original member", () => {
    const m = makeMember()
    projectTourPartyMember(m, "operational")
    expect(m.traveler.home_base).toBe("New York, NY")
    expect(m.financial.rate_per_day).toBe(800)
  })

  it("operational projection still exposes role_title and work_mode_identity_id", () => {
    const m = makeMember()
    const projected = projectTourPartyMember(m, "operational")
    expect(projected.role_title).toBe("Tour Manager")
    expect(projected.work_mode_identity_id).toBe("wm-1")
  })
})

// ---------------------------------------------------------------------------
// Work Mode link
// ---------------------------------------------------------------------------

describe("WORK-401 — Work Mode link / publication readiness", () => {
  it("confirmed member with work_mode_identity_id is publication-ready", () => {
    const m = makeMember({ status: "confirmed", work_mode_identity_id: "wm-1" })
    expect(memberIsPublicationReady(m)).toBe(true)
  })

  it("cancelled member is not publication-ready", () => {
    const m = makeMember({ status: "cancelled" })
    expect(memberIsPublicationReady(m)).toBe(false)
  })

  it("declined member is not publication-ready", () => {
    const m = makeMember({ status: "declined" })
    expect(memberIsPublicationReady(m)).toBe(false)
  })

  it("confirmed member without work_mode_identity_id is not publication-ready", () => {
    const m = makeMember({ status: "confirmed", work_mode_identity_id: null })
    expect(memberIsPublicationReady(m)).toBe(false)
  })

  it("offered member with work_mode_identity_id is publication-ready", () => {
    // Offered but not yet confirmed — still targetable by Work Mode
    const m = makeMember({ status: "offered", work_mode_identity_id: "wm-2" })
    expect(memberIsPublicationReady(m)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Party summary
// ---------------------------------------------------------------------------

describe("WORK-401 — tour party summary", () => {
  const members: TourPartyMember[] = [
    makeMember({ member_id: "m1", status: "confirmed",  work_mode_identity_id: "wm-1", traveler: { is_traveling: true, home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
    makeMember({ member_id: "m2", status: "confirmed",  work_mode_identity_id: "wm-2", traveler: { is_traveling: false, home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
    makeMember({ member_id: "m3", status: "offered",    work_mode_identity_id: "wm-3", traveler: { is_traveling: true,  home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
    makeMember({ member_id: "m4", status: "declined",   work_mode_identity_id: null,   traveler: { is_traveling: false, home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
    makeMember({ member_id: "m5", status: "cancelled",  work_mode_identity_id: null,   traveler: { is_traveling: true,  home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
    makeMember({ member_id: "m6", status: "accepted",   work_mode_identity_id: "wm-6", traveler: { is_traveling: true,  home_base: null, emergency_contact_name: null, emergency_contact_phone: null, accessibility_notes: null, dietary_notes: null } }),
  ]

  const summary = summariseTourParty(TOUR, members)

  it("total is count of all members", () => {
    expect(summary.total).toBe(6)
  })

  it("confirmed count matches", () => {
    expect(summary.confirmed).toBe(2)
    expect(summary.by_status.confirmed).toBe(2)
  })

  it("traveling counts non-cancelled/declined is_traveling members", () => {
    // m1 (confirmed, traveling), m3 (offered, traveling), m6 (accepted, traveling)
    // m5 (cancelled, traveling) — excluded
    expect(summary.traveling).toBe(3)
  })

  it("publication_ready counts members with work_mode_identity_id and valid status", () => {
    // m1, m2 (confirmed), m3 (offered), m6 (accepted) — all have wm id and non-cancelled
    expect(summary.publication_ready).toBe(4)
  })

  it("open_offers counts offered + accepted", () => {
    // m3 (offered), m6 (accepted)
    expect(summary.open_offers).toBe(2)
  })

  it("by_status correctly tallies each status", () => {
    expect(summary.by_status.offered).toBe(1)
    expect(summary.by_status.declined).toBe(1)
    expect(summary.by_status.cancelled).toBe(1)
    expect(summary.by_status.draft).toBe(0)
  })
})
