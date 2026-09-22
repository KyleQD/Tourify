import { describe, it, expect } from "vitest"
import {
  createEventCloseout,
  updateSection,
  signOffSection,
  flagSection,
  transitionCloseout,
  computeCloseoutCompleteness,
  recordFinanceHandoff,
  CLOSEOUT_SECTIONS,
  type EventCloseout,
} from "@/lib/admin/event-closeout"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCloseout(): EventCloseout {
  return createEventCloseout({
    closeout_id: "co-1",
    org_id: "org-1",
    event_id: "event-1",
    actor_id: "user-1",
    now: "2025-08-02T23:00:00Z",
  })
}

function signOffAll(closeout: EventCloseout): EventCloseout {
  let c = closeout
  for (const section of CLOSEOUT_SECTIONS) {
    c = updateSection(c, section, { status: "reviewed" }, "u", "T")
    const r = signOffSection(c, section, "u", "T")
    if (!r.ok || !r.closeout) throw new Error(`signOff failed for ${section}: ${r.error}`)
    c = r.closeout
  }
  return c
}

// ---------------------------------------------------------------------------
// createEventCloseout
// ---------------------------------------------------------------------------

describe("createEventCloseout", () => {
  it("creates with draft status and all sections open", () => {
    const c = makeCloseout()
    expect(c.status).toBe("draft")
    for (const section of CLOSEOUT_SECTIONS) {
      expect((c[section] as never as { status: string }).status).toBe("open")
    }
  })

  it("has 8 sections", () => {
    expect(CLOSEOUT_SECTIONS).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// updateSection
// ---------------------------------------------------------------------------

describe("updateSection", () => {
  it("updates incident section items", () => {
    const c = makeCloseout()
    const updated = updateSection(
      c,
      "incidents",
      {
        items: [{ incident_id: "inc-1", severity: "high", status: "resolved", is_resolved: true, follow_up_required: false }],
        status: "reviewed",
      },
      "u",
      "T",
    )
    expect(updated.incidents.items).toHaveLength(1)
    expect(updated.incidents.status).toBe("reviewed")
  })
})

// ---------------------------------------------------------------------------
// signOffSection
// ---------------------------------------------------------------------------

describe("signOffSection", () => {
  it("signs off a reviewed section", () => {
    const c = makeCloseout()
    const reviewed = updateSection(c, "equipment", { status: "reviewed" }, "u", "T")
    const r = signOffSection(reviewed, "equipment", "user-pm", "T")
    expect(r.ok).toBe(true)
    expect(r.closeout?.equipment.status).toBe("signed_off")
    expect(r.closeout?.equipment.reviewed_by).toBe("user-pm")
  })

  it("cannot sign off a flagged section", () => {
    const c = makeCloseout()
    const flagged = flagSection(c, "staff_exceptions", "Needs HR review", "u", "T")
    const r = signOffSection(flagged, "staff_exceptions", "u", "T")
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/flagged/)
  })

  it("can sign off an open section (no prior review required)", () => {
    const c = makeCloseout()
    const r = signOffSection(c, "attendance", "u", "T")
    expect(r.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// flagSection
// ---------------------------------------------------------------------------

describe("flagSection", () => {
  it("flags a section with notes", () => {
    const c = makeCloseout()
    const flagged = flagSection(c, "vendor_issues", "Vendor A did not deliver", "u", "T")
    expect(flagged.vendor_issues.status).toBe("flagged")
    expect(flagged.vendor_issues.notes).toBe("Vendor A did not deliver")
  })
})

// ---------------------------------------------------------------------------
// transitionCloseout
// ---------------------------------------------------------------------------

describe("transitionCloseout", () => {
  it("transitions draft → in_review", () => {
    const c = makeCloseout()
    const r = transitionCloseout(c, "in_review", "u", "T")
    expect(r.ok).toBe(true)
    expect(r.closeout?.status).toBe("in_review")
  })

  it("blocks complete if any section not signed_off", () => {
    const c = makeCloseout()
    const reviewed = transitionCloseout(c, "in_review", "u", "T").closeout!
    const r = transitionCloseout(reviewed, "complete", "u", "T")
    expect(r.ok).toBe(false)
    expect(r.blockers).toBeDefined()
    expect(r.blockers!.length).toBe(CLOSEOUT_SECTIONS.length)
  })

  it("completes when all sections signed off", () => {
    const c = makeCloseout()
    const inReview = transitionCloseout(c, "in_review", "u", "T").closeout!
    const allSigned = signOffAll(inReview)
    const r = transitionCloseout(allSigned, "complete", "u", "T")
    expect(r.ok).toBe(true)
    expect(r.closeout?.status).toBe("complete")
  })

  it("rejects invalid transitions (complete → draft)", () => {
    const c = makeCloseout()
    const inReview = transitionCloseout(c, "in_review", "u", "T").closeout!
    const allSigned = signOffAll(inReview)
    const completed = transitionCloseout(allSigned, "complete", "u", "T").closeout!
    const r = transitionCloseout(completed, "draft", "u", "T")
    expect(r.ok).toBe(false)
  })

  it("allows in_review → draft (back to draft)", () => {
    const c = makeCloseout()
    const inReview = transitionCloseout(c, "in_review", "u", "T").closeout!
    const r = transitionCloseout(inReview, "draft", "u", "T")
    expect(r.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// computeCloseoutCompleteness
// ---------------------------------------------------------------------------

describe("computeCloseoutCompleteness", () => {
  it("reports all open initially", () => {
    const c = makeCloseout()
    const rep = computeCloseoutCompleteness(c)
    expect(rep.open_count).toBe(CLOSEOUT_SECTIONS.length)
    expect(rep.signed_off_count).toBe(0)
    expect(rep.can_complete).toBe(false)
  })

  it("can_complete true when all signed off", () => {
    const c = signOffAll(makeCloseout())
    const rep = computeCloseoutCompleteness(c)
    expect(rep.signed_off_count).toBe(CLOSEOUT_SECTIONS.length)
    expect(rep.can_complete).toBe(true)
  })

  it("tracks flagged count", () => {
    const c = flagSection(makeCloseout(), "incidents", "open incidents", "u", "T")
    const rep = computeCloseoutCompleteness(c)
    expect(rep.flagged_count).toBe(1)
    expect(rep.can_complete).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// recordFinanceHandoff
// ---------------------------------------------------------------------------

describe("recordFinanceHandoff", () => {
  it("adds handoff record and sets section to reviewed", () => {
    const c = makeCloseout()
    const updated = recordFinanceHandoff(c, {
      handed_off_by: "user-finance",
      handed_off_at: "2025-08-03T09:00:00Z",
      settlement_reference: "SETTLE-2025-001",
      notes: null,
    })
    expect(updated.finance_handoff.items).toHaveLength(1)
    expect(updated.finance_handoff.status).toBe("reviewed")
    expect(updated.finance_handoff.items[0].settlement_reference).toBe("SETTLE-2025-001")
  })
})
