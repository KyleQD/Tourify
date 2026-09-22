/**
 * PLAN-204 — Stop protection rules for published/ticketed/contracted/staffed/settled stops.
 */

export type TourStopProtectionBlockerId =
  | "published"
  | "ticketed"
  | "contracted"
  | "staffed"
  | "settled"
  | "legal_hold"

export interface TourStopProtectionBlocker {
  id: TourStopProtectionBlockerId
  label: string
  detail: string
  count?: number
  /** Authorized next action for operators. */
  nextAction: string
}

export interface TourStopProtectionCounts {
  publishedOrActive: boolean
  ticketsSold: number
  contracts: number
  staffAssignments: number
  settled: boolean
  legallyRetained: boolean
}

export interface TourStopImpactPreview {
  stopId: string
  eventId: string | null
  stopName: string
  protected: boolean
  blockers: TourStopProtectionBlocker[]
  requiresImpactWorkflow: boolean
  allowedWithoutWorkflow: boolean
}

export function buildTourStopImpactPreview(args: {
  stopId: string
  eventId?: string | null
  stopName: string
  counts: TourStopProtectionCounts
}): TourStopImpactPreview {
  const blockers: TourStopProtectionBlocker[] = []

  if (args.counts.publishedOrActive) {
    blockers.push({
      id: "published",
      label: "Published or active show",
      detail: "This stop is linked to a published/confirmed/active event.",
      nextAction: "Open impact workflow or retract the event before detach/reorder/date change.",
    })
  }
  if (args.counts.ticketsSold > 0) {
    blockers.push({
      id: "ticketed",
      label: "Tickets sold",
      detail: "Inventory has sold tickets against this stop's event.",
      count: args.counts.ticketsSold,
      nextAction: "Coordinate with ticketing before changing date/venue or detaching.",
    })
  }
  if (args.counts.contracts > 0) {
    blockers.push({
      id: "contracted",
      label: "Contracts",
      detail: "Active contracts reference this stop/event.",
      count: args.counts.contracts,
      nextAction: "Review contracts and obtain approval before destructive plan changes.",
    })
  }
  if (args.counts.staffAssignments > 0) {
    blockers.push({
      id: "staffed",
      label: "Staffed",
      detail: "Workforce assignments are linked to this stop.",
      count: args.counts.staffAssignments,
      nextAction: "Notify staffing owners and run impact workflow before detach.",
    })
  }
  if (args.counts.settled) {
    blockers.push({
      id: "settled",
      label: "Settled",
      detail: "Event/advance is settled; hard structural changes are blocked.",
      nextAction: "Use a change set with finance approval; do not detach settled stops.",
    })
  }
  if (args.counts.legallyRetained) {
    blockers.push({
      id: "legal_hold",
      label: "Legal hold",
      detail: "Tour or event is under legal retention.",
      nextAction: "Clear legal hold before destructive stop changes.",
    })
  }

  const protectedStop = blockers.length > 0
  return {
    stopId: args.stopId,
    eventId: args.eventId ?? null,
    stopName: args.stopName,
    protected: protectedStop,
    blockers,
    requiresImpactWorkflow: protectedStop,
    allowedWithoutWorkflow: !protectedStop,
  }
}
