export interface OfferingOrderGateInput {
  acceptsOrders: boolean
  counselApproved: boolean
  partnerApproved: boolean
  status: string
}

export function canAcceptOfferingOrder(input: OfferingOrderGateInput): {
  allowed: boolean
  rejectionReason?: string
} {
  if (!input.counselApproved)
    return { allowed: false, rejectionReason: "counsel_approval_required" }
  if (!input.partnerApproved)
    return { allowed: false, rejectionReason: "partner_approval_required" }
  if (!input.acceptsOrders)
    return { allowed: false, rejectionReason: "orders_disabled" }
  if (input.status !== "live")
    return { allowed: false, rejectionReason: "offering_not_live" }
  return { allowed: true }
}

export function assertNonInvestmentCollectible(impliesInvestment: boolean) {
  if (impliesInvestment) throw new Error("fan_utility_cannot_imply_investment")
}
