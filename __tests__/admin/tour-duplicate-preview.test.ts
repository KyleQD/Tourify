import { describe, expect, it } from "vitest"
import {
  DEFAULT_TOUR_DUPLICATE_SELECTION,
  buildTourDuplicatePreview,
  normalizeTourDuplicateSelection,
} from "@/lib/admin/tour-duplicate-preview"

const inventory = {
  events: 4,
  teamRoles: 3,
  vendors: 2,
  templates: 0,
  budgetLines: 5,
  documents: 1,
  logisticsTasks: 6,
  permissionGrants: 2,
  protectedEventCount: 1,
  paidTransactionCount: 2,
  hasCalendarToken: true,
  hasShareTokens: false,
}

describe("TOUR-205 deep-duplicate preview", () => {
  it("keeps metadata required and normalizes selection", () => {
    const selection = normalizeTourDuplicateSelection({
      metadata: false,
      events: false,
      budgets: true,
    })
    expect(selection.metadata).toBe(true)
    expect(selection.events).toBe(false)
    expect(selection.budgets).toBe(true)
    expect(selection.team_roles).toBe(DEFAULT_TOUR_DUPLICATE_SELECTION.team_roles)
  })

  it("lists copies, links, exclusions, and conflicts from a selectable plan", () => {
    const preview = buildTourDuplicatePreview({
      sourceTourId: "tour-1",
      orgId: "org-1",
      sourceName: "Summer Run",
      selection: {
        ...DEFAULT_TOUR_DUPLICATE_SELECTION,
        budgets: true,
        permissions: true,
        documents: true,
      },
      inventory,
    })

    expect(preview.proposedName).toBe("Summer Run (Copy)")
    expect(preview.copies.some((row) => row.domain === "metadata")).toBe(true)
    expect(preview.copies.some((row) => row.domain === "events")).toBe(true)
    expect(preview.links.some((row) => row.domain === "vendors")).toBe(true)
    expect(preview.exclusions.some((row) => row.label.includes("token"))).toBe(true)
    expect(preview.conflicts.some((row) => row.domain === "events")).toBe(true)
    expect(preview.conflicts.some((row) => row.domain === "budgets")).toBe(true)
    expect(preview.planToken.length).toBeGreaterThan(10)
    expect(preview.requiresConfirmation).toBe(true)
  })

  it("excludes unselected domains instead of copying them", () => {
    const preview = buildTourDuplicatePreview({
      sourceTourId: "tour-1",
      orgId: "org-1",
      sourceName: "Summer Run",
      selection: {
        metadata: true,
        events: false,
        team_roles: false,
        vendors: false,
        templates: false,
        budgets: false,
        documents: false,
        logistics_skeletons: false,
        permissions: false,
      },
      inventory,
    })

    expect(preview.copies.every((row) => row.domain === "metadata")).toBe(true)
    expect(preview.exclusions.some((row) => row.domain === "events")).toBe(true)
    expect(preview.exclusions.some((row) => row.domain === "vendors")).toBe(true)
  })
})
