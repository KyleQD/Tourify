import { describe, expect, it } from "vitest"
import {
  buildTourArchivePreview,
} from "@/lib/admin/tour-archive-preview"
import { resolveRestoreTargetState } from "@/lib/admin/tour-archive-side-effects"

const baseCounts = {
  activeGrants: 2,
  publicationShareTokens: 1,
  hasCalendarToken: true,
  hasShareToken: false,
  openDuplicateJobs: 1,
  openJobPostings: 0,
  upcomingEvents: 3,
  openLogisticsTasks: 2,
  financeTransactions: 8,
  settlements: 1,
  contracts: 1,
}

describe("TOUR-207 archive/restore impact", () => {
  it("lists shares, jobs, upcoming work, and preserved finance/legal records", () => {
    const preview = buildTourArchivePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "settled",
      settings: {},
      counts: baseCounts,
    })

    expect(preview.canArchive).toBe(true)
    expect(preview.shares.some((row) => row.id === "entity_grants" && row.willRevoke)).toBe(true)
    expect(preview.shares.some((row) => row.id === "calendar_token")).toBe(true)
    expect(preview.jobs.some((row) => row.id === "duplicate_jobs")).toBe(true)
    expect(preview.upcomingWork.some((row) => row.id === "upcoming_events")).toBe(true)
    expect(preview.preserved.every((row) => row.willPreserve)).toBe(true)
    expect(preview.preserved.some((row) => row.id === "finance_transactions")).toBe(true)
    expect(preview.requiresConfirmation).toBe(true)
  })

  it("blocks archive under legal hold or ineligible state", () => {
    const retained = buildTourArchivePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "completed",
      settings: { legal_hold: true },
      counts: baseCounts,
    })
    expect(retained.canArchive).toBe(false)
    expect(retained.blockers.some((row) => row.id === "legal_hold")).toBe(true)

    const active = buildTourArchivePreview({
      tourId: "tour-1",
      orgId: "org-1",
      status: "active",
      settings: {},
      counts: baseCounts,
    })
    expect(active.canArchive).toBe(false)
    expect(active.blockers.some((row) => row.id === "state_ineligible")).toBe(true)
  })

  it("restores to pre_archive_state when settled/completed/cancelled", () => {
    expect(
      resolveRestoreTargetState({ lifecycle: { pre_archive_state: "settled" } }),
    ).toBe("settled")
    expect(
      resolveRestoreTargetState({ lifecycle: { pre_archive_state: "active" } }),
    ).toBe("completed")
    expect(resolveRestoreTargetState({})).toBe("completed")
  })
})
