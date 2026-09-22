export type LegacyCycleState =
  | "draft"
  | "proposed"
  | "under_review"
  | "approved"
  | "effective"
  | "suspended"
  | "terminated"
  | "rejected"
  | "archived"

export interface LegacyLegalClaims {
  perpetualAuthority: boolean
  futurePersonRepresentation: boolean
  privacyOverride: boolean
  universalIdentity: boolean
  ownershipAdjudication: boolean
  localExitBlocked: boolean
  centuryScaleLaunch: boolean
  phase20Features: boolean
}

export const DENIED_LEGACY_LEGAL_CLAIMS: LegacyLegalClaims = {
  perpetualAuthority: false,
  futurePersonRepresentation: false,
  privacyOverride: false,
  universalIdentity: false,
  ownershipAdjudication: false,
  localExitBlocked: false,
  centuryScaleLaunch: false,
  phase20Features: false,
}
