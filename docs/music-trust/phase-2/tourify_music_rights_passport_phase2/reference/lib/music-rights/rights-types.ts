export interface RationalShare {
  numerator: string
  denominator: string
  unknown: boolean
  originalText?: string
  originalScale?: string
}

export type RightsSubjectType =
  | "musical_work"
  | "sound_recording"
  | "release"
  | "income_stream"

export type RightsClaimType =
  | "ownership"
  | "administration"
  | "collection"
  | "exclusive_license"
  | "nonexclusive_license"
  | "income_participation"
  | "approval_right"

export type RightsClaimStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "disputed"
  | "superseded"
  | "terminated"

export interface RightsClaimInput {
  subjectType: RightsSubjectType
  subjectId: string
  claimantPartyId: string
  claimType: RightsClaimType
  rightsCategory: string
  share: RationalShare
  territoryCodes: string[]
  validFrom?: string
  validUntil?: string
  perpetual: boolean
  exclusive?: boolean
  agreementVersionId?: string
}
