export interface MutualRecognitionInput {
  sourceCompactActive: boolean
  targetCompactActive: boolean
  purposeApproved: boolean
  sourceFresh: boolean
  localReservedPowersRespected: boolean
  claimsTreatyStatus: boolean
  claimsUniversalRepresentation: boolean
  containsSensitiveEvidence: boolean
}

export function evaluateMutualRecognition(input: MutualRecognitionInput) {
  const reasons: string[] = []
  if (!input.sourceCompactActive) reasons.push("SOURCE_COMPACT_INACTIVE")
  if (!input.targetCompactActive) reasons.push("TARGET_COMPACT_INACTIVE")
  if (!input.purposeApproved) reasons.push("PURPOSE_NOT_APPROVED")
  if (!input.sourceFresh) reasons.push("SOURCE_STALE")
  if (!input.localReservedPowersRespected) reasons.push("LOCAL_SOVEREIGNTY_VIOLATION")
  if (input.claimsTreatyStatus) reasons.push("TREATY_STATUS_FORBIDDEN")
  if (input.claimsUniversalRepresentation) reasons.push("UNIVERSAL_REPRESENTATION_FORBIDDEN")
  if (input.containsSensitiveEvidence) reasons.push("SENSITIVE_EVIDENCE_PROHIBITED")
  return { allowed: reasons.length === 0, reasons }
}
