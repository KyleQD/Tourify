import { describe, expect, it } from "vitest"
import {
  buildTourDeletePreview,
  TourDeleteEligibilityError,
} from "@/lib/admin/tour-delete-eligibility"

const emptyCounts = {
  linkedEvents: 0,
  publishedOrActiveEvents: 0,
  ticketedEvents: 0,
  contracts: 0,
  paidTransactions: 0,
  settlements: 0,
  teamMembers: 0,
  vendors: 0,
  activeGrants: 0,
  logisticsTasks: 0,
  documents: 0,
  openDuplicateJobs: 0,
  openJobPostings: 0,
}

describe("TOUR-208 safe draft deletion eligibility", () => {
  it("allows hard delete for an unreferenced draft", () => {
    const preview = buildTourDeletePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "draft",
      settings: {},
      counts: { ...emptyCounts, linkedEvents: 2 },
    })
    expect(preview.canDelete).toBe(true)
    expect(preview.blockers).toEqual([])
    expect(preview.willDetachEventLinks).toBe(2)
  })

  it("blocks published, ticketed, contracted, paid, staffed, and referenced tours", () => {
    const preview = buildTourDeletePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "draft",
      settings: {},
      counts: {
        ...emptyCounts,
        publishedOrActiveEvents: 1,
        ticketedEvents: 1,
        contracts: 1,
        paidTransactions: 2,
        teamMembers: 3,
        vendors: 1,
        activeGrants: 1,
        logisticsTasks: 1,
        documents: 1,
        openDuplicateJobs: 1,
        openJobPostings: 1,
      },
    })
    expect(preview.canDelete).toBe(false)
    const ids = preview.blockers.map((row) => row.id)
    expect(ids).toContain("published_events")
    expect(ids).toContain("ticketed")
    expect(ids).toContain("contracted")
    expect(ids).toContain("paid")
    expect(ids).toContain("staffed")
    expect(ids).toContain("referenced_vendors")
    expect(ids).toContain("referenced_grants")
  })

  it("blocks non-draft state and legal hold", () => {
    const active = buildTourDeletePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "active",
      settings: {},
      counts: emptyCounts,
    })
    expect(active.canDelete).toBe(false)
    expect(active.blockers.some((row) => row.id === "state_ineligible")).toBe(true)

    const retained = buildTourDeletePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "draft",
      settings: { legal_hold: true },
      counts: emptyCounts,
    })
    expect(retained.canDelete).toBe(false)
    expect(retained.blockers.some((row) => row.id === "legal_hold")).toBe(true)
  })

  it("exposes typed eligibility error with blockers", () => {
    const error = new TourDeleteEligibilityError("blocked", [
      { id: "staffed", label: "Staffed team", detail: "clear team first", count: 2 },
    ])
    expect(error.status).toBe(409)
    expect(error.code).toBe("tour_delete_ineligible")
    expect(error.blockers).toHaveLength(1)
  })
})
