export interface CommonsSourceReference {
  sourceType: string
  sourceId: string
  sourceVersion: string
  jurisdiction?: string
  effectiveFrom?: string
  effectiveTo?: string
  disputed: boolean
  revoked: boolean
}

export interface CommonsPolicyContext {
  policyVersion: string
  schemaVersion: string
  evaluatedAt: string
}

export interface CommonsDecision<TReason extends string = string> {
  allowed: boolean
  reasons: TReason[]
  requiredEvidence: string[]
  policy: CommonsPolicyContext
}

export interface CommonsAsset {
  id: string
  kind: "domain" | "trademark" | "repository" | "package_namespace" | "schema_uri" | "signing_key" | "cloud_account" | "documentation" | "other"
  legalOwnerId?: string
  stewardId?: string
  custodianId?: string
  operatorId?: string
  transferStatus: "unreviewed" | "restricted" | "transferable" | "escrowed" | "transferred"
  evidenceManifestId?: string
}
