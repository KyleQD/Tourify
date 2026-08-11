/**
 * TOUR-204 — Stable typed contracts for tour command-center tabs.
 *
 * Tabs load independently: overview uses the summary BFF only; editor bundles
 * and domain refetches mount when their tab becomes active.
 */

import type { LucideIcon } from "lucide-react"
import type { TourCommandCenterDomainAccess } from "@/lib/admin/tour-command-center-summary"

export type TourCommandCenterTabId =
  | "overview"
  | "events"
  | "team"
  | "vendors"
  | "jobs"
  | "ticketing"
  | "finances"
  | "logistics"
  | "calendar-sync"

export type TourCommandCenterDomainKey = keyof TourCommandCenterDomainAccess

export type TourCommandCenterBundleId =
  | "overview-inline"
  | "tour-event-manager"
  | "tour-team-manager"
  | "grant-tour-admins"
  | "tour-vendor-manager"
  | "tour-jobs-list"
  | "tour-job-posting"
  | "ticketing-inline"
  | "tour-finance-manager"
  | "logistics-dynamic-manager"
  | "tour-calendar-sync"

export interface TourCommandCenterTabContract {
  id: TourCommandCenterTabId
  label: string
  /** Domain-access key from TOUR-203 summary. */
  domainKey: TourCommandCenterDomainKey
  /** Code-split bundles loaded only when this tab is active. */
  bundles: readonly TourCommandCenterBundleId[]
  /**
   * Data already hydrated by GET .../summary for this tab.
   * Panels must not re-fetch these on first mount when seed is present.
   */
  summaryHydration: readonly string[]
  /**
   * Endpoints allowed on first activation (not on overview open).
   * Empty means summary/inline state only.
   */
  onActivateEndpoints: readonly string[]
  /** When true, workflow fanout may run while this tab is active. */
  allowsWorkflowFanout: boolean
}

export const TOUR_COMMAND_CENTER_TAB_CONTRACTS: readonly TourCommandCenterTabContract[] = [
  {
    id: "overview",
    label: "Overview",
    domainKey: "overview",
    bundles: ["overview-inline"],
    summaryHydration: ["tour", "events", "counts", "risks", "freshness", "domainAccess"],
    onActivateEndpoints: [],
    allowsWorkflowFanout: true,
  },
  {
    id: "events",
    label: "Shows",
    domainKey: "shows",
    bundles: ["tour-event-manager"],
    summaryHydration: ["events"],
    onActivateEndpoints: [],
    allowsWorkflowFanout: false,
  },
  {
    id: "team",
    label: "People",
    domainKey: "people",
    bundles: ["grant-tour-admins", "tour-team-manager"],
    summaryHydration: ["teamMembers"],
    onActivateEndpoints: ["GET /api/admin/tours/teams"],
    allowsWorkflowFanout: false,
  },
  {
    id: "vendors",
    label: "Vendors",
    domainKey: "vendors",
    bundles: ["tour-vendor-manager"],
    summaryHydration: ["vendors"],
    onActivateEndpoints: [],
    allowsWorkflowFanout: false,
  },
  {
    id: "jobs",
    label: "Jobs",
    domainKey: "people",
    bundles: ["tour-job-posting", "tour-jobs-list"],
    summaryHydration: [],
    onActivateEndpoints: ["GET /api/tours/:id/jobs"],
    allowsWorkflowFanout: false,
  },
  {
    id: "ticketing",
    label: "Ticketing",
    domainKey: "ticketing",
    bundles: ["ticketing-inline"],
    summaryHydration: ["events"],
    onActivateEndpoints: [],
    allowsWorkflowFanout: false,
  },
  {
    id: "finances",
    label: "Finances",
    domainKey: "finance",
    bundles: ["tour-finance-manager"],
    summaryHydration: ["financeTransactions"],
    onActivateEndpoints: [],
    allowsWorkflowFanout: false,
  },
  {
    id: "logistics",
    label: "Logistics",
    domainKey: "logistics",
    bundles: ["logistics-dynamic-manager"],
    summaryHydration: ["counts.logisticsTasks"],
    onActivateEndpoints: ["GET /api/admin/logistics/items"],
    allowsWorkflowFanout: false,
  },
  {
    id: "calendar-sync",
    label: "Calendar",
    domainKey: "overview",
    bundles: ["tour-calendar-sync"],
    summaryHydration: ["tour.calendar_token"],
    onActivateEndpoints: ["GET /api/admin/tours/:id (calendar_token only when not seeded)"],
    allowsWorkflowFanout: false,
  },
] as const

const TAB_IDS = new Set<string>(TOUR_COMMAND_CENTER_TAB_CONTRACTS.map((tab) => tab.id))

export function isTourCommandCenterTabId(value: string | null | undefined): value is TourCommandCenterTabId {
  return Boolean(value && TAB_IDS.has(value))
}

export function parseTourCommandCenterTabId(
  value: string | null | undefined,
  fallback: TourCommandCenterTabId = "overview",
): TourCommandCenterTabId {
  if (isTourCommandCenterTabId(value)) return value
  return fallback
}

export function getTourCommandCenterTabContract(
  tabId: TourCommandCenterTabId,
): TourCommandCenterTabContract {
  const found = TOUR_COMMAND_CENTER_TAB_CONTRACTS.find((tab) => tab.id === tabId)
  if (!found) throw new Error(`Unknown tour command-center tab: ${tabId}`)
  return found
}

export function isTourCommandCenterTabAllowed(args: {
  tabId: TourCommandCenterTabId
  domainAccess: TourCommandCenterDomainAccess | null | undefined
}): boolean {
  if (!args.domainAccess) return true
  const contract = getTourCommandCenterTabContract(args.tabId)
  return Boolean(args.domainAccess[contract.domainKey])
}

export function resolveTourCommandCenterVisibleTabs(args: {
  domainAccess: TourCommandCenterDomainAccess | null | undefined
  icons: Record<TourCommandCenterTabId, LucideIcon>
}): Array<{ value: TourCommandCenterTabId; label: string; icon: LucideIcon }> {
  return TOUR_COMMAND_CENTER_TAB_CONTRACTS
    .filter((tab) => isTourCommandCenterTabAllowed({ tabId: tab.id, domainAccess: args.domainAccess }))
    .map((tab) => ({
      value: tab.id,
      label: tab.label,
      icon: args.icons[tab.id],
    }))
}

export function resolveActiveTourCommandCenterTab(args: {
  requested: string | null | undefined
  domainAccess: TourCommandCenterDomainAccess | null | undefined
}): TourCommandCenterTabId {
  const requested = parseTourCommandCenterTabId(args.requested, "overview")
  if (isTourCommandCenterTabAllowed({ tabId: requested, domainAccess: args.domainAccess }))
    return requested
  if (isTourCommandCenterTabAllowed({ tabId: "overview", domainAccess: args.domainAccess }))
    return "overview"
  const firstAllowed = TOUR_COMMAND_CENTER_TAB_CONTRACTS.find((tab) =>
    isTourCommandCenterTabAllowed({ tabId: tab.id, domainAccess: args.domainAccess }),
  )
  return firstAllowed?.id ?? "overview"
}

/** Editor bundles that must not load while overview is active. */
export function listDeferredTourCommandCenterBundles(): TourCommandCenterBundleId[] {
  const deferred = new Set<TourCommandCenterBundleId>()
  for (const tab of TOUR_COMMAND_CENTER_TAB_CONTRACTS) {
    if (tab.id === "overview") continue
    for (const bundle of tab.bundles) {
      if (bundle === "overview-inline" || bundle === "ticketing-inline") continue
      deferred.add(bundle)
    }
  }
  return [...deferred]
}

export function shouldLoadTourWorkflowFanout(args: {
  activeTab: TourCommandCenterTabId
  workflowDialogOpen: boolean
}): boolean {
  if (args.workflowDialogOpen) return true
  return getTourCommandCenterTabContract(args.activeTab).allowsWorkflowFanout
}
