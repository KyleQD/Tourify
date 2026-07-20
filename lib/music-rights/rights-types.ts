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
  | "recoupment"
  | "security_interest"
  | "unknown_pending"

export type RightsClaimStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "disputed"
  | "superseded"
  | "terminated"

export type RightsCategory =
  | "composition"
  | "master"
  | "mechanical"
  | "public_performance"
  | "synchronization"
  | "reproduction"
  | "distribution"
  | "digital_performance"
  | "neighboring_rights"
  | "administration"
  | "collection"
  | "approval"
  | "direct_sales"
  | "license_participation"
  | "other"

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

export interface ExistingRightsClaim {
  id: string
  subjectType: RightsSubjectType
  subjectId: string
  claimType: RightsClaimType
  rightsCategory: string
  share: RationalShare
  territoryCodes: string[]
  validFrom?: string | null
  validUntil?: string | null
  perpetual: boolean
  status: RightsClaimStatus
}

export type AssetRelationshipType =
  | "cover_of_work"
  | "remix_of_recording"
  | "sample_of_recording"
  | "sample_of_work"
  | "adaptation_of_work"
  | "leased_beat_source"
  | "interpolation_of_work"
  | "other"
