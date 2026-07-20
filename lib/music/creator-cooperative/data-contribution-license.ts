export interface ContributionRequest {
  purpose: string
  dataCategory: string
  sourceId: string
  recipientId: string
  requestedAt: string
  aiTraining: boolean
  commercialUse: boolean
}

export interface ContributionLicence {
  status: "active" | "suspended" | "revoked" | "expired"
  permittedPurposes: string[]
  dataCategories: string[]
  sourceIds: string[]
  recipientIds: string[]
  aiTrainingAllowed: boolean
  commercialResearchAllowed: boolean
  startsAt: string
  endsAt?: string
}

export function permitsContributionUse(input: { request: ContributionRequest; licence: ContributionLicence; now: string }): boolean {
  const { request, licence, now } = input
  if (licence.status !== "active") return false
  if (now < licence.startsAt || (licence.endsAt && now >= licence.endsAt)) return false
  if (!licence.permittedPurposes.includes(request.purpose)) return false
  if (!licence.dataCategories.includes(request.dataCategory)) return false
  if (!licence.sourceIds.includes(request.sourceId)) return false
  if (!licence.recipientIds.includes(request.recipientId)) return false
  if (request.aiTraining && !licence.aiTrainingAllowed) return false
  if (request.commercialUse && !licence.commercialResearchAllowed) return false
  return true
}
