export interface SuccessorCustodyInput {
  successorRecognized: boolean
  custodyAuthorityVerified: boolean
  independentArchive: boolean
  localExitPreserved: boolean
  claimsPerpetuity: boolean
}

export function evaluateSuccessorCustody(input: SuccessorCustodyInput) {
  const blockers: string[] = []
  if (!input.successorRecognized) blockers.push("successor_not_recognized")
  if (!input.custodyAuthorityVerified) blockers.push("custody_authority")
  if (!input.independentArchive) blockers.push("independent_archive")
  if (!input.localExitPreserved) blockers.push("local_exit_not_preserved")
  if (input.claimsPerpetuity) blockers.push("claims_perpetuity")
  const allowed = blockers.length === 0
  return {
    allowed,
    reason: allowed ? "custody_ok" : "custody_denied",
    blockers,
  }
}
