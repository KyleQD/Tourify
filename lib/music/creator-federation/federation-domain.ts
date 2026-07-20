export interface FederationEntityRef {
  id: string
  legalName: string
  jurisdiction: string
}

export interface FederationMembership {
  id: string
  federationId: string
  memberOrganizationId: string
  status: "draft" | "submitted" | "diligence" | "active" | "suspended" | "withdrawn" | "expelled" | "rejected"
  effectiveAt?: string
  expiresAt?: string
  version: number
}

export interface FederationAuthorityContext {
  organizationId: string
  service: string
  jurisdiction: string
  occurredAt: string
}
