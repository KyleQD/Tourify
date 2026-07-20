export type PartnerOrderStatus =
  | "draft_local"
  | "submitted_to_partner"
  | "partner_received"
  | "accepted"
  | "open"
  | "partially_filled"
  | "filled"
  | "cancel_pending"
  | "cancelled"
  | "expired"
  | "rejected"
  | "suspended"
  | "compliance_hold"
  | "settlement_failed"

const allowed: Record<PartnerOrderStatus, PartnerOrderStatus[]> = {
  draft_local: ["submitted_to_partner", "cancelled"],
  submitted_to_partner: ["partner_received", "rejected", "cancelled"],
  partner_received: ["accepted", "rejected", "compliance_hold"],
  accepted: ["open", "rejected", "compliance_hold"],
  open: ["partially_filled", "filled", "cancel_pending", "expired", "suspended"],
  partially_filled: ["filled", "cancel_pending", "expired", "suspended"],
  cancel_pending: ["cancelled", "partially_filled", "filled"],
  filled: ["settlement_failed"],
  cancelled: [], expired: [], rejected: [], suspended: ["open", "cancelled"],
  compliance_hold: ["accepted", "rejected", "cancelled"], settlement_failed: []
}

export function canTransitionOrder(from: PartnerOrderStatus, to: PartnerOrderStatus): boolean {
  return allowed[from].includes(to)
}
