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
