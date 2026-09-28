export interface Phase21ActivationInput {
  approvedCharter: boolean;
  independentTrustCount: number;
  independentImplementationCount: number;
  mutualAidDrillPassed: boolean;
  restrictionConflictTestPassed: boolean;
  providerReplacementPassed: boolean;
  tourifyUnavailablePassed: boolean;
  unresolvedCriticalBlockers: number;
  orbitalDeploymentRequested: boolean;
}

export function evaluatePhase21Activation(input: Phase21ActivationInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.approvedCharter) reasons.push("charter_not_approved");
  if (input.independentTrustCount < 3) reasons.push("insufficient_independent_trusts");
  if (input.independentImplementationCount < 2) reasons.push("insufficient_independent_implementations");
  if (!input.mutualAidDrillPassed) reasons.push("mutual_aid_drill_failed");
  if (!input.restrictionConflictTestPassed) reasons.push("restriction_conflict_test_failed");
  if (!input.providerReplacementPassed) reasons.push("provider_replacement_failed");
  if (!input.tourifyUnavailablePassed) reasons.push("tourify_unavailable_test_failed");
  if (input.unresolvedCriticalBlockers > 0) reasons.push("critical_blockers_present");
  if (input.orbitalDeploymentRequested) reasons.push("orbital_deployment_not_in_phase21_scope");
  return { allowed: reasons.length === 0, reasons };
}
