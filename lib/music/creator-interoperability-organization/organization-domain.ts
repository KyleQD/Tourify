export type OrganizationLegalCharacter =
  | "domestic_nonprofit"
  | "international_ngo"
  | "treaty_support_secretariat"
  | "intergovernmental_organization"
  | "un_related_entity"

export interface OrganizationSourceRef {
  sourceType: string
  sourceId: string
  sourceVersion: string
  issuer: string
  jurisdiction: string
  effectiveAt: string
  expiresAt?: string
  disputed: boolean
  suspended: boolean
  revoked: boolean
}

export interface OrganizationDecisionContext {
  actorId: string
  actorOrganizationId: string
  jurisdiction: string
  policyVersion: string
  schemaVersion: string
  sourceManifestId: string
  idempotencyKey: string
}
