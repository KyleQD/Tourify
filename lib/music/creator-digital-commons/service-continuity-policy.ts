import type { CommonsDecision } from "./commons-domain"

export interface ContinuityInput {
  tourifyUnavailable: boolean
  independentBuildSucceeded: boolean
  independentOperatorAvailable: boolean
  currentAssetEscrowVerified: boolean
  exportRestoreSucceeded: boolean
  keyAndDomainRecoverySucceeded: boolean
  participantRecordsPreserved: boolean
  rightsSourcesUnchanged: boolean
  policyVersion: string
}

export function evaluateContinuity(input: ContinuityInput): CommonsDecision {
  const reasons: string[] = []
  if (!input.tourifyUnavailable) reasons.push("test_must_exclude_tourify")
  if (!input.independentBuildSucceeded) reasons.push("independent_build_failed")
  if (!input.independentOperatorAvailable) reasons.push("independent_operator_missing")
  if (!input.currentAssetEscrowVerified) reasons.push("asset_escrow_not_current")
  if (!input.exportRestoreSucceeded) reasons.push("export_restore_failed")
  if (!input.keyAndDomainRecoverySucceeded) reasons.push("key_or_domain_recovery_failed")
  if (!input.participantRecordsPreserved) reasons.push("participant_continuity_failed")
  if (!input.rightsSourcesUnchanged) reasons.push("rights_source_mutation_detected")
  return { allowed: reasons.length === 0, reasons, requiredEvidence: reasons, policy: { policyVersion: input.policyVersion, schemaVersion: "1", evaluatedAt: new Date().toISOString() } }
}
