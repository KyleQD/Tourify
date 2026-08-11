import { describe, expect, it } from "vitest"
import {
  TOUR_COMMAND_CENTER_TAB_CONTRACTS,
  getTourCommandCenterTabContract,
  isTourCommandCenterTabAllowed,
  listDeferredTourCommandCenterBundles,
  parseTourCommandCenterTabId,
  resolveActiveTourCommandCenterTab,
  shouldLoadTourWorkflowFanout,
} from "@/lib/admin/tour-command-center-tabs"
import type { TourCommandCenterDomainAccess } from "@/lib/admin/tour-command-center-summary"

const fullAccess: TourCommandCenterDomainAccess = {
  overview: true,
  shows: true,
  people: true,
  logistics: true,
  finance: true,
  vendors: true,
  ticketing: true,
  publications: true,
  transitions: true,
}

describe("TOUR-204 command-center tab contracts", () => {
  it("defines a stable contract for every tab id", () => {
    const ids = TOUR_COMMAND_CENTER_TAB_CONTRACTS.map((tab) => tab.id)
    expect(ids).toEqual([
      "overview",
      "events",
      "team",
      "vendors",
      "jobs",
      "ticketing",
      "finances",
      "logistics",
      "calendar-sync",
    ])
    for (const tab of TOUR_COMMAND_CENTER_TAB_CONTRACTS) {
      expect(tab.bundles.length).toBeGreaterThan(0)
      expect(tab.domainKey).toBeTruthy()
    }
  })

  it("defers editor bundles away from overview", () => {
    const deferred = listDeferredTourCommandCenterBundles()
    expect(deferred).toContain("tour-event-manager")
    expect(deferred).toContain("tour-finance-manager")
    expect(deferred).toContain("grant-tour-admins")
    expect(deferred).not.toContain("overview-inline")
  })

  it("gates tabs by domainAccess and falls back safely", () => {
    const viewer: TourCommandCenterDomainAccess = {
      ...fullAccess,
      finance: false,
      logistics: false,
      vendors: false,
      people: false,
      ticketing: false,
    }
    expect(isTourCommandCenterTabAllowed({ tabId: "finances", domainAccess: viewer })).toBe(false)
    expect(isTourCommandCenterTabAllowed({ tabId: "events", domainAccess: viewer })).toBe(true)
    expect(
      resolveActiveTourCommandCenterTab({ requested: "finances", domainAccess: viewer }),
    ).toBe("overview")
    expect(parseTourCommandCenterTabId("not-a-tab")).toBe("overview")
  })

  it("keeps finances on summary hydration without activate refetch endpoint", () => {
    const finances = getTourCommandCenterTabContract("finances")
    expect(finances.summaryHydration).toContain("financeTransactions")
    expect(finances.onActivateEndpoints).toEqual([])
  })

  it("loads workflow fanout only for overview or activity dialog", () => {
    expect(
      shouldLoadTourWorkflowFanout({ activeTab: "overview", workflowDialogOpen: false }),
    ).toBe(true)
    expect(
      shouldLoadTourWorkflowFanout({ activeTab: "events", workflowDialogOpen: false }),
    ).toBe(false)
    expect(
      shouldLoadTourWorkflowFanout({ activeTab: "events", workflowDialogOpen: true }),
    ).toBe(true)
  })
})
