export interface IdentifierResolutionInput {
  identifierRef: string
  createsUniversalIdentity: boolean
  adjudicatesOwnership: boolean
  openSpecCompatible: boolean
}

export function evaluateIdentifierResolution(input: IdentifierResolutionInput) {
  const blockers: string[] = []
  if (!input.identifierRef) blockers.push("identifier_missing")
  if (input.createsUniversalIdentity) blockers.push("universal_identity_forbidden")
  if (input.adjudicatesOwnership) blockers.push("ownership_adjudication_forbidden")
  if (!input.openSpecCompatible) blockers.push("open_spec_required")
  const allowed = blockers.length === 0
  return {
    allowed,
    reason: allowed ? "resolution_ok" : "resolution_denied",
    blockers,
  }
}
