export type RoyaltyImportStatus =
  | "received"
  | "quarantined"
  | "processing"
  | "review_required"
  | "accepted"
  | "rejected"
  | "posted"

export type MatchStatus =
  | "exact"
  | "candidate"
  | "ambiguous"
  | "unmatched"
  | "conflict"
  | "manual"

export interface NormalizedRoyaltyLineDraft {
  sourceBatchId: string
  sourceRowNumber: number
  sourceRowHash: string
  provider: string
  usageStart: string
  usageEnd: string
  territory?: string
  currency: string
  grossRoyaltyMinor: bigint
  deductionsMinor: bigint
  netRoyaltyMinor: bigint
  isrc?: string
  iswc?: string
  upc?: string
  providerAssetId?: string
  usageType?: string
  units?: string
  rawPayload: Record<string, unknown>
}

export interface IssuedPassportSnapshotV1 {
  schemaVersion: "IssuedPassportSnapshotV1"
  passportPublicId: string
  passportVersion: number
  passportVersionId?: string
  issuedAt: string
  status: string
  interests: RoyaltyEligibleInterestV1[]
}

export interface RoyaltyEligibleInterestV1 {
  interestId: string
  passportVersionId: string
  subjectType: "sound_recording" | "musical_work" | "income_stream"
  subjectId: string
  rightsCategory: string
  territoryCodes: string[]
  validFrom: string
  validTo?: string
  numerator: string
  denominator: string
  payeePartyId: string
  status: "eligible" | "held" | "disputed" | "suspended"
}

export interface RightsDisputeStatusV1 {
  schemaVersion: "RightsDisputeStatusV1"
  subjectType: string
  subjectId: string
  freeze: boolean
  reason?: string
}
