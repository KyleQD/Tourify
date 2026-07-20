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
  cancelled: [],
  expired: [],
  rejected: [],
  suspended: ["open", "cancelled"],
  compliance_hold: ["accepted", "rejected", "cancelled"],
  settlement_failed: [],
}

export function canTransitionOrder(from: PartnerOrderStatus, to: PartnerOrderStatus): boolean {
  return allowed[from].includes(to)
}

export type SubscriptionStatus =
  | "draft_local"
  | "submitted_to_partner"
  | "partner_received"
  | "payment_pending"
  | "escrowed"
  | "accepted"
  | "allocated"
  | "rejected"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "cooling_off"
  | "compliance_hold"

const subscriptionAllowed: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  draft_local: ["submitted_to_partner", "cancelled"],
  submitted_to_partner: ["partner_received", "rejected", "cancelled"],
  partner_received: ["payment_pending", "escrowed", "rejected", "compliance_hold", "cooling_off"],
  payment_pending: ["escrowed", "rejected", "cancelled", "refund_pending"],
  escrowed: ["accepted", "rejected", "refund_pending", "compliance_hold"],
  accepted: ["allocated", "refund_pending"],
  allocated: [],
  rejected: ["refund_pending", "refunded"],
  cancelled: ["refund_pending", "refunded"],
  refund_pending: ["refunded"],
  refunded: [],
  cooling_off: ["cancelled", "payment_pending", "escrowed"],
  compliance_hold: ["partner_received", "rejected", "cancelled"],
}

export function canTransitionSubscription(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return subscriptionAllowed[from].includes(to)
}
