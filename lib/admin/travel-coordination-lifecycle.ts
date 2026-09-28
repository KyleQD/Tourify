/**
 * TRAVEL-104 — Honest coordination lifecycle language.
 * UI distinguishes suggestion / review / request / hold / confirmed.
 * Legacy DB values map into this vocabulary without inventing bookings.
 */

export const TRAVEL_COORDINATION_LIFECYCLE = [
  "suggestion",
  "review",
  "request",
  "hold",
  "confirmed",
] as const

export type TravelCoordinationLifecycle = (typeof TRAVEL_COORDINATION_LIFECYCLE)[number]

/** Legacy + lifecycle values stored on travel_groups.coordination_status */
export type TravelCoordinationStatusStored =
  | TravelCoordinationLifecycle
  | "pending"
  | "flights_booked"
  | "hotels_booked"
  | "transport_arranged"
  | "complete"

export const COORDINATION_LIFECYCLE_LABELS: Record<TravelCoordinationLifecycle, string> = {
  suggestion: "Suggestion",
  review: "In review",
  request: "Request",
  hold: "On hold",
  confirmed: "Confirmed",
}

/** Map any stored coordination_status to the TRAVEL-104 lifecycle. */
export function toCoordinationLifecycle(
  status: string | null | undefined,
): TravelCoordinationLifecycle {
  switch (status) {
    case "suggestion":
      return "suggestion"
    case "review":
    case "pending":
      return "review"
    case "request":
    case "flights_booked":
    case "hotels_booked":
    case "transport_arranged":
      return "request"
    case "hold":
      return "hold"
    case "confirmed":
    case "complete":
      return "confirmed"
    default:
      return "suggestion"
  }
}

export function coordinationLifecycleLabel(status: string | null | undefined): string {
  return COORDINATION_LIFECYCLE_LABELS[toCoordinationLifecycle(status)]
}

export interface AutoCoordinateDraftSummary {
  key: string
  kind: "timeline_review" | "ground_transport_draft"
  label: string
  lifecycle: TravelCoordinationLifecycle
}

export function summarizeAutoCoordinateDrafts(draftKeys: string[]): AutoCoordinateDraftSummary[] {
  return draftKeys.map((key) => {
    if (key === "timeline_review") {
      return {
        key,
        kind: "timeline_review",
        label: "Planning review timeline entry",
        lifecycle: "review" as const,
      }
    }
    if (key === "ground_transport_draft") {
      return {
        key,
        kind: "ground_transport_draft",
        label: "Ground transport draft (unconfirmed — provider TBD)",
        lifecycle: "suggestion" as const,
      }
    }
    return {
      key,
      kind: "timeline_review",
      label: key,
      lifecycle: "suggestion" as const,
    }
  })
}

/** Truthful toast/message for auto-coordinate — never claims bookings arranged. */
export function formatAutoCoordinateMessage(args: {
  groupName?: string
  draftsCreated: string[]
}): string {
  const drafts = summarizeAutoCoordinateDrafts(args.draftsCreated)
  if (drafts.length === 0) {
    return args.groupName
      ? `Opened coordination review for "${args.groupName}". No draft records were created.`
      : "Opened coordination review. No draft records were created."
  }
  const list = drafts.map((d) => d.label).join("; ")
  const prefix = args.groupName
    ? `Opened coordination review for "${args.groupName}".`
    : "Opened coordination review."
  return `${prefix} Created: ${list}. Confirm flights, lodging, and transport separately.`
}

/** Segment row honesty: scheduled ≠ confirmed booking. */
export function segmentPresenceLabel(args: {
  count: number
  confirmedCount?: number
  noun: string
}): string {
  if (args.count <= 0) return `0 ${args.noun} on file`
  const confirmed = args.confirmedCount ?? 0
  if (confirmed > 0 && confirmed === args.count)
    return `${args.count} ${args.noun} confirmed`
  if (confirmed > 0)
    return `${args.count} on file (${confirmed} confirmed)`
  return `${args.count} ${args.noun} on file (unconfirmed)`
}
