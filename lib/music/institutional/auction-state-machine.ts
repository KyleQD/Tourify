export type AuctionStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "selection_pending"
  | "selected"
  | "canceled"

const transitions: Record<AuctionStatus, AuctionStatus[]> = {
  draft: ["scheduled", "canceled"],
  scheduled: ["open", "canceled"],
  open: ["closed", "canceled"],
  closed: ["selection_pending", "canceled"],
  selection_pending: ["selected", "canceled"],
  selected: [],
  canceled: [],
}

export function canTransitionAuction(from: AuctionStatus, to: AuctionStatus): boolean {
  return transitions[from].includes(to)
}
