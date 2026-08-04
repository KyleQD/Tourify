export interface SensitiveArchiveEthicsInput {
  purposeApproved: boolean
  ethicsReviewApproved: boolean
  sensitiveRevealRequested: boolean
  privacyOverrideRequested: boolean
  creatorRightsAffected: boolean
  publicDumpRequested: boolean
}

export function evaluateSensitiveArchiveEthics(input: SensitiveArchiveEthicsInput) {
  const blockers: string[] = []
  if (!input.purposeApproved) blockers.push("purpose_not_approved")
  if (!input.ethicsReviewApproved) blockers.push("ethics_review")
  if (input.privacyOverrideRequested) blockers.push("privacy_override_forbidden")
  if (input.publicDumpRequested) blockers.push("public_dump_forbidden")
  if (input.sensitiveRevealRequested && input.creatorRightsAffected)
    blockers.push("sensitive_reveal_creator_rights")
  const allowed = blockers.length === 0
  return {
    allowed,
    reason: allowed ? "ethics_ok" : "ethics_denied",
    blockers,
  }
}
