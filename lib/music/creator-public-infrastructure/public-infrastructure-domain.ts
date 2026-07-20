export interface PublicInfrastructureSourceRef {
  sourceType: string
  sourceId: string
  sourceVersion: string
  jurisdiction?: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface PublicInfrastructureDecision {
  allowed: boolean
  reason: string
  sourceRefs: PublicInfrastructureSourceRef[]
  requiresHumanReview: boolean
}

export interface PublicInfrastructureContext {
  participantId?: string
  organizationId?: string
  purpose: string
  jurisdiction?: string
  nowIso: string
}
