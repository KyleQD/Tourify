import { describe, expect, it } from "vitest"
import {
  DEFAULT_TOUR_DUPLICATE_SELECTION,
  decodeTourDuplicatePlanToken,
  encodeTourDuplicatePlanToken,
} from "@/lib/admin/tour-duplicate-preview"
import {
  initialDomainStatus,
  isProtectedEventForDuplicate,
  nextPendingDomain,
  summarizeDomainStatus,
} from "@/lib/admin/tour-duplicate-job"

describe("TOUR-206 idempotent duplication job helpers", () => {
  it("orders domains and skips unselected ones", () => {
    const status = initialDomainStatus({
      ...DEFAULT_TOUR_DUPLICATE_SELECTION,
      budgets: false,
      permissions: false,
      templates: false,
      documents: false,
    })
    expect(status.metadata?.status).toBe("pending")
    expect(status.events?.status).toBe("pending")
    expect(status.budgets?.status).toBe("skipped")
    expect(nextPendingDomain(status)).toBe("metadata")

    status.metadata = { status: "completed", copied: 1, failed: 0, excluded: 0 }
    expect(nextPendingDomain(status)).toBe("events")
  })

  it("continues past failed domains and reports partial failure", () => {
    const status = initialDomainStatus(DEFAULT_TOUR_DUPLICATE_SELECTION)
    status.metadata = { status: "completed", copied: 1, failed: 0, excluded: 0 }
    status.events = {
      status: "failed",
      copied: 0,
      failed: 2,
      excluded: 0,
      error: "boom",
    }
    expect(nextPendingDomain(status)).toBe("team_roles")

    for (const domain of Object.keys(status) as Array<keyof typeof status>) {
      if (status[domain]?.status === "pending")
        status[domain] = { status: "completed", copied: 1, failed: 0, excluded: 0 }
    }
    const summary = summarizeDomainStatus(status)
    expect(summary.allTerminal).toBe(true)
    expect(summary.hasFailure).toBe(true)
  })

  it("protects ticketed/published events from deep copy", () => {
    expect(isProtectedEventForDuplicate({ status: "draft", tickets_sold: 0 })).toBe(false)
    expect(isProtectedEventForDuplicate({ status: "published", tickets_sold: 0 })).toBe(true)
    expect(isProtectedEventForDuplicate({ status: "draft", tickets_sold: 12 })).toBe(true)
  })

  it("round-trips plan tokens for execute", () => {
    const token = encodeTourDuplicatePlanToken({
      v: 1,
      sourceTourId: "tour-1",
      orgId: "org-1",
      selection: DEFAULT_TOUR_DUPLICATE_SELECTION,
      proposedName: "Summer (Copy)",
    })
    const decoded = decodeTourDuplicatePlanToken(token)
    expect(decoded.sourceTourId).toBe("tour-1")
    expect(decoded.orgId).toBe("org-1")
    expect(decoded.proposedName).toBe("Summer (Copy)")
    expect(decoded.selection.metadata).toBe(true)
  })
})
