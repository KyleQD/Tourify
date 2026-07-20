import { createHash } from "node:crypto"
import type { IssuedPassportSnapshotV1, RoyaltyEligibleInterestV1 } from "./royalty-domain"

export function buildIssuedPassportSnapshotV1(params: {
  passportPublicId: string
  passportVersion: number
  passportVersionId?: string
  issuedAt: string
  status: string
  interests: RoyaltyEligibleInterestV1[]
}): IssuedPassportSnapshotV1 {
  return {
    schemaVersion: "IssuedPassportSnapshotV1",
    passportPublicId: params.passportPublicId,
    passportVersion: params.passportVersion,
    passportVersionId: params.passportVersionId,
    issuedAt: params.issuedAt,
    status: params.status,
    interests: params.interests,
  }
}

export function hashSnapshot(snapshot: IssuedPassportSnapshotV1): string {
  const stable = JSON.stringify(snapshot, Object.keys(snapshot).sort())
  return createHash("sha256").update(stable).digest("hex")
}

export function interestsFromAcceptedClaims(claims: Array<{
  id: string
  subject_type: string
  subject_id: string
  rights_category: string
  share_numerator: string
  share_denominator: string
  share_unknown: boolean
  status: string
  claimant_party_id: string
  valid_from?: string | null
  valid_until?: string | null
  perpetual?: boolean
  territories?: string[]
}>, passportVersionId: string): RoyaltyEligibleInterestV1[] {
  return claims
    .filter((claim) => claim.status === "accepted" && !claim.share_unknown)
    .filter((claim) => ["sound_recording", "musical_work", "income_stream"].includes(claim.subject_type))
    .map((claim) => ({
      interestId: claim.id,
      passportVersionId,
      subjectType: claim.subject_type as RoyaltyEligibleInterestV1["subjectType"],
      subjectId: claim.subject_id,
      rightsCategory: claim.rights_category,
      territoryCodes: claim.territories?.length ? claim.territories : ["WORLDWIDE"],
      validFrom: claim.valid_from || "1970-01-01",
      validTo: claim.perpetual ? undefined : claim.valid_until || undefined,
      numerator: claim.share_numerator,
      denominator: claim.share_denominator,
      payeePartyId: claim.claimant_party_id,
      status: "eligible" as const,
    }))
}

export function applyFreezeToInterests(params: {
  interests: RoyaltyEligibleInterestV1[]
  disputedInterestIds?: string[]
  passportSuspended?: boolean
}): RoyaltyEligibleInterestV1[] {
  return params.interests.map((interest) => {
    if (params.passportSuspended) return { ...interest, status: "suspended" }
    if (params.disputedInterestIds?.includes(interest.interestId))
      return { ...interest, status: "disputed" }
    return interest
  })
}
