import type { AssetRelationshipType } from "./rights-types"

export interface SpecialCaseModelInput {
  relationshipType: AssetRelationshipType
  fromSubjectType: "musical_work" | "sound_recording" | "release"
  fromSubjectId: string
  toSubjectType: "musical_work" | "sound_recording" | "release"
  toSubjectId: string
  clearanceStatus?: "unknown" | "not_required" | "pending" | "cleared" | "denied" | "disputed"
  metadata?: Record<string, unknown>
}

export interface SpecialCaseValidationIssue {
  code: "invalid_relationship" | "composition_ownership_blocked" | "missing_clearance"
  message: string
}

export function validateSpecialCaseRelationship(input: SpecialCaseModelInput): SpecialCaseValidationIssue[] {
  const issues: SpecialCaseValidationIssue[] = []

  if (input.relationshipType === "cover_of_work") {
    if (input.toSubjectType !== "musical_work")
      issues.push({
        code: "invalid_relationship",
        message: "A cover must link to an existing musical work.",
      })
  }

  if (input.relationshipType === "remix_of_recording" && input.toSubjectType !== "sound_recording")
    issues.push({
      code: "invalid_relationship",
      message: "A remix must link to a source sound recording.",
    })

  if (
    (input.relationshipType === "sample_of_recording" || input.relationshipType === "sample_of_work")
    && !["pending", "cleared", "not_required"].includes(input.clearanceStatus || "unknown")
  )
    issues.push({
      code: "missing_clearance",
      message: "Sample/interpolation workflows require an explicit clearance status.",
    })

  if (input.relationshipType === "leased_beat_source") {
    const licenseTier = input.metadata?.licenseTier
    if (!licenseTier)
      issues.push({
        code: "missing_clearance",
        message: "Leased-beat relationships require a license tier in metadata.",
      })
  }

  return issues
}

export function producerPointsDefaultClaimType(): "income_participation" {
  return "income_participation"
}

export function coverBlocksCompositionOwnershipClaim(params: {
  relationshipType: AssetRelationshipType
  claimType: string
  rightsCategory: string
}): boolean {
  return (
    params.relationshipType === "cover_of_work"
    && params.claimType === "ownership"
    && params.rightsCategory.toLowerCase() === "composition"
  )
}
