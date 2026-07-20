export interface CooperativeMember {
  id: string
  userId: string
  entityId: string
  status: "applied" | "under_review" | "active" | "suspended" | "withdrawn" | "expelled"
  membershipClass: string
  joinedAt?: string
  governingDocumentVersion: string
}

export interface DataContributionScope {
  dataCategory: string
  sourceId: string
  permittedPurposes: string[]
  prohibitedPurposes: string[]
  allowedRecipients: string[]
  startsAt: string
  endsAt?: string
  aiTrainingAllowed: boolean
  commercialResearchAllowed: boolean
}

export interface ResearchProject {
  id: string
  applicantEntityId: string
  purpose: string
  status: "application" | "review" | "approved" | "active" | "output_review" | "closed" | "terminated"
  protocolVersion: string
  dataProductIds: string[]
}
