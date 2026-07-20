export type InstitutionalTransactionPath =
  | "direct_asset_sale"
  | "license"
  | "entity_interest"
  | "private_security"
  | "fund_interest"
  | "structured_finance"
  | "readiness_only"
  | "blocked"

export interface InstitutionalOrganizationRef {
  id: string
  legalName: string
  jurisdiction?: string
  organizationType: string
}

export interface TransactionClassification {
  id: string
  opportunityId: string
  path: InstitutionalTransactionPath
  status: "draft" | "review_required" | "approved" | "expired" | "revoked"
  approvedByProviderId?: string
  effectiveAt?: string
  expiresAt?: string
  restrictions: string[]
}

export interface InstitutionalSnapshotRef {
  id: string
  catalogScopeHash: string
  rightsSnapshotIds: string[]
  royaltySnapshotIds: string[]
  valuationSnapshotIds: string[]
  createdAt: string
}
