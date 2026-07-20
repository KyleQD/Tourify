export type OfferingStatus =
  | "draft"
  | "preflight"
  | "partner_due_diligence"
  | "filed"
  | "live"
  | "accepting_subscriptions"
  | "closing_pending"
  | "closed"
  | "active_reporting"
  | "suspended"
  | "withdrawn"
  | "matured"
  | "terminated"

export type PartnerSource = "intermediary" | "ats" | "transfer_agent" | "custodian" | "tax_provider"

export interface PartnerReference {
  source: PartnerSource
  partnerId: string
  externalId: string
  observedAt: string
  payloadHash: string
}

export interface OfficialPositionReadModel {
  id: string
  investorUserId: string
  securityClassId: string
  quantityMinor: string
  quantityScale: number
  restrictionStatus: "restricted" | "eligible_review" | "transferable" | "frozen"
  officialSource: "transfer_agent" | "regulated_partner"
  sourceReference: PartnerReference
  reconciliationStatus: "matched" | "pending" | "break"
}

export const LIQUIDITY_DISCLAIMER =
  "No liquidity, appreciation, income, or exit is guaranteed. Secondary trading, if any, is controlled by approved partners."

export const OFFERING_TRANSITIONS: Record<OfferingStatus, OfferingStatus[]> = {
  draft: ["preflight", "withdrawn"],
  preflight: ["partner_due_diligence", "draft", "withdrawn"],
  partner_due_diligence: ["filed", "preflight", "withdrawn", "suspended"],
  filed: ["live", "withdrawn", "suspended"],
  live: ["accepting_subscriptions", "suspended", "withdrawn"],
  accepting_subscriptions: ["closing_pending", "suspended", "live"],
  closing_pending: ["closed", "suspended"],
  closed: ["active_reporting", "matured", "terminated"],
  active_reporting: ["matured", "terminated", "suspended"],
  suspended: ["live", "accepting_subscriptions", "withdrawn", "terminated"],
  withdrawn: [],
  matured: ["terminated"],
  terminated: [],
}

export function canTransitionOffering(from: OfferingStatus, to: OfferingStatus): boolean {
  return OFFERING_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertFanUtilityNotSecurities(impliesInvestment: boolean) {
  if (impliesInvestment) throw new Error("fan_utility_cannot_imply_investment")
}
